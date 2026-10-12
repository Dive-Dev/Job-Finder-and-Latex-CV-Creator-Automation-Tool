import os
import re
import time
import json
import threading
from datetime import datetime

from ai.local_llm import query_llm, detect_local_models, get_llm_config
from sheets.local_db import (
    save_job, get_job_by_id, get_user_profile, 
    save_contact, update_job_details, get_all_jobs
)
from scraper.company_scraper import scrape_company_live_openings, find_company_career_site
from scraper.linkedin_scraper import scrape_linkedin_jobs
from scraper.google_scraper import search_jobs_google
from scraper.recruiter_finder import search_company_contacts
from ai.cv_tailor import calculate_ats_match, tailor_bullet_points
from ai.referral_generator import generate_personalized_referral_outreach
from latex.cv_generator import generate_latex_cv, OUTPUT_DIR

class AutonomousJobAgent:
    """
    Autonomous Job Hunter & Application Agent.
    Operates end-to-end:
    1. Scrapes live openings for specified target roles & companies.
    2. Uses Local Model (Ollama/LM Studio) to evaluate JDs & ATS match scores.
    3. Auto-tailors STAR-formula LaTeX CVs for high-match opportunities.
    4. Auto-discovers HR recruiters / managers and drafts personalized connection pitches.
    5. Organizes everything into the user's spreadsheet pipeline tracker.
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.state = "idle"  # idle, running, completed, stopped, error
        self.progress = 0
        self.current_step = "Agent Ready"
        self.mission_config = {}
        self.logs = []
        self.stop_requested = False
        self.active_thread = None
        self.results = {
            "total_scraped": 0,
            "evaluated": 0,
            "high_matches": 0,
            "tailored_jobs": [],
            "hr_contacts": [],
            "summary_report": "",
            "started_at": "",
            "finished_at": ""
        }

    def log(self, message, level="info", step=None, data=None):
        timestamp = datetime.now().strftime("%H:%M:%S")
        entry = {
            "timestamp": timestamp,
            "message": message,
            "level": level,
            "step": step or self.current_step,
            "data": data or {}
        }
        with self.lock:
            self.logs.append(entry)
            # Keep last 250 log entries
            if len(self.logs) > 250:
                self.logs.pop(0)
        print(f"[{timestamp}] [AGENT] [{level.upper()}] {message}")

    def get_status(self):
        with self.lock:
            # Determine 1-6 phase number
            step_str = str(self.current_step or "")
            phase_num = 1
            if step_str.startswith("1/6"):
                phase_num = 1
            elif step_str.startswith("2/6"):
                phase_num = 2
            elif step_str.startswith("3/6"):
                phase_num = 3
            elif step_str.startswith("4/6"):
                phase_num = 4
            elif step_str.startswith("5/6"):
                phase_num = 5
            elif step_str.startswith("6/6"):
                phase_num = 6
            elif self.state in ["completed", "done"]:
                phase_num = 6

            deliverables = list(self.results.get("deliverables", []) or self.results.get("tailored_jobs", []))
            hr_leads = list(self.results.get("hr_contacts", []))

            return {
                "state": self.state,
                "progress": self.progress,
                "progress_pct": int(self.progress),
                "phase_num": phase_num,
                "current_phase": f"Phase {phase_num}/6",
                "current_step": self.current_step,
                "current_step_text": self.current_step,
                "stop_requested": self.stop_requested,
                "results": dict(self.results),
                "deliverables": deliverables,
                "hr_leads": hr_leads,
                "stats": {
                    "vacancies_crawled": self.results.get("total_scraped", 0),
                    "evaluated_count": self.results.get("evaluated", 0),
                    "high_match_count": self.results.get("high_matches", 0),
                    "tailored_count": len(deliverables)
                },
                "logs": list(self.logs[-80:]),
                "mission_config": dict(self.mission_config)
            }

    def stop(self):
        with self.lock:
            if self.state == "running":
                self.stop_requested = True
                self.current_step = "Stopping mission..."
                self.log("🛑 Stop command received. Terminating current mission...", level="warning")

    def start_mission(self, config):
        with self.lock:
            if self.state == "running":
                return {"success": False, "error": "An agent mission is already running!"}

            self.state = "running"
            self.progress = 0
            self.stop_requested = False
            self.logs = []
            self.mission_config = config
            self.results = {
                "total_scraped": 0,
                "evaluated": 0,
                "high_matches": 0,
                "tailored_jobs": [],
                "hr_contacts": [],
                "summary_report": "",
                "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "finished_at": ""
            }

        self.active_thread = threading.Thread(target=self._run_mission_thread, daemon=True)
        self.active_thread.start()
        return {"success": True, "message": "Autonomous Agent mission launched in background."}

    def _run_mission_thread(self):
        try:
            self._execute_mission()
        except Exception as e:
            with self.lock:
                self.state = "error"
                self.current_step = f"Error: {str(e)}"
            self.log(f"💥 Mission failed unexpectedly: {e}", level="error")
        finally:
            with self.lock:
                if self.state == "running":
                    self.state = "completed"
                    self.progress = 100
                    self.current_step = "Mission Complete"
                self.results["finished_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def _execute_mission(self):
        cfg = self.mission_config
        target_roles = cfg.get("target_roles") or cfg.get("roles") or "Software Engineer, Full Stack Developer"
        target_companies = cfg.get("target_companies") or cfg.get("companies") or "Sandisk, Amazon, Swiggy, Zepto, Google"
        location = cfg.get("target_location") or cfg.get("location") or "Bengaluru, Karnataka, India"
        min_threshold = float(cfg.get("min_match_threshold") or cfg.get("threshold") or 75.0)
        max_jobs = int(cfg.get("max_jobs", 12))
        auto_tailor = bool(cfg.get("auto_tailor_cv", True))
        auto_hr = bool(cfg.get("auto_discover_hr", cfg.get("auto_find_hr", True)))
        auto_pipeline = bool(cfg.get("auto_apply_pipeline", True))

        # --- PHASE 1: INITIALIZATION & LOCAL MODEL CHECK ---
        self.current_step = "1/6: Verifying Local Model & Candidate Profile"
        self.progress = 5
        self.log("🚀 Initializing Autonomous Agent Mission...", level="info")

        llm_cfg = get_llm_config()
        local_detection = detect_local_models()
        active_provider = llm_cfg.get("provider", "ollama")
        active_model = llm_cfg.get("model", "llama3.2")

        if local_detection.get("ollama", {}).get("connected"):
            models_avail = ", ".join(local_detection["ollama"]["models"][:3])
            self.log(f"🟢 Connected to Local Ollama ({local_detection['ollama']['url']}) - Available models: {models_avail}", level="success")
        elif local_detection.get("local_openai", {}).get("connected"):
            self.log(f"🟢 Connected to Local OpenAI/LM Studio endpoint ({local_detection['local_openai']['url']})", level="success")
        elif local_detection.get("gemini", {}).get("connected"):
            self.log(f"🟢 Connected to Cloud AI (Gemini 1.5 Flash)", level="info")
        else:
            self.log(f"🟡 Local model server offline at {llm_cfg.get('ollama_url')}. Agent will utilize built-in high-fidelity ATS reasoning & offline STAR generator.", level="warning")

        profile = get_user_profile() or {}
        candidate_name = profile.get("name", "Applicant")
        self.log(f"👤 Loaded candidate profile for: {candidate_name} ({profile.get('title', 'Engineer')})", level="info")

        if self.stop_requested:
            self._handle_stop()
            return

        # --- PHASE 2: MULTI-SOURCE SCRAPING ---
        self.current_step = "2/6: Crawling Verified Career Portals & Vacancies"
        self.progress = 20
        self.log(f"🔎 Crawling openings for companies: [{target_companies}] | Roles: [{target_roles}] in {location}...", level="info")

        collected_jobs = []
        seen_urls = set()

        # A. Company Career Sites Scraper
        if target_companies:
            try:
                comp_result = scrape_company_live_openings(
                    companies_input=target_companies,
                    role_keywords=target_roles,
                    location=location,
                    max_per_company=6
                )
                for j in comp_result.get("jobs", []):
                    u = j.get("job_url")
                    if u and u not in seen_urls:
                        seen_urls.add(u)
                        collected_jobs.append(j)
                self.log(f"🏢 Scraped {len(collected_jobs)} live postings directly from target company ecosystems", level="info")
            except Exception as e:
                self.log(f"Notice: Company scraper error: {e}", level="warning")

        if self.stop_requested:
            self._handle_stop()
            return

        # B. Complement with LinkedIn guest API or Google ATS dork if needed
        if len(collected_jobs) < max_jobs and target_roles:
            self.log("🌐 Sourcing additional high-signal openings from tech ecosystem...", level="info")
            try:
                li_jobs = scrape_linkedin_jobs(
                    search_url_or_keywords=target_roles,
                    location=location,
                    max_results=max_jobs - len(collected_jobs),
                    find_company_sites=True
                )
                for j in li_jobs:
                    u = j.get("job_url")
                    if u and u not in seen_urls:
                        seen_urls.add(u)
                        collected_jobs.append(j)
            except Exception as e:
                self.log(f"Notice: Secondary scrape notice: {e}", level="warning")

        # Trim to max_jobs
        collected_jobs = collected_jobs[:max_jobs]
        self.results["total_scraped"] = len(collected_jobs)
        self.log(f"✅ Discovered {len(collected_jobs)} unique vacancies for in-depth agent processing", level="success")

        if not collected_jobs:
            self.log("⚠️ No openings found matching the criteria. Try broadening role keywords or location.", level="warning")
            self.current_step = "No openings found"
            return

        if self.stop_requested:
            self._handle_stop()
            return

        # --- PHASE 3: DEEP EVALUATION WITH LOCAL MODEL ---
        self.current_step = "3/6: Evaluating & Ranking with Local Model"
        self.progress = 40
        self.log(f"🧠 Local Model ({active_model}) analyzing {len(collected_jobs)} JDs against candidate profile...", level="info")

        evaluated_jobs = []
        for idx, job in enumerate(collected_jobs):
            if self.stop_requested:
                self._handle_stop()
                return

            j_title = job.get("title", "Role")
            j_comp = job.get("company", "Company")
            
            # Step progress calculation
            self.progress = int(40 + (idx / len(collected_jobs)) * 20)

            # 1. ATS compatibility score
            match_data = calculate_ats_match(profile, job)
            score = match_data.get("score", 70)
            job["match_score"] = score
            job["matched_skills"] = match_data.get("matched_skills", [])
            job["missing_skills"] = match_data.get("missing_skills", [])

            # 2. Local Model Deep Suitability Reasoner
            prompt = f"""
            Candidate Profile:
            Name: {candidate_name}
            Title: {profile.get('title', '')}
            Core Skills: {json.dumps(profile.get('skills', {}))}
            Experience Summary: {profile.get('summary', '')}

            Target Job Posting:
            Title: {j_title}
            Company: {j_comp}
            Location: {job.get('location', '')}
            Description Snippet: {job.get('description', '')[:600]}

            Evaluate in 2 sentences why this candidate is a strong fit and what unique advantage they bring.
            Output only the 2-sentence rationale.
            """
            
            try:
                llm_eval = query_llm(prompt, timeout=12)
                if llm_eval.get("success") and llm_eval.get("text"):
                    job["agent_fit_rationale"] = llm_eval["text"]
                else:
                    job["agent_fit_rationale"] = f"Strong alignment in {', '.join(job['matched_skills'][:3])} with {j_comp}'s technology focus."
            except Exception:
                job["agent_fit_rationale"] = f"Aligned with core technical background in {j_title}."

            # Save to SQLite database
            save_job(job)
            evaluated_jobs.append(job)
            self.results["evaluated"] += 1

            self.log(f"• [{score}% Match] {j_title} @ {j_comp} (Matched: {len(job['matched_skills'])} skills)", level="info")

        # Rank descending
        evaluated_jobs.sort(key=lambda x: x.get("match_score", 0), reverse=True)

        # Filter by threshold
        high_matches = [j for j in evaluated_jobs if j.get("match_score", 0) >= min_threshold]
        # If no jobs met strict threshold, take top 3
        if not high_matches and evaluated_jobs:
            high_matches = evaluated_jobs[:3]
            self.log(f"Notice: No jobs met strict {min_threshold}% threshold. Proceeding with top {len(high_matches)} highest-scoring jobs.", level="warning")

        self.results["high_matches"] = len(high_matches)
        self.log(f"🎯 Selected {len(high_matches)} top-tier opportunities (>= {min_threshold}% match) for auto-tailoring", level="success")

        if self.stop_requested:
            self._handle_stop()
            return

        # --- PHASE 4: AUTONOMOUS RESUME TAILORING ---
        self.current_step = "4/6: Auto-Tailoring LaTeX Resumes with Local Model"
        self.progress = 65

        tailored_artifacts = []
        if auto_tailor and high_matches:
            self.log(f"📄 Auto-tailoring tailored LaTeX CVs using Local LLM STAR formula...", level="info")
            for idx, job in enumerate(high_matches[:5]):  # Tailor top 5
                if self.stop_requested:
                    self._handle_stop()
                    return

                j_id = job.get("id")
                j_title = job.get("title", "Role")
                j_comp = job.get("company", "Company")
                
                safe_comp = re.sub(r'[^a-zA-Z0-9]', '', j_comp)
                safe_role = re.sub(r'[^a-zA-Z0-9]', '', j_title.split()[0])
                tex_filename = f"Resume_{safe_comp}_{safe_role}.tex"

                self.log(f"✍️ Tailoring bullet points for: {j_title} @ {j_comp}...", level="info")
                try:
                    # 1. Rewrite bullet points with Local Model
                    tailored_exp = tailor_bullet_points(profile, job)
                    
                    # 2. Compile to ATS LaTeX
                    tailored_profile = dict(profile)
                    tailored_profile["experience"] = tailored_exp
                    
                    cv_res = generate_latex_cv(tailored_profile, job_data=job, output_filename=tex_filename)
                    pdf_compiled = cv_res.get("pdf_compiled", False)
                    pdf_filename = tex_filename.replace('.tex', '.pdf') if pdf_compiled else None

                    job["tailored_tex"] = tex_filename
                    job["pdf_filename"] = pdf_filename
                    job["tex_filename"] = tex_filename
                    job["apply_url"] = job.get("job_url") or job.get("apply_url") or job.get("career_page_url", "")
                    job["career_portal"] = job.get("career_page_url", "")

                    artifact_entry = {
                        "job_id": j_id,
                        "id": j_id,
                        "company": j_comp,
                        "title": j_title,
                        "location": job.get("location", "Bengaluru, Karnataka, India"),
                        "match_score": job.get("match_score", 0),
                        "tex_filename": tex_filename,
                        "tailored_tex": tex_filename,
                        "pdf_filename": pdf_filename,
                        "job_url": job.get("job_url", ""),
                        "apply_url": job.get("job_url", ""),
                        "career_portal": job.get("career_page_url", ""),
                        "missing_keywords": job.get("missing_skills", [])
                    }
                    tailored_artifacts.append(artifact_entry)
                    self.results["tailored_jobs"].append(artifact_entry)

                    # Update job notes with tailored CV path
                    update_job_details(j_id, {"notes": f"Auto-tailored CV generated: {tex_filename}"})

                    status_msg = f"✓ Generated {tex_filename}" + (" & compiled PDF locally!" if pdf_compiled else " (Ready for Overleaf)")
                    self.log(status_msg, level="success")
                except Exception as e:
                    self.log(f"Error tailoring CV for {j_comp}: {e}", level="warning")

        # Make all high matches available as deliverables
        for j in high_matches:
            if not j.get("apply_url"):
                j["apply_url"] = j.get("job_url") or j.get("career_page_url", "")
            if not j.get("missing_keywords"):
                j["missing_keywords"] = j.get("missing_skills", [])
        self.results["deliverables"] = high_matches

        if self.stop_requested:
            self._handle_stop()
            return

        # --- PHASE 5: AUTONOMOUS HR DISCOVERY & OUTREACH ---
        self.current_step = "5/6: Finding HR Contacts & Drafting Referral Outreach"
        self.progress = 85

        discovered_contacts = []
        if auto_hr and high_matches:
            self.log("👥 Discovering HR recruiters & drafting personalized outreach...", level="info")
            companies_checked = set()

            for job in high_matches[:4]:
                if self.stop_requested:
                    self._handle_stop()
                    return

                comp = job.get("company", "").strip()
                if not comp or comp.lower() in companies_checked:
                    continue
                companies_checked.add(comp.lower())

                self.log(f"🔎 Scouting HR and Talent Acquisition at {comp}...", level="info")
                try:
                    contacts_res = search_company_contacts(comp, location=location, contact_type="Recruiter", max_results=2)
                    for c in contacts_res:
                        c_id = c.get("id")
                        c_name = c.get("name")
                        c_role = c.get("role_category")
                        
                        # Generate tailored connection pitch
                        outreach = generate_personalized_referral_outreach(
                            contact_name=c_name,
                            contact_role=c.get("headline", c_role),
                            company_name=comp,
                            target_role=job.get("title", "Software Engineer"),
                            candidate_profile=profile,
                            outreach_type="recruiter",
                            job_id_or_link=job.get("job_url", "")
                        )
                        c["connection_note"] = outreach.get("connection_note", "")
                        c["email_pitch"] = outreach.get("full_message", "")
                        c["email_subject"] = outreach.get("email_subject", "")

                        # Save contact to database
                        save_contact(c)
                        discovered_contacts.append(c)
                        self.results["hr_contacts"].append(c)

                        self.log(f"✓ Found HR: {c_name} @ {comp} -> Drafted LinkedIn pitch (<300 chars)", level="success")
                except Exception as e:
                    self.log(f"Notice: HR scout for {comp}: {e}", level="warning")

        if self.stop_requested:
            self._handle_stop()
            return

        # --- PHASE 6: SUMMARY REPORT & PIPELINE FINALIZATION ---
        self.current_step = "6/6: Compiling Mission Report"
        self.progress = 98

        report_lines = [
            f"# 🤖 JobPulse Autonomous Agent - Mission Summary Report",
            f"**Completed At:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Target Roles:** {target_roles}",
            f"**Target Location:** {location}",
            f"**AI Engine:** {active_provider.upper()} ({active_model})",
            "",
            "## 📊 Mission Metrics",
            f"- **Opportunities Scraped & Analyzed:** {len(collected_jobs)}",
            f"- **High-Match Opportunities (>= {min_threshold}%):** {len(high_matches)}",
            f"- **ATS Resumes Auto-Tailored:** {len(tailored_artifacts)}",
            f"- **HR Contacts Discovered & Drafted:** {len(discovered_contacts)}",
            "",
            "## 🏆 Top Recommended Applications"
        ]

        for idx, job in enumerate(high_matches[:5], 1):
            report_lines.append(f"### {idx}. {job.get('title')} @ **{job.get('company')}**")
            report_lines.append(f"- **ATS Match Score:** `{job.get('match_score')}%`")
            report_lines.append(f"- **Location:** {job.get('location')}")
            report_lines.append(f"- **Direct Apply Link:** [{job.get('job_url')}]({job.get('job_url')})")
            report_lines.append(f"- **AI Fit Assessment:** {job.get('agent_fit_rationale', 'Strong alignment with core competencies.')}")
            report_lines.append("")

        if tailored_artifacts:
            report_lines.append("## 📄 Auto-Tailored LaTeX Resumes Created")
            for t in tailored_artifacts:
                report_lines.append(f"- **{t['company']} - {t['title']}:** `{t['tex_filename']}`" + (f" (PDF: `{t['pdf_filename']}`)" if t.get('pdf_filename') else ""))
            report_lines.append("")

        if discovered_contacts:
            report_lines.append("## 👥 Discovered HR & Outreach Leads")
            for c in discovered_contacts:
                report_lines.append(f"- **{c.get('name')}** ({c.get('company')} - {c.get('role_category')}): Email `{c.get('predicted_email')}`")
            report_lines.append("")

        self.results["summary_report"] = "\n".join(report_lines)
        self.progress = 100
        self.current_step = "Mission Accomplished!"
        self.state = "completed"
        self.log(f"🎉 Autonomous Mission finished! {len(high_matches)} jobs ready for 1-click application in your Pipeline.", level="success")

    def _handle_stop(self):
        with self.lock:
            self.state = "stopped"
            self.current_step = "Mission stopped by user"
            self.log("🛑 Mission halted successfully.", level="warning")

# Global singleton agent instance
_global_agent = None

def get_global_agent():
    global _global_agent
    if _global_agent is None:
        _global_agent = AutonomousJobAgent()
    return _global_agent
