import os
import json
import re
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from dotenv import load_dotenv

load_dotenv()

from sheets.local_db import (
    save_job, save_jobs_batch, get_all_jobs, get_job_by_id, 
    update_job_status, update_job_details, delete_job, get_stats,
    get_user_profile, save_user_profile,
    save_contact, get_contacts, update_contact_status, delete_contact
)
from sheets.sheets_client import append_job_to_sheet, sync_all_jobs_to_sheet
from scraper.linkedin_scraper import scrape_linkedin_jobs, scrape_single_linkedin_job
from scraper.google_scraper import search_jobs_google
from scraper.company_scraper import find_company_career_site
from scraper.recruiter_finder import search_company_contacts, predict_company_email_patterns
from ai.jd_analyzer import analyze_jd
from ai.cv_tailor import calculate_ats_match, tailor_bullet_points, generate_cold_outreach
from ai.referral_generator import generate_personalized_referral_outreach
from latex.cv_generator import generate_latex_cv, OUTPUT_DIR

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

@app.route('/')
def index():
    return render_template('index.html')

# --- JOBS API ---

@app.route('/api/jobs', methods=['GET'])
def api_get_jobs():
    status = request.args.get('status')
    search = request.args.get('search')
    jobs = get_all_jobs(status=status, search=search)
    return jsonify({"success": True, "jobs": jobs, "total": len(jobs)})

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
    company = data.get('company', '').strip()
    website = data.get('website', '').strip()

    if not company:
        return jsonify({"success": False, "error": "Company name required"}), 400

    info = find_company_career_site(company, website)
    return jsonify({"success": True, "company_info": info})

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
    profile = get_user_profile()
    return jsonify({"success": True, "profile": profile})

@app.route('/api/profile', methods=['POST'])
def api_save_profile():
    data = request.json or {}
    save_user_profile(data)
    return jsonify({"success": True, "message": "Profile updated successfully"})

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

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    print(f"Starting Job Finder & CV Creator Dashboard on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
