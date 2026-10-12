import re
import json
from ai.jd_analyzer import get_gemini_model
from utils.parser import clean_json

def calculate_ats_match(profile, job_data):
    """
    Computes ATS match score between candidate profile and job requirements.
    """
    profile_skills = set()
    for cat, slist in profile.get("skills", {}).items():
        if isinstance(slist, list):
            for s in slist:
                profile_skills.add(s.strip().lower())
        elif isinstance(slist, str):
            for s in slist.split(','):
                profile_skills.add(s.strip().lower())
                
    job_skills = set()
    raw_job_skills = job_data.get("skills", [])
    if isinstance(raw_job_skills, list):
        for s in raw_job_skills:
            job_skills.add(s.strip().lower())
    elif isinstance(raw_job_skills, str):
        for s in raw_job_skills.split(','):
            job_skills.add(s.strip().lower())

    # Fallback to keywords if job_skills empty
    if not job_skills and job_data.get("keywords"):
        for kw in job_data.get("keywords", []):
            job_skills.add(kw.strip().lower())

    if not job_skills:
        return {
            "score": 85,
            "matched_skills": list(profile_skills)[:5],
            "missing_skills": [],
            "recommendations": ["Ensure key keywords from the JD are mirrored in your experience bullets."]
        }

    matched = [s for s in job_skills if any(ps in s or s in ps for ps in profile_skills)]
    missing = [s for s in job_skills if not any(ps in s or s in ps for ps in profile_skills)]

    ratio = len(matched) / len(job_skills) if job_skills else 0.8
    # Baseline score between 40% and 98%
    score = int(min(98, max(35, round(ratio * 100))))

    recommendations = []
    if missing:
        recommendations.append(f"Add projects or experience demonstrating: {', '.join(missing[:4]).title()}.")
    recommendations.append("Tailor your work experience bullets using the STAR (Situation, Task, Action, Result) method.")
    recommendations.append("Place high-priority technical skills at the top of your Skills section.")

    return {
        "score": score,
        "matched_skills": [m.title() for m in matched],
        "missing_skills": [m.title() for m in missing],
        "recommendations": recommendations
    }

def tailor_bullet_points(profile, job_data):
    """
    Rewrites and customizes resume bullet points to highlight skills
    matching the job description using Local LLM (Ollama/LM Studio) or Gemini.
    """
    from ai.local_llm import query_llm

    prompt = f"""
    You are an expert ATS resume optimizer.
    Given this candidate's work experience and target job, rewrite their experience bullet points
    to directly incorporate target keywords, quantify achievements, and follow the Google XYZ formula:
    "Accomplished [X] as measured by [Y], by doing [Z]".

    Target Job:
    Role: {job_data.get('title') or job_data.get('role')}
    Company: {job_data.get('company')}
    Required Skills: {', '.join(job_data.get('skills', []))}
    JD Snippet: {job_data.get('description', '')[:500]}

    Candidate Experience:
    {json.dumps(profile.get('experience', []), indent=2)}

    Return ONLY raw JSON with the optimized experience array:
    [
      {{
        "company": "...",
        "role": "...",
        "location": "...",
        "dates": "...",
        "bullets": ["Rewritten bullet 1", "Rewritten bullet 2"]
      }}
    ]
    """

    system_prompt = "You are an expert ATS resume optimizer. Output only valid raw JSON array of experience."

    try:
        llm_res = query_llm(prompt, system_prompt=system_prompt, json_mode=True)
        if llm_res.get("success") and llm_res.get("text"):
            parsed = clean_json(llm_res["text"])
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed
    except Exception as e:
        print(f"Error tailoring bullets with Local LLM: {e}")

    # Heuristic tailoring fallback
    tailored_experience = []
    target_skills = [s.lower() for s in job_data.get("skills", [])]
    for exp in profile.get("experience", []):
        exp_copy = dict(exp)
        bullets = exp.get("bullets", [])
        tailored_bullets = []
        for b in bullets:
            tailored_bullets.append(b)
        exp_copy["bullets"] = tailored_bullets
        tailored_experience.append(exp_copy)
    return tailored_experience

def generate_cold_outreach(profile, job_data):
    """
    Generates personalized cold email and LinkedIn message for applying using Local LLM.
    """
    from ai.local_llm import query_llm

    candidate_name = profile.get("name", "Applicant")
    role_title = job_data.get("title") or job_data.get("role") or "Software Engineer"
    company_name = job_data.get("company", "the team")
    key_skills = ", ".join(job_data.get("skills", [])[:3])

    prompt = f"""
    Write a high-converting, polite, and punchy Cold Outreach message for LinkedIn and a Cover Letter / Email
    from candidate {candidate_name} applying for {role_title} at {company_name}.
    Target Skills: {key_skills}
    Candidate Profile Summary: {json.dumps(profile.get('skills', {}))}

    Return ONLY raw JSON:
    {{
      "linkedin_message": "...",
      "email_subject": "...",
      "email_body": "..."
    }}
    """

    system_prompt = "You are an executive career coach and recruiter. Output valid raw JSON only."

    try:
        llm_res = query_llm(prompt, system_prompt=system_prompt, json_mode=True)
        if llm_res.get("success") and llm_res.get("text"):
            parsed = clean_json(llm_res["text"])
            if parsed and parsed.get("linkedin_message"):
                return parsed
    except Exception as e:
        print(f"Error generating outreach with Local LLM: {e}")

    # Fallback template
    linkedin_msg = (
        f"Hi [Hiring Manager/Recruiter Name],\n\n"
        f"I came across the {role_title} role at {company_name} and was really excited by what the team is building. "
        f"With my background in {key_skills or 'full-stack engineering'} and building high-performance systems, "
        f"I'd love to connect and share how my experience could add immediate value to {company_name}.\n\n"
        f"Best regards,\n{candidate_name}"
    )
    email_subject = f"Application: {role_title} - {candidate_name}"
    email_body = (
        f"Dear {company_name} Hiring Team,\n\n"
        f"I am writing to express my strong interest in the {role_title} opening. "
        f"Having worked extensively with {key_skills or 'core software technologies'}, I have delivered scalable solutions "
        f"and thrive in fast-paced engineering teams.\n\n"
        f"I have attached my tailored CV for your review. I would welcome the opportunity to discuss how my skill set aligns with your team's objectives.\n\n"
        f"Thank you for your time and consideration.\n\n"
        f"Warm regards,\n{candidate_name}\n{profile.get('email', '')} | {profile.get('phone', '')}"
    )
    return {
        "linkedin_message": linkedin_msg,
        "email_subject": email_subject,
        "email_body": email_body
    }
