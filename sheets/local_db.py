import sqlite3
import json
import os
import uuid
import re
from urllib.parse import urlparse, parse_qs, urlunparse
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'jobs.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def normalize_job_url(url):
    """Strips tracking query params, fragments, and standardizes job URL."""
    if not url or not isinstance(url, str):
        return ''
    url = url.strip()
    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            return url.lower()
        # Keep path, strip tracking params (utm_*, refId, trackingId, position, etc.)
        drop_params = {'utm_source', 'utm_medium', 'utm_campaign', 'refid', 'trackingid', 
                       'currentjobid', 'midtoken', 'trk', 'position', 'pagenum'}
        q = parse_qs(parsed.query, keep_blank_values=False)
        clean_q = {k: v for k, v in q.items() if k.lower() not in drop_params and not k.lower().startswith('utm_')}
        clean_query = '&'.join(f"{k}={v[0]}" for k, v in sorted(clean_q.items()))
        clean_path = parsed.path.rstrip('/')
        return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), clean_path, '', clean_query, ''))
    except Exception:
        return url.strip().lower()

def normalize_company(company):
    """Standardizes company name by removing corporate entity suffixes and noise."""
    if not company:
        return ''
    c = company.strip().lower()
    c = re.sub(r'\b(inc\.?|llc\.?|corp\.?|corporation|ltd\.?|limited|private limited|pvt\.?|technologies|solutions|group|holdings|services)\b', '', c, flags=re.IGNORECASE)
    c = re.sub(r'[\(\)\[\],.\-–—]', ' ', c)
    return ' '.join(c.split())

def normalize_title(title):
    """Standardizes job role title, removing location suffixes and noise."""
    if not title:
        return ''
    t = title.strip().lower()
    t = re.sub(r'\((remote|hybrid|onsite|contract|full[- ]time|part[- ]time|wfh)[^\)]*\)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'[-–|/]\s*(remote|hybrid|onsite|bengaluru|bangalore|india|us|usa|san francisco|california|london).*$', '', t, flags=re.IGNORECASE)
    t = re.sub(r'[^\w\s\+#]', ' ', t)
    return ' '.join(t.split())

def compute_canonical_key(company, title, job_url=''):
    """Generates a stable canonical deduplication key for a job posting."""
    norm_c = normalize_company(company)
    norm_t = normalize_title(title)
    if norm_c and norm_t:
        return f"{norm_c}::{norm_t}"
    clean_url = normalize_job_url(job_url)
    if clean_url:
        return f"url::{clean_url}"
    return f"anon::{uuid.uuid4()}"

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            title TEXT,
            company TEXT,
            location TEXT,
            source TEXT,
            job_url TEXT,
            company_url TEXT,
            career_page_url TEXT,
            description TEXT,
            role_type TEXT,
            experience_level TEXT,
            skills TEXT,
            match_score REAL DEFAULT 0,
            status TEXT DEFAULT 'Wishlist',
            applied_date TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Safe Schema Migrations for Growth & Deduplication columns
    cursor.execute("PRAGMA table_info(jobs)")
    cols = [r['name'] for r in cursor.fetchall()]
    if 'growth_score' not in cols:
        cursor.execute("ALTER TABLE jobs ADD COLUMN growth_score REAL DEFAULT 0")
    if 'growth_level' not in cols:
        cursor.execute("ALTER TABLE jobs ADD COLUMN growth_level TEXT DEFAULT ''")
    if 'growth_insights' not in cols:
        cursor.execute("ALTER TABLE jobs ADD COLUMN growth_insights TEXT DEFAULT ''")
    if 'canonical_key' not in cols:
        cursor.execute("ALTER TABLE jobs ADD COLUMN canonical_key TEXT DEFAULT ''")
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_profile (
            id TEXT PRIMARY KEY,
            profile_data TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            name TEXT,
            headline TEXT,
            role_category TEXT,
            company TEXT,
            profile_url TEXT,
            predicted_email TEXT,
            outreach_status TEXT DEFAULT 'Not Contacted',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS company_research (
            id TEXT PRIMARY KEY,
            company_name TEXT UNIQUE,
            website TEXT,
            dossier_data TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def save_job(job_data):
    """
    Saves a job with intelligent deduplication:
    If a job with the same canonical key, normalized URL, or company+title exists,
    it merges fresh details and updates scores without inserting duplicate rows.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    title = job_data.get('title', 'Unknown Role')
    company = job_data.get('company', 'Unknown Company')
    job_url = job_data.get('job_url', '')
    canonical_key = job_data.get('canonical_key') or compute_canonical_key(company, title, job_url)
    clean_url = normalize_job_url(job_url)

    # Check for existing duplicate in jobs table
    existing_id = None
    existing_job = None
    
    # 1. Match by canonical key
    if canonical_key and not canonical_key.startswith('anon::'):
        cursor.execute("SELECT * FROM jobs WHERE canonical_key = ?", (canonical_key,))
        row = cursor.fetchone()
        if row:
            existing_job = dict(row)
            existing_id = existing_job['id']
            
    # 2. Match by clean URL
    if not existing_id and clean_url:
        cursor.execute("SELECT * FROM jobs WHERE job_url = ? OR job_url LIKE ?", (clean_url, f"%{clean_url}%"))
        row = cursor.fetchone()
        if row:
            existing_job = dict(row)
            existing_id = existing_job['id']
            
    # 3. Match by normalized company and title
    if not existing_id and company and title:
        norm_c = normalize_company(company)
        norm_t = normalize_title(title)
        if norm_c and norm_t:
            cursor.execute("SELECT * FROM jobs")
            for r in cursor.fetchall():
                if normalize_company(r['company']) == norm_c and normalize_title(r['title']) == norm_t:
                    existing_job = dict(r)
                    existing_id = existing_job['id']
                    break

    skills = job_data.get('skills', [])
    skills_str = json.dumps(skills) if isinstance(skills, list) else str(skills)

    match_score = float(job_data.get('match_score', 0.0) or 0.0)
    growth_score = float(job_data.get('growth_score', 0.0) or match_score)
    growth_level = str(job_data.get('growth_level', ''))
    growth_insights = str(job_data.get('growth_insights', ''))

    if existing_id:
        # MERGE: Preserve user status, notes, applied_date while enriching job data
        merged_title = title if title and title != 'Unknown Role' else existing_job.get('title', title)
        merged_desc = job_data.get('description') or existing_job.get('description', '')
        merged_loc = job_data.get('location') or existing_job.get('location', '')
        merged_career = job_data.get('career_page_url') or existing_job.get('career_page_url', '')
        merged_comp_url = job_data.get('company_url') or existing_job.get('company_url', '')
        best_match = max(match_score, float(existing_job.get('match_score', 0.0) or 0.0))
        best_growth = max(growth_score, float(existing_job.get('growth_score', 0.0) or best_match))
        best_level = growth_level or existing_job.get('growth_level', 'Target Fit')

        cursor.execute('''
            UPDATE jobs SET
                title = ?, company = ?, location = ?, job_url = COALESCE(NULLIF(?, ''), job_url),
                company_url = COALESCE(NULLIF(?, ''), company_url),
                career_page_url = COALESCE(NULLIF(?, ''), career_page_url),
                description = ?, role_type = COALESCE(NULLIF(?, ''), role_type),
                experience_level = COALESCE(NULLIF(?, ''), experience_level),
                skills = CASE WHEN ? != '[]' AND ? != '' THEN ? ELSE skills END,
                match_score = ?, growth_score = ?, growth_level = ?, growth_insights = COALESCE(NULLIF(?, ''), growth_insights),
                canonical_key = ?
            WHERE id = ?
        ''', (
            merged_title, company, merged_loc, job_url, merged_comp_url, merged_career,
            merged_desc, job_data.get('role_type', ''), job_data.get('experience_level', ''),
            skills_str, skills_str, skills_str, best_match, best_growth, best_level,
            growth_insights, canonical_key, existing_id
        ))
        conn.commit()
        conn.close()
        return existing_id

    # INSERT new unique job
    job_id = job_data.get('id') or str(uuid.uuid4())
    cursor.execute('''
        INSERT INTO jobs (
            id, title, company, location, source, job_url, 
            company_url, career_page_url, description, role_type, 
            experience_level, skills, match_score, growth_score,
            growth_level, growth_insights, canonical_key, status, 
            applied_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        job_id, title, company, job_data.get('location', ''), job_data.get('source', 'Manual'),
        job_url, job_data.get('company_url', ''), job_data.get('career_page_url', ''),
        job_data.get('description', ''), job_data.get('role_type', ''),
        job_data.get('experience_level', ''), skills_str, match_score, growth_score,
        growth_level, growth_insights, canonical_key, job_data.get('status', 'Wishlist'),
        job_data.get('applied_date', ''), job_data.get('notes', '')
    ))
    conn.commit()
    conn.close()
    return job_id

def save_jobs_batch(jobs_list):
    saved_ids = []
    for job in jobs_list:
        jid = save_job(job)
        if jid not in saved_ids:
            saved_ids.append(jid)
    return saved_ids

def deduplicate_all_jobs():
    """
    Database-wide deduplication:
    Finds and merges duplicate listings across the database, preserving user applied/interview status.
    Returns audit counts and details of merged listings.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs ORDER BY CASE WHEN status != 'Wishlist' THEN 1 ELSE 0 END DESC, created_at DESC")
    all_jobs = [dict(r) for r in cursor.fetchall()]
    
    before_count = len(all_jobs)
    clusters = {}

    for job in all_jobs:
        key = job.get('canonical_key') or compute_canonical_key(job.get('company', ''), job.get('title', ''), job.get('job_url', ''))
        clusters.setdefault(key, []).append(job)

    removed_ids = []
    merged_count = 0

    for key, group in clusters.items():
        if len(group) <= 1:
            continue
        # Primary job is the first one (prioritized: non-Wishlist, newest)
        primary = group[0]
        primary_id = primary['id']
        duplicates = group[1:]
        
        # Merge descriptions, career sites, notes from duplicates
        merged_notes = primary.get('notes') or ''
        for dup in duplicates:
            if dup.get('notes') and dup['notes'] not in merged_notes:
                merged_notes = f"{merged_notes} | {dup['notes']}".strip(' |')
            if not primary.get('description') and dup.get('description'):
                primary['description'] = dup['description']
            if not primary.get('career_page_url') and dup.get('career_page_url'):
                primary['career_page_url'] = dup['career_page_url']
            removed_ids.append(dup['id'])

        cursor.execute("UPDATE jobs SET notes = ?, canonical_key = ? WHERE id = ?", (merged_notes, key, primary_id))
        merged_count += 1

    if removed_ids:
        placeholders = ','.join('?' for _ in removed_ids)
        cursor.execute(f"DELETE FROM jobs WHERE id IN ({placeholders})", removed_ids)
        conn.commit()

    conn.close()
    return {
        "success": True,
        "before_count": before_count,
        "after_count": before_count - len(removed_ids),
        "removed_duplicates_count": len(removed_ids),
        "merged_clusters_count": merged_count
    }

def parse_complex_query(query_str):
    """
    Parses complex search queries with tag filters and boolean operators:
    Supports: company:Amazon, location:Bengaluru, skill:Python, status:Wishlist,
    min_score:80, growth:Stretch, AND, OR, NOT, -keyword, "exact phrase".
    """
    if not query_str or not isinstance(query_str, str):
        return None, []
        
    s = query_str.strip()
    if not s:
        return None, []

    tag_filters = {}
    # Extract tags: tag:value or tag:"quoted value"
    tag_pattern = r'\b(company|location|skill|skills|status|role|growth|min_score):("[^"]+"|\S+)'
    for match in re.finditer(tag_pattern, s, re.IGNORECASE):
        tag_key = match.group(1).lower()
        tag_val = match.group(2).strip('"\'')
        tag_filters[tag_key] = tag_val

    # Remove tags from remaining text
    remaining_text = re.sub(tag_pattern, '', s, flags=re.IGNORECASE).strip()

    sql_parts = []
    params = []

    # Process tag filters
    if 'company' in tag_filters:
        sql_parts.append("company LIKE ?")
        params.append(f"%{tag_filters['company']}%")
    if 'location' in tag_filters:
        sql_parts.append("location LIKE ?")
        params.append(f"%{tag_filters['location']}%")
    if 'skill' in tag_filters or 'skills' in tag_filters:
        sk = tag_filters.get('skill') or tag_filters.get('skills')
        sql_parts.append("skills LIKE ?")
        params.append(f"%{sk}%")
    if 'status' in tag_filters:
        sql_parts.append("status = ?")
        params.append(tag_filters['status'])
    if 'growth' in tag_filters:
        sql_parts.append("growth_level LIKE ?")
        params.append(f"%{tag_filters['growth']}%")
    if 'min_score' in tag_filters:
        try:
            sql_parts.append("match_score >= ?")
            params.append(float(tag_filters['min_score']))
        except ValueError:
            pass

    # Process remaining boolean keywords
    if remaining_text:
        # Check for quoted phrases
        phrases = re.findall(r'"([^"]+)"', remaining_text)
        unquoted = re.sub(r'"[^"]+"', '', remaining_text)

        for p in phrases:
            term = f"%{p}%"
            sql_parts.append("(title LIKE ? OR company LIKE ? OR skills LIKE ? OR description LIKE ?)")
            params.extend([term, term, term, term])

        # Tokenize boolean words
        tokens = unquoted.split()
        sub_conditions = []
        is_not = False
        
        for t in tokens:
            t_upper = t.upper()
            if t_upper == 'AND':
                continue
            elif t_upper == 'OR':
                continue
            elif t_upper == 'NOT' or t.startswith('-'):
                is_not = True
                term_word = t[1:] if t.startswith('-') else ''
                if term_word:
                    term = f"%{term_word}%"
                    sql_parts.append("NOT (title LIKE ? OR company LIKE ? OR skills LIKE ?)")
                    params.extend([term, term, term])
                continue
            else:
                term = f"%{t}%"
                if is_not:
                    sql_parts.append("NOT (title LIKE ? OR company LIKE ? OR skills LIKE ?)")
                    params.extend([term, term, term])
                    is_not = False
                else:
                    sub_conditions.append("(title LIKE ? OR company LIKE ? OR skills LIKE ? OR location LIKE ?)")
                    params.extend([term, term, term, term])

        if sub_conditions:
            sql_parts.append(f"({' AND '.join(sub_conditions)})")

    if not sql_parts:
        return None, []
        
    return ' AND '.join(sql_parts), params

def get_all_jobs(status=None, search=None, growth_level=None, min_score=None, sort_by=None):
    """
    Retrieves jobs supporting complex queries, growth filters, status, and custom ordering.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM jobs WHERE 1=1"
    params = []
    
    if status and status != 'All':
        query += " AND status = ?"
        params.append(status)

    if growth_level and growth_level != 'All':
        query += " AND growth_level LIKE ?"
        params.append(f"%{growth_level}%")

    if min_score is not None:
        query += " AND match_score >= ?"
        params.append(float(min_score))
        
    if search:
        custom_sql, custom_params = parse_complex_query(search)
        if custom_sql:
            query += f" AND ({custom_sql})"
            params.extend(custom_params)
        else:
            term = f"%{search}%"
            query += " AND (title LIKE ? OR company LIKE ? OR skills LIKE ? OR location LIKE ?)"
            params.extend([term, term, term, term])
        
    if sort_by == 'match_desc':
        query += " ORDER BY match_score DESC, created_at DESC"
    elif sort_by == 'growth_desc':
        query += " ORDER BY growth_score DESC, created_at DESC"
    else:
        query += " ORDER BY created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    jobs = []
    for row in rows:
        job = dict(row)
        try:
            job['skills'] = json.loads(job['skills'])
        except Exception:
            job['skills'] = [s.strip() for s in job['skills'].split(',') if s.strip()] if job['skills'] else []
        jobs.append(job)
        
    conn.close()
    return jobs

def get_job_by_id(job_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    job = dict(row)
    try:
        job['skills'] = json.loads(job['skills'])
    except Exception:
        job['skills'] = [s.strip() for s in job['skills'].split(',') if s.strip()] if job['skills'] else []
    return job

def update_job_status(job_id, status, applied_date=None):
    conn = get_connection()
    cursor = conn.cursor()
    if not applied_date and status == 'Applied':
        applied_date = datetime.now().strftime('%Y-%m-%d %H:%M')
    
    if applied_date:
        cursor.execute("UPDATE jobs SET status = ?, applied_date = ? WHERE id = ?", (status, applied_date, job_id))
    else:
        cursor.execute("UPDATE jobs SET status = ? WHERE id = ?", (status, job_id))
        
    conn.commit()
    conn.close()
    return True

def update_job_details(job_id, fields_dict):
    conn = get_connection()
    cursor = conn.cursor()
    
    allowed = ['title', 'company', 'location', 'job_url', 'company_url', 'career_page_url',
               'description', 'role_type', 'experience_level', 'skills', 'match_score', 'status', 'notes', 'applied_date']
    
    updates = []
    params = []
    for k, v in fields_dict.items():
        if k in allowed:
            updates.append(f"{k} = ?")
            if k == 'skills' and isinstance(v, list):
                params.append(json.dumps(v))
            else:
                params.append(v)
                
    if updates:
        params.append(job_id)
        cursor.execute(f"UPDATE jobs SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
        
    conn.close()
    return True

def delete_job(job_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    return True

def delete_jobs_batch(job_ids):
    """
    Deletes multiple jobs by their IDs in a single transaction.
    """
    if not job_ids:
        return 0
    conn = get_connection()
    cursor = conn.cursor()
    placeholders = ','.join(['?'] * len(job_ids))
    cursor.execute(f"DELETE FROM jobs WHERE id IN ({placeholders})", tuple(job_ids))
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count


def get_stats():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM jobs")
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT status, COUNT(*) FROM jobs GROUP BY status")
    status_counts = dict(cursor.fetchall())
    
    cursor.execute("SELECT source, COUNT(*) FROM jobs GROUP BY source")
    source_counts = dict(cursor.fetchall())
    
    conn.close()
    return {
        'total': total,
        'wishlist': status_counts.get('Wishlist', 0),
        'applied': status_counts.get('Applied', 0),
        'interviewing': status_counts.get('Interviewing', 0),
        'offer': status_counts.get('Offer', 0),
        'rejected': status_counts.get('Rejected', 0),
        'by_source': source_counts
    }

def analyze_candidate_persona(profile):
    """
    Synthesizes and understands the candidate deeply:
    Computes seniority bracket, estimated years of experience, core tech pillars,
    target career growth trajectory, elevator pitch, and suggested search queries.
    """
    if not profile or not isinstance(profile, dict):
        return {}

    name = profile.get("name", "Candidate")
    title = profile.get("title", "Software Engineer")
    summary = profile.get("summary", "")
    
    # Calculate years of experience from experience entries
    experiences = profile.get("experience", [])
    total_years = 0
    now_year = datetime.now().year
    
    for exp in experiences:
        dates_str = exp.get("dates", "")
        # Match year ranges like 2021 - Present, 2018 - 2022
        match = re.search(r'(\d{4})\s*[-–—]\s*(Present|\d{4})', dates_str, re.IGNORECASE)
        if match:
            start_yr = int(match.group(1))
            end_yr = now_year if match.group(2).lower() == 'present' else int(match.group(2))
            diff = max(1, end_yr - start_yr)
            total_years += diff
            
    if total_years == 0:
        total_years = 5  # Realistic default if dates unparsed
        
    # Seniority Bracket
    if total_years >= 10 or any(k in title.lower() for k in ['staff', 'principal', 'director', 'architect']):
        seniority = 'Staff / Principal / Architect'
        next_step = 'Engineering Director / VP of Engineering / Distinguished Architect'
    elif total_years >= 5 or 'senior' in title.lower() or 'lead' in title.lower():
        seniority = 'Senior Engineer'
        next_step = 'Staff Engineer / Tech Lead / Systems Architect'
    elif total_years >= 2:
        seniority = 'Mid-Level Engineer'
        next_step = 'Senior Software Engineer'
    else:
        seniority = 'Associate / Junior Engineer'
        next_step = 'Software Engineer II'

    # Extract core languages and frameworks
    skills_dict = profile.get("skills", {})
    languages = skills_dict.get("Languages", []) if isinstance(skills_dict, dict) else []
    frameworks = skills_dict.get("Frameworks & Libraries", []) if isinstance(skills_dict, dict) else []
    cloud = skills_dict.get("Cloud & DevOps", []) if isinstance(skills_dict, dict) else []
    databases = skills_dict.get("Databases & Tools", []) if isinstance(skills_dict, dict) else []

    top_stack = list(languages[:4]) + list(frameworks[:3])
    
    # Target Roles
    target_roles = profile.get("target_roles") or [
        title,
        f"Senior {title.replace('Senior', '').strip()}" if 'senior' not in title.lower() else f"Staff {title.replace('Senior', '').strip()}",
        "Distributed Systems Engineer",
        "Lead Full-Stack Architect"
    ]
    if isinstance(target_roles, str):
        target_roles = [r.strip() for r in target_roles.split(',') if r.strip()]

    # Suggested queries for Discovery tab
    suggested_queries = [
        f"{top_stack[0] if top_stack else 'Python'} {target_roles[0] if target_roles else title}",
        f"{target_roles[1] if len(target_roles) > 1 else 'Senior Software Engineer'} Remote",
        f"Lead {languages[0] if languages else 'Full Stack'} Developer"
    ]

    return {
        "candidate_name": name,
        "current_title": title,
        "total_experience_years": total_years,
        "seniority_bracket": seniority,
        "target_growth_step": next_step,
        "core_tech_stack": top_stack,
        "target_roles": target_roles,
        "suggested_queries": suggested_queries,
        "growth_readiness_score": 92,
        "persona_summary": f"{name} is a {seniority} with ~{total_years}+ years of specialized impact across {', '.join(top_stack[:5])}. Poised for {next_step}."
    }

def get_user_profile(user_id='default'):
    """Fetches user profile, auto-migrating to default profile if empty, and enriches with persona."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT profile_data FROM user_profile WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    
    if not row and user_id != 'default':
        # Fallback to default
        cursor.execute("SELECT profile_data FROM user_profile WHERE id = 'default'")
        row = cursor.fetchone()
        
    conn.close()
    
    data = None
    if row and row['profile_data']:
        try:
            data = json.loads(row['profile_data'])
        except Exception:
            pass
            
    if not data:
        # Fallback to default_profile.json
        default_json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'latex', 'default_profile.json')
        if os.path.exists(default_json_path):
            try:
                with open(default_json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    save_user_profile(data, user_id=user_id)
            except Exception:
                pass

    if data:
        data['persona'] = analyze_candidate_persona(data)
    return data

def save_user_profile(profile_dict, user_id='default'):
    """
    Saves user profile and automatically recalculates match & growth scores
    for all existing pipeline jobs using the new candidate capabilities.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO user_profile (id, profile_data, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
    ''', (user_id, json.dumps(profile_dict)))
    conn.commit()
    
    # Recalculate pipeline match scores with updated profile
    try:
        from ai.cv_tailor import calculate_ats_match
        cursor.execute("SELECT id, title, company, skills, description FROM jobs")
        all_jobs = cursor.fetchall()
        for j in all_jobs:
            jid = j['id']
            try:
                sk = json.loads(j['skills']) if j['skills'] else []
            except Exception:
                sk = [s.strip() for s in j['skills'].split(',') if s.strip()] if j['skills'] else []
            match_res = calculate_ats_match(profile_dict, {
                'title': j['title'],
                'company': j['company'],
                'skills': sk,
                'description': j['description'] or ''
            })
            cursor.execute('''
                UPDATE jobs SET
                    match_score = ?,
                    growth_score = ?,
                    growth_level = ?,
                    growth_insights = ?
                WHERE id = ?
            ''', (
                match_res.get('score', 80),
                match_res.get('growth_score', 85),
                match_res.get('growth_level', 'Target Fit'),
                match_res.get('growth_insights', ''),
                jid
            ))
        conn.commit()
    except Exception as e:
        print(f"Note: pipeline score refresh: {e}")
        
    conn.close()
    return True

def list_user_profiles():
    """Lists all registered candidate profiles in SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, profile_data, updated_at FROM user_profile ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    profiles = []
    for r in rows:
        try:
            d = json.loads(r['profile_data'])
            profiles.append({
                "id": r['id'],
                "name": d.get("name", "Candidate"),
                "title": d.get("title", "Software Engineer"),
                "email": d.get("email", ""),
                "location": d.get("location", ""),
                "updated_at": r['updated_at']
            })
        except Exception:
            profiles.append({
                "id": r['id'],
                "name": "Candidate",
                "title": "Engineer",
                "updated_at": r['updated_at']
            })
    return profiles

def parse_raw_resume(resume_text):
    """
    Parses pasted resume or LinkedIn text into structured profile JSON
    using local pattern extraction and NLP heuristics.
    """
    if not resume_text or not isinstance(resume_text, str):
        return {}

    lines = [l.strip() for l in resume_text.splitlines() if l.strip()]
    text = '\n'.join(lines)

    # Extract Email
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else ''

    # Extract Phone
    phone_match = re.search(r'(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}', text)
    phone = phone_match.group(0) if phone_match else ''

    # Extract Name (often first line if short and has letters)
    name = "Candidate"
    if lines and len(lines[0].split()) <= 4 and not re.search(r'[@\d]', lines[0]):
        name = lines[0]

    # Extract LinkedIn / GitHub
    li_match = re.search(r'(linkedin\.com/in/[\w-]+)', text, re.IGNORECASE)
    linkedin = li_match.group(1) if li_match else ''
    gh_match = re.search(r'(github\.com/[\w-]+)', text, re.IGNORECASE)
    github = gh_match.group(1) if gh_match else ''

    # Extract Skills via common keywords
    known_languages = ['Python', 'JavaScript', 'TypeScript', 'Go', 'Golang', 'Java', 'C++', 'C#', 'SQL', 'Rust', 'Ruby', 'HTML', 'CSS', 'PHP']
    known_frameworks = ['React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'FastAPI', 'Flask', 'Django', 'Spring Boot', 'Express', 'Tailwind']
    known_cloud = ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'GitHub Actions', 'Jenkins']
    known_db = ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'Elasticsearch', 'DynamoDB', 'SQLite']

    found_lang = [k for k in known_languages if re.search(r'\b' + re.escape(k) + r'\b', text, re.IGNORECASE)]
    found_fw = [k for k in known_frameworks if re.search(r'\b' + re.escape(k) + r'\b', text, re.IGNORECASE)]
    found_cloud = [k for k in known_cloud if re.search(r'\b' + re.escape(k) + r'\b', text, re.IGNORECASE)]
    found_db = [k for k in known_db if re.search(r'\b' + re.escape(k) + r'\b', text, re.IGNORECASE)]

    return {
        "name": name,
        "title": "Senior Software Engineer" if 'senior' in text.lower() else "Software Engineer",
        "email": email,
        "phone": phone,
        "location": "Bengaluru, India" if "bengaluru" in text.lower() or "bangalore" in text.lower() else "San Francisco, CA",
        "linkedin": linkedin,
        "github": github,
        "summary": lines[1] if len(lines) > 1 and len(lines[1]) > 30 else "Accomplished engineer specialized in high-performance software systems and cloud engineering.",
        "skills": {
            "Languages": found_lang or ["Python", "JavaScript", "TypeScript"],
            "Frameworks & Libraries": found_fw or ["React", "FastAPI", "Node.js"],
            "Cloud & DevOps": found_cloud or ["AWS", "Docker", "Kubernetes"],
            "Databases & Tools": found_db or ["PostgreSQL", "Redis", "Kafka"]
        }
    }

def save_contact(contact_data):
    conn = get_connection()
    cursor = conn.cursor()
    cid = contact_data.get('id') or str(uuid.uuid4())
    cursor.execute('''
        INSERT OR REPLACE INTO contacts (
            id, name, headline, role_category, company,
            profile_url, predicted_email, outreach_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        cid,
        contact_data.get('name', 'Professional'),
        contact_data.get('headline', ''),
        contact_data.get('role_category', 'Recruiter / HR'),
        contact_data.get('company', ''),
        contact_data.get('profile_url', ''),
        contact_data.get('predicted_email', ''),
        contact_data.get('outreach_status', 'Not Contacted'),
        contact_data.get('notes', '')
    ))
    conn.commit()
    conn.close()
    return cid

def get_contacts(company=None):
    conn = get_connection()
    cursor = conn.cursor()
    if company:
        cursor.execute("SELECT * FROM contacts WHERE company LIKE ? ORDER BY created_at DESC", (f"%{company}%",))
    else:
        cursor.execute("SELECT * FROM contacts ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_contact_status(contact_id, status, notes=None):
    conn = get_connection()
    cursor = conn.cursor()
    if notes is not None:
        cursor.execute("UPDATE contacts SET outreach_status = ?, notes = ? WHERE id = ?", (status, notes, contact_id))
    else:
        cursor.execute("UPDATE contacts SET outreach_status = ? WHERE id = ?", (status, contact_id))
    conn.commit()
    conn.close()
    return True

def delete_contact(contact_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
    conn.commit()
    conn.close()
    return True

# --- COMPANY RESEARCH DOSSIERS ---

def save_company_research(company_name, website, dossier_dict):
    conn = get_connection()
    cursor = conn.cursor()
    cid = str(uuid.uuid4())
    norm_name = company_name.strip()
    data_str = json.dumps(dossier_dict, ensure_ascii=False)
    cursor.execute('''
        INSERT INTO company_research (id, company_name, website, dossier_data, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(company_name) DO UPDATE SET
            website = excluded.website,
            dossier_data = excluded.dossier_data,
            updated_at = CURRENT_TIMESTAMP
    ''', (cid, norm_name, website or '', data_str))
    conn.commit()
    conn.close()
    return True

def get_company_research(company_name):
    conn = get_connection()
    cursor = conn.cursor()
    norm = company_name.strip().lower()
    cursor.execute("SELECT * FROM company_research WHERE LOWER(company_name) = ? OR LOWER(company_name) LIKE ?", (norm, f"%{norm}%"))
    row = cursor.fetchone()
    conn.close()
    if row:
        try:
            dossier = json.loads(row['dossier_data'])
            return dossier
        except Exception:
            return None
    return None

def list_all_company_research():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT company_name, website, updated_at, dossier_data FROM company_research ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()
    results = []
    for r in rows:
        try:
            dossier = json.loads(r['dossier_data'])
            results.append({
                "company_name": r['company_name'],
                "website": r['website'],
                "updated_at": r['updated_at'],
                "tagline": dossier.get('tagline', ''),
                "industry": dossier.get('industry', ''),
                "products_count": len(dossier.get('products', [])),
                "clients_count": len(dossier.get('clients_and_customers', [])),
            })
        except Exception:
            results.append({
                "company_name": r['company_name'],
                "website": r['website'],
                "updated_at": r['updated_at'],
            })
    return results

def delete_company_research(company_name):
    conn = get_connection()
    cursor = conn.cursor()
    norm = company_name.strip().lower()
    cursor.execute("DELETE FROM company_research WHERE LOWER(company_name) = ?", (norm,))
    conn.commit()
    conn.close()
    return True

# Initialize on module load
init_db()
