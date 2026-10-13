import os
import json
import re
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from dotenv import load_dotenv

load_dotenv()

from sheets.local_db import (
    save_job, save_jobs_batch, get_all_jobs, get_job_by_id, 
    update_job_status, update_job_details, delete_job, delete_jobs_batch, get_stats,
    get_user_profile, save_user_profile, list_user_profiles, parse_raw_resume,
    deduplicate_all_jobs,
    save_contact, get_contacts, update_contact_status, delete_contact
)
from sheets.sheets_client import append_job_to_sheet, sync_all_jobs_to_sheet
from scraper.linkedin_scraper import scrape_linkedin_jobs, scrape_single_linkedin_job
from scraper.google_scraper import search_jobs_google
from scraper.company_scraper import find_company_career_site, find_multiple_company_career_sites, scrape_company_live_openings
from scraper.recruiter_finder import search_company_contacts, predict_company_email_patterns
from ai.jd_analyzer import analyze_jd
from ai.cv_tailor import calculate_ats_match, tailor_bullet_points, generate_cold_outreach
from ai.referral_generator import generate_personalized_referral_outreach
from ai.local_llm import get_llm_config, save_llm_config, detect_local_models, query_llm
from agent.autonomous_agent import get_global_agent
from latex.cv_generator import generate_latex_cv, OUTPUT_DIR
from latex.cover_letter_generator import generate_cover_letter
from agent.company_researcher import study_company_like_a_human
from sheets.local_db import (
    save_company_research, get_company_research, list_all_company_research, delete_company_research
)
from scraper.people_intelligence import search_people_apollo_style, detect_domain_email_pattern
from email_engine.mailer import send_referral_email, test_smtp_connection, get_smtp_config
from ai.interview_prep import generate_interview_prep_pack
from agent.agent_trainer import run_agent_training_cycle, load_training_profile

app = Flask(__name__, static_folder='static', template_folder='templates')

def ensure_initial_profile():
    profile = get_user_profile()
    if not profile:
        profile_path = os.path.join(os.path.dirname(__file__), 'latex', 'default_profile.json')
        if os.path.exists(profile_path):
            try:
                with open(profile_path, 'r', encoding='utf-8') as f:
                    profile = json.load(f)
                    save_user_profile(profile)
            except Exception as e:
                print(f"Error loading initial profile: {e}")

ensure_initial_profile()

FRONTEND_DIST_DIR = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')

@app.route('/')
def index():
    if os.path.exists(os.path.join(FRONTEND_DIST_DIR, 'index.html')):
        return send_from_directory(FRONTEND_DIST_DIR, 'index.html')
    return render_template('index.html')

@app.route('/assets/<path:path>')
def serve_frontend_assets(path):
    assets_dir = os.path.join(FRONTEND_DIST_DIR, 'assets')
    if os.path.exists(assets_dir):
        return send_from_directory(assets_dir, path)
    return ('Not Found', 404)

# --- JOBS API ---

@app.route('/api/jobs', methods=['GET'])
def api_get_jobs():
    status = request.args.get('status')
    search = request.args.get('search')
    growth_level = request.args.get('growth_level')
    min_score = request.args.get('min_score')
    sort_by = request.args.get('sort_by')
    jobs = get_all_jobs(status=status, search=search, growth_level=growth_level, min_score=min_score, sort_by=sort_by)
    return jsonify({"success": True, "jobs": jobs, "total": len(jobs)})

@app.route('/api/jobs/deduplicate', methods=['POST'])
def api_deduplicate_jobs():
    result = deduplicate_all_jobs()
    return jsonify(result)

@app.route('/api/jobs', methods=['POST'])
def api_create_job():
    data = request.json or {}
    # If company site not provided, find it automatically
    if data.get('company') and not data.get('career_page_url'):
        c_info = find_company_career_site(data['company'], data.get('company_url', ''))
        data['career_page_url'] = c_info.get('career_page_url', '')
        if not data.get('company_url'):
            data['company_url'] = c_info.get('official_site', '')
            
    job_id = save_job(data)
    job = get_job_by_id(job_id)
    return jsonify({"success": True, "job": job})

@app.route('/api/jobs/<job_id>', methods=['GET'])
def api_get_job(job_id):
    job = get_job_by_id(job_id)
    if not job:
        return jsonify({"success": False, "error": "Job not found"}), 404
    return jsonify({"success": True, "job": job})

@app.route('/api/jobs/<job_id>/status', methods=['PATCH'])
def api_update_status(job_id):
    data = request.json or {}
    new_status = data.get('status', 'Wishlist')
    applied_date = data.get('applied_date')
    update_job_status(job_id, new_status, applied_date)
    return jsonify({"success": True, "status": new_status})

@app.route('/api/jobs/<job_id>', methods=['PUT'])
def api_update_job(job_id):
    data = request.json or {}
    update_job_details(job_id, data)
    updated = get_job_by_id(job_id)
    return jsonify({"success": True, "job": updated})

@app.route('/api/jobs/<job_id>', methods=['DELETE'])
def api_delete_job(job_id):
    delete_job(job_id)
    return jsonify({"success": True, "message": "Job deleted"})

@app.route('/api/jobs/batch-delete', methods=['POST'])
def api_delete_jobs_batch():
    data = request.json or {}
    job_ids = data.get('job_ids', [])
    if not job_ids:
        return jsonify({"success": False, "error": "No job IDs provided"}), 400
    deleted_count = delete_jobs_batch(job_ids)
    return jsonify({"success": True, "deleted_count": deleted_count, "message": f"Successfully deleted {deleted_count} jobs"})

@app.route('/api/jobs/batch-status', methods=['PATCH'])
def api_update_jobs_batch_status():
    data = request.json or {}
    job_ids = data.get('job_ids', [])
    status = data.get('status')
    if not job_ids or not status:
        return jsonify({"success": False, "error": "job_ids and status required"}), 400
    for jid in job_ids:
        update_job_status(jid, status)
    return jsonify({"success": True, "updated_count": len(job_ids), "message": f"Updated {len(job_ids)} jobs to {status}"})


@app.route('/api/stats', methods=['GET'])
def api_get_stats():
    stats = get_stats()
    return jsonify({"success": True, "stats": stats})

# --- SCRAPER APIS ---

@app.route('/api/scrape/linkedin', methods=['POST'])
def api_scrape_linkedin():
    data = request.json or {}
    query_or_url = data.get('query') or data.get('roles') or ''
    if isinstance(query_or_url, str):
        query_or_url = query_or_url.strip()
    location = data.get('location', '').strip() or 'Bengaluru, Karnataka, India'
    max_results = int(data.get('max_results', 20))
    auto_save = data.get('auto_save', True)
    cookie = data.get('cookie') or data.get('li_at') or ''
    find_company_sites = data.get('find_company_sites', True)

    if not query_or_url:
        return jsonify({"success": False, "error": "LinkedIn URL or keywords required"}), 400

    try:
        from scraper.linkedin_scraper import parse_linkedin_search_url
        parsed_meta = parse_linkedin_search_url(query_or_url) if (isinstance(query_or_url, str) and query_or_url.startswith('http')) else None
        
        jobs = scrape_linkedin_jobs(
            query_or_url,
            location=location,
            max_results=max_results,
            find_company_sites=find_company_sites,
            cookie=cookie
        )
        
        # Calculate initial match scores against user profile
        profile = get_user_profile() or {}
        for job in jobs:
            match = calculate_ats_match(profile, job)
            job['match_score'] = match['score']
            if auto_save:
                save_job(job)

        return jsonify({
            "success": True,
            "jobs": jobs,
            "count": len(jobs),
            "saved": auto_save,
            "parsed_url": parsed_meta
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/scrape/google', methods=['POST'])
def api_scrape_google():
    data = request.json or {}
    role = data.get('roles') or data.get('role') or ''
    location = data.get('locations') or data.get('location') or 'Bengaluru, Karnataka, India'
    preferences = {
        "experience": data.get('experience', ''),
        "work_type": data.get('work_type', ''),
        "keywords": data.get('keywords', ''),
        "ats_only": data.get('ats_only', True),
    }
    max_results = int(data.get('max_results', 15))
    auto_save = data.get('auto_save', True)

    if not role:
        return jsonify({"success": False, "error": "Role title is required"}), 400

    try:
        results = search_jobs_google(role, location=location, preferences=preferences, max_results=max_results)
        profile = get_user_profile() or {}
        for job in results:
            match = calculate_ats_match(profile, job)
            job['match_score'] = match['score']
            if auto_save:
                save_job(job)

        return jsonify({
            "success": True,
            "jobs": results,
            "count": len(results),
            "saved": auto_save
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/scrape/company', methods=['POST'])
def api_scrape_company():
    data = request.json or {}
    company_input = data.get('company', '').strip()
    role = data.get('role', '').strip() or data.get('keywords', '').strip()
    location = data.get('location', '').strip() or 'Bengaluru, Karnataka, India'
    website = data.get('website', '').strip()
    max_per_company = int(data.get('max_results', 12))
    auto_save = data.get('auto_save', True)

    if not company_input:
        return jsonify({"success": False, "error": "Company name required"}), 400

    try:
        # Scrape real, live job openings for the company/companies
        result = scrape_company_live_openings(
            companies_input=company_input,
            role_keywords=role,
            location=location,
            max_per_company=max_per_company
        )

        jobs = result.get('jobs', [])
        profile = get_user_profile() or {}

        # Calculate ATS compatibility match score for each job
        for job in jobs:
            match = calculate_ats_match(profile, job)
            job['match_score'] = match['score']
            if auto_save:
                save_job(job)

        return jsonify({
            "success": True,
            "jobs": jobs,
            "count": len(jobs),
            "companies": result.get('companies', []),
            "company_info": result.get('company_info', {}),
            "saved": auto_save
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# --- CONTACTS & REFERRAL APIS ---

@app.route('/api/contacts/search', methods=['POST'])
def api_search_contacts():
    data = request.json or {}
    company = data.get('company', '').strip()
    contact_type = data.get('contact_type', 'all')
    location = data.get('location', '').strip()
    domain = data.get('domain', '').strip()
    max_results = int(data.get('max_results', 12))

    if not company:
        return jsonify({"success": False, "error": "Company name required"}), 400

    contacts = search_company_contacts(company, contact_type=contact_type, location=location, domain=domain, max_results=max_results)
    email_meta = predict_company_email_patterns(company, domain)
    
    return jsonify({
        "success": True,
        "contacts": contacts,
        "count": len(contacts),
        "email_patterns": email_meta
    })

@app.route('/api/contacts', methods=['GET'])
def api_get_saved_contacts():
    company = request.args.get('company')
    contacts = get_contacts(company=company)
    return jsonify({"success": True, "contacts": contacts, "count": len(contacts)})

@app.route('/api/contacts', methods=['POST'])
def api_save_contact():
    data = request.json or {}
    cid = save_contact(data)
    return jsonify({"success": True, "id": cid, "message": "Contact saved to your networking tracker"})

@app.route('/api/contacts/<cid>/status', methods=['PATCH'])
def api_update_contact_status(cid):
    data = request.json or {}
    status = data.get('status', 'Not Contacted')
    notes = data.get('notes')
    update_contact_status(cid, status, notes)
    return jsonify({"success": True, "status": status})

@app.route('/api/contacts/<cid>', methods=['DELETE'])
def api_delete_contact(cid):
    delete_contact(cid)
    return jsonify({"success": True, "message": "Contact removed"})

@app.route('/api/contacts/outreach', methods=['POST'])
def api_generate_contact_outreach():
    data = request.json or {}
    contact_name = data.get('contact_name', '')
    contact_role = data.get('contact_role', 'Recruiter')
    company = data.get('company', '')
    target_role = data.get('target_role', 'Software Engineer')
    outreach_type = data.get('outreach_type', 'referral')
    job_id_or_link = data.get('job_link', '')

    profile = get_user_profile() or {}
    outreach = generate_personalized_referral_outreach(
        contact_name=contact_name,
        contact_role=contact_role,
        company_name=company,
        target_role=target_role,
        candidate_profile=profile,
        outreach_type=outreach_type,
        job_id_or_link=job_id_or_link
    )
    return jsonify({"success": True, "outreach": outreach})

# --- AI & ATS APIS ---

@app.route('/api/ai/analyze-jd', methods=['POST'])
def api_analyze_jd():
    data = request.json or {}
    jd_text = data.get('jd_text', '').strip()
    job_id = data.get('job_id')

    if not jd_text and job_id:
        job = get_job_by_id(job_id)
        if job and job.get('description'):
            jd_text = job['description']

    if not jd_text:
        return jsonify({"success": False, "error": "Please provide job description text or a valid job ID"}), 400

    analysis = analyze_jd(jd_text)
    profile = get_user_profile() or {}
    match = calculate_ats_match(profile, analysis)

    # If job_id exists, update job details
    if job_id:
        update_job_details(job_id, {
            "role_type": analysis.get("role", ""),
            "experience_level": analysis.get("experience_level", ""),
            "skills": analysis.get("skills", []),
            "match_score": match.get("score", 0),
            "description": jd_text
        })

    return jsonify({
        "success": True,
        "analysis": analysis,
        "match": match
    })

@app.route('/api/ai/tailor-cv', methods=['POST'])
def api_tailor_cv():
    data = request.json or {}
    job_data = data.get('job_data') or {}
    profile = get_user_profile() or {}

    tailored_bullets = tailor_bullet_points(profile, job_data)
    outreach = generate_cold_outreach(profile, job_data)
    match = calculate_ats_match(profile, job_data)

    job_data_with_bullets = dict(job_data)
    job_data_with_bullets['tailored_experience'] = tailored_bullets

    latex_result = generate_latex_cv(profile, job_data=job_data_with_bullets)

    return jsonify({
        "success": True,
        "tailored_experience": tailored_bullets,
        "outreach": outreach,
        "match": match,
        "latex_result": latex_result
    })

# --- PROFILE API ---

@app.route('/api/profile', methods=['GET'])
def api_get_profile():
    user_id = request.args.get('user_id', 'default')
    profile = get_user_profile(user_id=user_id)
    all_profiles = list_user_profiles()
    return jsonify({"success": True, "profile": profile, "all_profiles": all_profiles})

@app.route('/api/profile', methods=['POST'])
def api_save_profile():
    data = request.json or {}
    user_id = data.get('user_id', 'default')
    save_user_profile(data, user_id=user_id)
    updated = get_user_profile(user_id=user_id)
    return jsonify({"success": True, "message": "Profile updated successfully", "profile": updated})

@app.route('/api/profile/parse-resume', methods=['POST'])
def api_parse_resume():
    data = request.json or {}
    text = data.get('resume_text', '')
    if not text:
        return jsonify({"success": False, "error": "No resume text provided"}), 400
    parsed = parse_raw_resume(text)
    return jsonify({"success": True, "parsed_profile": parsed})

@app.route('/api/profile/login', methods=['POST'])
def api_profile_login():
    data = request.json or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    title = data.get('title', '').strip()
    user_id = email.lower() if email else 'default'
    
    existing = get_user_profile(user_id=user_id)
    if not existing or (name and existing.get('name') != name):
        profile = existing or get_user_profile('default') or {}
        profile = dict(profile)
        if name: profile['name'] = name
        if email: profile['email'] = email
        if title: profile['title'] = title
        save_user_profile(profile, user_id=user_id)
        existing = get_user_profile(user_id=user_id)
        
    return jsonify({"success": True, "user_id": user_id, "profile": existing})

# --- LATEX APIS ---

@app.route('/api/latex/generate', methods=['POST'])
def api_generate_latex():
    data = request.json or {}
    profile = data.get('profile') or get_user_profile() or {}
    job_data = data.get('job_data')
    
    result = generate_latex_cv(profile, job_data=job_data)
    return jsonify({"success": True, "result": result})

@app.route('/api/latex/download/<filename>')
def api_download_file(filename):
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(OUTPUT_DIR, safe_filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return jsonify({"success": False, "error": "File not found"}), 404

@app.route('/api/latex/view/<filename>')
def api_view_latex_file(filename):
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(OUTPUT_DIR, safe_filename)
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({"success": True, "content": content, "filename": safe_filename})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
    return jsonify({"success": False, "error": "File not found"}), 404

# --- COVER LETTER APIS ---

@app.route('/api/cover-letter/generate', methods=['POST'])
def api_generate_cover_letter():
    data = request.json or {}
    job_id = data.get('job_id')
    job_data = data.get('job_data')
    if not job_data and job_id:
        job_data = get_job_by_id(job_id)
    recipient_info = data.get('recipient_info')
    paragraphs = data.get('paragraphs')
    profile = data.get('profile') or get_user_profile() or {}

    result = generate_cover_letter(profile, job_data=job_data, recipient_info=recipient_info, paragraphs=paragraphs)
    return jsonify({"success": True, "result": result})

@app.route('/api/cover-letter/download/<filename>')
def api_download_cover_letter(filename):
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(OUTPUT_DIR, safe_filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return jsonify({"success": False, "error": "File not found"}), 404

@app.route('/api/cover-letter/view/<filename>')
def api_view_cover_letter(filename):
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(OUTPUT_DIR, safe_filename)
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({"success": True, "content": content, "filename": safe_filename})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
    return jsonify({"success": False, "error": "File not found"}), 404

# --- SHEETS API ---

@app.route('/api/sheets/sync', methods=['POST'])
def api_sync_sheets():
    jobs = get_all_jobs()
    success, msg = sync_all_jobs_to_sheet(jobs)
    return jsonify({"success": success, "message": msg})

# --- SETTINGS API ---

@app.route('/api/settings', methods=['POST'])
def api_save_settings():
    data = request.json or {}
    gemini_key = data.get('gemini_api_key')
    sheet_name = data.get('google_sheet_name')

    env_path = os.path.join(os.path.dirname(__file__), '.env')
    env_content = ""
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            env_content = f.read()

    if gemini_key is not None:
        os.environ['GEMINI_API_KEY'] = gemini_key
        if 'GEMINI_API_KEY=' in env_content:
            env_content = re.sub(r'GEMINI_API_KEY=.*', f'GEMINI_API_KEY={gemini_key}', env_content)
        else:
            env_content += f"\nGEMINI_API_KEY={gemini_key}\n"

    if sheet_name is not None:
        os.environ['GOOGLE_SHEET_NAME'] = sheet_name
        if 'GOOGLE_SHEET_NAME=' in env_content:
            env_content = re.sub(r'GOOGLE_SHEET_NAME=.*', f'GOOGLE_SHEET_NAME={sheet_name}', env_content)
        else:
            env_content += f"\nGOOGLE_SHEET_NAME={sheet_name}\n"

    with open(env_path, 'w', encoding='utf-8') as f:
        f.write(env_content)

    return jsonify({"success": True, "message": "Settings updated successfully"})

# --- AUTONOMOUS AGENT & LOCAL MODEL APIS ---

@app.route('/api/agent/config', methods=['GET', 'POST'])
def api_agent_config():
    if request.method == 'POST':
        data = request.json or {}
        saved = save_llm_config(data)
        return jsonify({"success": True, "config": saved})
    else:
        cfg = get_llm_config()
        detection = detect_local_models()
        return jsonify({"success": True, "config": cfg, "detection": detection})

@app.route('/api/agent/test-local-model', methods=['POST'])
def api_test_local_model():
    data = request.json or {}
    if data:
        save_llm_config(data)
    detection = detect_local_models()
    provider = (data.get("provider") or get_llm_config().get("provider", "ollama")).lower()
    
    # Query test ping
    test_result = query_llm("Respond with 'OK' if you can read this.", timeout=5)
    is_connected = bool(test_result.get("success", False))

    avail_models = []
    if provider == "ollama" and detection.get("ollama", {}).get("connected"):
        avail_models = detection.get("ollama", {}).get("models", [])
        is_connected = True
    elif provider == "local_openai" and detection.get("local_openai", {}).get("connected"):
        avail_models = detection.get("local_openai", {}).get("models", [])
        is_connected = True

    return jsonify({
        "success": True,
        "connected": is_connected,
        "provider": provider,
        "available_models": avail_models,
        "detection": detection,
        "test_query": test_result
    })

@app.route('/api/agent/run', methods=['POST'])
def api_agent_run():
    data = request.json or {}
    agent = get_global_agent()
    result = agent.start_mission(data)
    return jsonify(result)

@app.route('/api/agent/status', methods=['GET'])
def api_agent_status():
    agent = get_global_agent()
    status = agent.get_status()
    return jsonify({"success": True, "status": status, "agent": status})

@app.route('/api/agent/stop', methods=['POST'])
def api_agent_stop():
    agent = get_global_agent()
    agent.stop()
    return jsonify({"success": True, "message": "Stop signal sent to agent."})

# --- COMPANY DEEP RESEARCH (HUMAN CRAWLER) ---

@app.route('/api/company/research', methods=['POST'])
def api_company_research():
    data = request.json or {}
    company = data.get('company', '').strip()
    if not company:
        return jsonify({"success": False, "message": "Company name is required."}), 400
    website = data.get('website', '').strip()
    human_pacing = data.get('human_pacing', True)
    force_refresh = data.get('force_refresh', False)

    result = study_company_like_a_human(
        company_name=company,
        official_url=website,
        human_pacing=human_pacing,
        force_refresh=force_refresh
    )
    return jsonify(result)

@app.route('/api/company/research', methods=['GET'])
def api_list_company_research():
    companies = list_all_company_research()
    return jsonify({"success": True, "companies": companies, "total": len(companies)})

@app.route('/api/company/research/<company>', methods=['GET'])
def api_get_company_research(company):
    dossier = get_company_research(company)
    if not dossier:
        return jsonify({"success": False, "message": f"No dossier found for {company}."}), 404
    return jsonify({"success": True, "dossier": dossier, "company": company})

@app.route('/api/company/research/<company>', methods=['DELETE'])
def api_delete_company_research(company):
    delete_company_research(company)
    return jsonify({"success": True, "message": f"Dossier for {company} deleted."})

# --- PEOPLE INTELLIGENCE (APOLLO.IO / HUNTER.IO / ROCKETREACH STYLE) ---

@app.route('/api/people/search', methods=['POST'])
def api_people_search():
    data = request.json or {}
    company = data.get('company', '').strip()
    if not company:
        return jsonify({"success": False, "message": "Company name is required."}), 400
    dept = data.get('department', 'all')
    seniority = data.get('seniority', 'all')
    location = data.get('location', 'Bengaluru, Karnataka, India')
    limit = int(data.get('limit', 12))

    res = search_people_apollo_style(
        company_name=company,
        department=dept,
        seniority=seniority,
        location=location,
        limit=limit
    )
    return jsonify({"success": True, **res})

@app.route('/api/people/domain-pattern', methods=['GET'])
def api_domain_pattern():
    company = request.args.get('company', '').strip()
    domain = request.args.get('domain', '').strip()
    if not company:
        return jsonify({"success": False, "message": "Company required."}), 400
    res = detect_domain_email_pattern(company, domain)
    return jsonify({"success": True, **res})

# --- REFERRAL EMAIL SENDER ENGINE ---

@app.route('/api/email/send', methods=['POST'])
def api_send_email():
    data = request.json or {}
    recipient = data.get('recipient_email', '').strip()
    subject = data.get('subject', '').strip()
    body = data.get('body', '').strip()
    attachment_name = data.get('attachment_filename', '').strip()

    if not recipient or not subject or not body:
        return jsonify({"success": False, "message": "Recipient, subject, and body are required."}), 400

    attachment_path = None
    if attachment_name:
        candidate_path = os.path.join(OUTPUT_DIR, attachment_name)
        if os.path.exists(candidate_path):
            attachment_path = candidate_path

    res = send_referral_email(
        recipient_email=recipient,
        subject=subject,
        body_text=body,
        attachment_path=attachment_path
    )
    return jsonify(res)

@app.route('/api/email/test-smtp', methods=['POST'])
def api_test_smtp():
    data = request.json or {}
    res = test_smtp_connection(data if data else None)
    return jsonify(res)

@app.route('/api/email/config', methods=['GET'])
def api_get_smtp_config():
    cfg = get_smtp_config()
    safe_cfg = {
        "host": cfg["host"],
        "port": cfg["port"],
        "user": cfg["user"],
        "from_name": cfg["from_name"],
        "use_tls": cfg["use_tls"],
        "is_configured": bool(cfg["user"] and cfg["password"])
    }
    return jsonify({"success": True, "config": safe_cfg})

# --- INTERVIEW PREPARATION STUDIO ---

@app.route('/api/interview/prep', methods=['POST'])
def api_interview_prep():
    data = request.json or {}
    job_id = data.get('job_id', '')
    profile = get_user_profile() or {}

    job_data = {}
    if job_id:
        j = get_job_by_id(job_id)
        if j:
            job_data = j
    if not job_data:
        job_data = {
            "title": data.get('role_title', 'Software Engineer'),
            "company": data.get('company', 'Tech Company'),
            "description": data.get('jd_text', '')
        }

    prep_pack = generate_interview_prep_pack(profile, job_data)
    return jsonify({"success": True, "prep_pack": prep_pack})

# --- AGENT AUTO-TRAINING ENGINE (PRE & POST PROCESSING) ---

@app.route('/api/agent/train', methods=['POST'])
def api_agent_train():
    res = run_agent_training_cycle()
    return jsonify(res)

@app.route('/api/agent/train-status', methods=['GET'])
def api_agent_train_status():
    prof = load_training_profile()
    return jsonify({"success": True, "training_profile": prof})

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    print(f"Starting Job Finder & CV Creator Dashboard on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)

