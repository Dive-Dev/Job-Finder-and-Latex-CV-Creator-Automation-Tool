import json
import re
from ai.local_llm import query_llm

from sheets.local_db import get_company_research

def generate_tailored_cover_letter_content(profile, job_data, recipient_info=None):
    """
    Generates customized, high-conversion cover letter paragraphs
    tailored to the specific company, role, and job description using
    the configured Local Model (Ollama / LM Studio) with heuristic fallback.
    Automatically integrates researched company products, clients, and talking points.
    """
    candidate_name = profile.get("name", "Applicant")
    candidate_title = profile.get("title", "Software Engineer")
    skills = profile.get("skills", {})
    if isinstance(skills, dict):
        skills_list = [item for sublist in skills.values() for item in (sublist if isinstance(sublist, list) else [sublist])]
    elif isinstance(skills, list):
        skills_list = skills
    else:
        skills_list = ["Python", "JavaScript", "System Architecture"]
    
    top_skills_str = ", ".join(skills_list[:6])

    job_title = job_data.get("title", "Software Engineer")
    company = job_data.get("company", "Your Company")
    location = job_data.get("location", "Bengaluru, India")
    description = job_data.get("description", "")[:1200]

    # Check if we have deep human-crawled company intelligence
    company_dossier = get_company_research(company) or {}
    products_intel = ", ".join([p.get("name", "") for p in company_dossier.get("products", [])[:3] if p.get("name")])
    clients_intel = ", ".join([c.get("name", "") for c in company_dossier.get("clients_and_customers", [])[:3] if c.get("name")])
    intel_hook = (company_dossier.get("interview_cheat_sheet") or {}).get("cover_letter_alignment_snippet", "")

    recipient_name = (recipient_info or {}).get("name") or "Hiring Team"
    
    system_prompt = (
        "You are an executive career strategist and technical recruiter. "
        "Write a compelling, professional, non-cliché cover letter that highlights concrete technical "
        "competence and authentic enthusiasm for the company's engineering challenges."
    )

    intel_context = ""
    if products_intel:
        intel_context += f"\nCompany Products: {products_intel}"
    if clients_intel:
        intel_context += f"\nNotable Clients/Partners: {clients_intel}"
    if intel_hook:
        intel_context += f"\nCompany Alignment Angle: {intel_hook}"

    user_prompt = f"""
    Please generate 4 distinct paragraphs for a tailored cover letter:
    1. OPENING: Hook showing genuine interest in {company} and the {job_title} role (reference their actual products if available).
    2. CORE_EXPERIENCE: Highlights of technical accomplishments matching the job description using {top_skills_str}.
    3. VALUES_AND_IMPACT: How the candidate solves engineering problems, collaborates, and aligns with {company}'s scale.
    4. CLOSING: Professional call-to-action requesting an interview.

    Candidate Profile:
    Name: {candidate_name}
    Current Title: {candidate_title}
    Key Skills: {top_skills_str}
    Summary: {profile.get("summary", "")}

    Target Opportunity:
    Role: {job_title}
    Company: {company}
    Location: {location}
    Job Description Snippet: {description}{intel_context}

    Respond in JSON format with keys:
    {{
        "opening": "...",
        "core_experience": "...",
        "values_and_impact": "...",
        "closing": "..."
    }}
    """

    try:
        res = query_llm(user_prompt, system_prompt=system_prompt, json_mode=True, timeout=16)
        if res.get("success") and res.get("text"):
            text = res["text"].strip()
            # Clean possible markdown fence
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\n?", "", text)
                text = re.sub(r"\n?```$", "", text)
            data = json.loads(text)
            if all(k in data for k in ["opening", "core_experience", "values_and_impact", "closing"]):
                return {
                    "opening": data["opening"].strip(),
                    "core_experience": data["core_experience"].strip(),
                    "values_and_impact": data["values_and_impact"].strip(),
                    "closing": data["closing"].strip(),
                    "provider": res.get("provider", "local_llm"),
                    "model": res.get("model", "local")
                }
    except Exception:
        pass

    # High-impact ATS Heuristic Fallback
    opening = (
        f"I am writing to express my enthusiastic interest in the {job_title} position at {company}. "
        f"Having followed {company}'s impactful work and engineering advancements, I have developed deep admiration "
        f"for your dedication to delivering scalable, high-performance solutions. With a robust background as a "
        f"{candidate_title} specializing in {top_skills_str}, I am confident in my ability to make an immediate, "
        f"meaningful contribution to your technical roadmap."
    )

    core_experience = (
        f"Throughout my engineering career, I have focused on designing, building, and deploying resilient systems "
        f"that solve complex real-world challenges. Leveraging expertise across {top_skills_str}, I have spearheaded initiatives "
        f"that improved system throughput, optimized database performance, and streamlined end-to-end development workflows. "
        f"In my previous roles, I prioritized writing clean, maintainable code backed by comprehensive automated testing "
        f"and modern continuous integration pipelines."
    )

    values_and_impact = (
        f"What excites me most about joining {company} is the opportunity to tackle demanding technical problems alongside "
        f"a world-class team. I thrive in collaborative, product-driven engineering environments where rigorous problem-solving, "
        f"rapid iteration, and mentorship are celebrated. My approach blends analytical precision with user-centric thinking, "
        f"ensuring every architectural choice directly accelerates company objectives."
    )

    closing = (
        f"I would welcome the opportunity to discuss in greater detail how my technical expertise in {top_skills_str} "
        f"and passion for engineering excellence align with {company}'s current goals for the {job_title} role. "
        f"Thank you for your time, consideration, and leadership."
    )

    return {
        "opening": opening,
        "core_experience": core_experience,
        "values_and_impact": values_and_impact,
        "closing": closing,
        "provider": "heuristic_ats",
        "model": "built-in"
    }
