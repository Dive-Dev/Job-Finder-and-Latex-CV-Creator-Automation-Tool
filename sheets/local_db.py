import sqlite3
import json
import os
import uuid
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'jobs.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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
    
    conn.commit()
    conn.close()

def save_job(job_data):
    conn = get_connection()
    cursor = conn.cursor()
    
    job_id = job_data.get('id') or str(uuid.uuid4())
    skills = job_data.get('skills', [])
    if isinstance(skills, list):
        skills_str = json.dumps(skills)
    else:
        skills_str = str(skills)
        
    cursor.execute('''
        INSERT OR REPLACE INTO jobs (
            id, title, company, location, source, job_url, 
            company_url, career_page_url, description, role_type, 
            experience_level, skills, match_score, status, 
            applied_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        job_id,
        job_data.get('title', 'Unknown Role'),
        job_data.get('company', 'Unknown Company'),
        job_data.get('location', ''),
        job_data.get('source', 'Manual'),
        job_data.get('job_url', ''),
        job_data.get('company_url', ''),
        job_data.get('career_page_url', ''),
        job_data.get('description', ''),
        job_data.get('role_type', ''),
        job_data.get('experience_level', ''),
        skills_str,
        job_data.get('match_score', 0.0),
        job_data.get('status', 'Wishlist'),
        job_data.get('applied_date', ''),
        job_data.get('notes', '')
    ))
    
    conn.commit()
    conn.close()
    return job_id

def save_jobs_batch(jobs_list):
    saved_ids = []
    for job in jobs_list:
        jid = save_job(job)
        saved_ids.append(jid)
    return saved_ids

def get_all_jobs(status=None, search=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM jobs WHERE 1=1"
    params = []
    
    if status and status != 'All':
        query += " AND status = ?"
        params.append(status)
        
    if search:
        query += " AND (title LIKE ? OR company LIKE ? OR skills LIKE ? OR location LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])
        
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

def get_user_profile():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT profile_data FROM user_profile WHERE id = 'default'")
    row = cursor.fetchone()
    conn.close()
    if row and row['profile_data']:
        try:
            return json.loads(row['profile_data'])
        except Exception:
            pass
            
    # Fallback to default_profile.json
    default_json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'latex', 'default_profile.json')
    if os.path.exists(default_json_path):
        try:
            with open(default_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                save_user_profile(data)
                return data
        except Exception:
            pass
    return None

def save_user_profile(profile_dict):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO user_profile (id, profile_data, updated_at)
        VALUES ('default', ?, CURRENT_TIMESTAMP)
    ''', (json.dumps(profile_dict),))
    conn.commit()
    conn.close()
    return True

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

# Initialize on module load
init_db()
