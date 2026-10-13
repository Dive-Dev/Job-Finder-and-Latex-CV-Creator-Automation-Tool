"""
Job Skill Engine for JobPulse AI & Local LLM
Provides specialized career strategy, ATS keyword optimization, STAR resume tailoring,
recruiter pitch generation, and role-specific interview preparation using Ollama, LM Studio, or Gemini.
"""

import json
from ai.local_llm import query_llm
from utils.parser import clean_json

JOB_SYSTEM_PROMPT = """You are an Executive Career Strategist, ATS Algorithm Specialist, and Technical Talent Acquisition Leader.
You have placed candidates at Google, Meta, Amazon, Stripe, and top venture-backed startups.
Your core expertise:
- Parsing complex job descriptions for hidden qualifiers, level benchmarks, and culture indicators
- Crafting high-converting STAR / Google XYZ resume bullet points: "Accomplished [X] as measured by [Y] by doing [Z]"
- Beating modern ATS scanners (Greenhouse, Lever, Workday) with 95%+ keyword alignment without keyword-stuffing
- Writing personalized, high-response LinkedIn referral pitches and cold outreach messages
- Engineering interview preparation packs (behavioral, leadership principles, systems design, hiring manager questions)
"""

def tailor_star_bullets(candidate_experience, job_data=None, role_title="", target_role=None, key_skills=None):
    """
    Transforms candidate experience bullets into high-impact Google XYZ / STAR formula bullets
    tailored specifically for the target job requirements.
    """
    if job_data is None:
        job_data = {}
    if target_role:
        role_title = target_role
    if key_skills and isinstance(job_data, dict) and not job_data.get('skills'):
        job_data['skills'] = key_skills

    prompt = f"""
    Target Role: {role_title or job_data.get('title', 'Senior Software Engineer')}
    Company: {job_data.get('company', 'Target Company')}
    Job Description Snippet: {job_data.get('description', '')[:1200]}
    Required Skills: {', '.join(job_data.get('skills', [])) if isinstance(job_data.get('skills'), list) else job_data.get('skills', '')}

    Candidate Experience to Tailor:
    {json.dumps(candidate_experience, indent=2) if isinstance(candidate_experience, (dict, list)) else candidate_experience}

    Instructions:
    1. Rewrite work experience bullets to incorporate key target technologies and domain verbs.
    2. Quantify achievements (latency reduction %, throughput scale, revenue impact, cost savings, user scale).
    3. Strictly adhere to Google XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]".
    4. Return ONLY valid JSON array with the tailored experience:
    [
      {{
        "company": "...",
        "role": "...",
        "location": "...",
        "dates": "...",
        "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"]
      }}
    ]
    """
    res = query_llm(prompt, system_prompt=JOB_SYSTEM_PROMPT, json_mode=True)
    try:
        parsed = clean_json(res.get("text", ""))
        return {"success": True, "tailored_experience": parsed}
    except Exception:
        return {"success": res.get("success", False), "raw_text": res.get("text", "")}

def deep_jd_analysis(jd_text):
    """
    Performs deep analysis of a job description: extracts core responsibilities,
    must-have skills, nice-to-have skills, seniority level, red flags, and interview tips.
    """
    prompt = f"""
    Analyze this Job Description:
    ```
    {jd_text}
    ```

    Extract and return as JSON:
    {{
      "role": "<canonical title>",
      "seniority_level": "<Junior / Mid / Senior / Staff / Principal / Lead>",
      "core_technologies": [<list of mandatory technologies>],
      "secondary_skills": [<list of nice-to-have skills>],
      "responsibilities": [<key job duties>],
      "hidden_qualifiers": [<unwritten expectations, scale, domain experience>],
      "interview_focus_areas": [<what the interview loop will emphasize>],
      "culture_and_work_style": "<summary of team culture and expectations>"
    }}
    """
    res = query_llm(prompt, system_prompt=JOB_SYSTEM_PROMPT, json_mode=True)
    try:
        parsed = clean_json(res.get("text", ""))
        return {"success": True, "analysis": parsed}
    except Exception:
        return {"success": res.get("success", False), "raw_text": res.get("text", "")}

def craft_recruiter_pitch(candidate_profile=None, job_data=None, contact_name="", pitch_type="referral", pitch_style="balanced"):
    """
    Drafts high-converting, personalized outreach messages for recruiters, hiring managers, or alumni.
    """
    candidate_profile = candidate_profile or {}
    job_data = job_data or {}
    prompt = f"""
    Candidate Profile:
    Name: {candidate_profile.get('name', 'Candidate')}
    Current Title: {candidate_profile.get('title', 'Software Engineer')}
    Core Skills: {', '.join(candidate_profile.get('skills', {}).get('Languages', [])) if isinstance(candidate_profile.get('skills'), dict) else str(candidate_profile.get('skills', ''))}
    Summary: {candidate_profile.get('summary', '')}

    Target Opportunity:
    Role: {job_data.get('title', 'Software Engineer')}
    Company: {job_data.get('company', 'Target Company')}
    Contact Name: {contact_name or 'Hiring Manager'}
    Outreach Type: {pitch_type} (Style: {pitch_style})

    Generate 3 distinct variations:
    1. Short & Punchy LinkedIn InMail (< 85 words)
    2. Warm Referral Pitch for Employee / Alumni
    3. High-Impact Direct Email with Subject Line & Value Proposition
    """
    return query_llm(prompt, system_prompt=JOB_SYSTEM_PROMPT)

def generate_interview_prep_pack(candidate_profile=None, job_data=None):
    """
    Generates an interview preparation pack with behavioral, technical, and company-specific questions.
    """
    candidate_profile = candidate_profile or {}
    job_data = job_data or {}
    prompt = f"""
    Candidate: {candidate_profile.get('name', 'Candidate')} ({candidate_profile.get('title', 'Engineer')})
    Target Role: {job_data.get('title', 'Software Engineer')} @ {job_data.get('company', 'Tech Company')}
    JD Details: {job_data.get('description', '')[:1000]}

    Create an end-to-end Interview Preparation Pack:
    1. 3 Role-Specific Technical Scenario Questions with model architectural answers
    2. 3 Behavioral / Leadership Questions with STAR frameworks tailored to candidate
    3. 5 High-Value Questions to ask the Engineering Director / Hiring Manager
    4. Key Talking Points to highlight during the introductory pitch
    """
    return query_llm(prompt, system_prompt=JOB_SYSTEM_PROMPT)

def evaluate_growth_trajectory(candidate_profile=None, job_data=None):
    """
    Analyzes career velocity, growth leap, compensation leverage, and seniority step-up.
    """
    candidate_profile = candidate_profile or {}
    job_data = job_data or {}
    prompt = f"""
    Evaluate Career Growth Alignment:

    Candidate: {candidate_profile.get('name', 'Candidate')}
    Current Level / Title: {candidate_profile.get('title', 'Engineer')}
    Years of Experience: ~{candidate_profile.get('persona', {}).get('total_experience_years', 5)} years

    Target Role: {job_data.get('title', 'Role')} @ {job_data.get('company', 'Company')}

    Return JSON:
    {{
      "growth_fit": "<Target Fit | Stretch / Growth | Leadership | Foundation>",
      "growth_score": <integer 0-100>,
      "seniority_leap_analysis": "<analysis of the title/responsibility progression>",
      "leverage_points": [<why candidate has strong leverage>],
      "risks_or_objections": [<potential objections from hiring team>],
      "counter_arguments": [<how candidate should address them in interviews>]
    }}
    """
    res = query_llm(prompt, system_prompt=JOB_SYSTEM_PROMPT, json_mode=True)
    try:
        parsed = clean_json(res.get("text", ""))
        return {"success": True, "growth_evaluation": parsed}
    except Exception:
        return {"success": res.get("success", False), "raw_text": res.get("text", "")}
