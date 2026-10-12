import re
import json
from ai.jd_analyzer import get_gemini_model
from utils.parser import clean_json

def generate_personalized_referral_outreach(
    contact_name,
    contact_role,
    company_name,
    target_role="Software Engineer",
    candidate_profile=None,
    outreach_type="referral",  # 'referral', 'recruiter', 'manager', 'follow_up'
    job_id_or_link=""
):
    """
    Generates high-converting personalized messages:
    1. Short LinkedIn Connection Note (< 300 characters, strict LinkedIn limit)
    2. Full InMail / Email Draft with subject line
    """
    candidate_profile = candidate_profile or {}
    c_name = candidate_profile.get("name", "Applicant")
    c_skills = ", ".join(list(candidate_profile.get("skills", {}).get("Languages", []))[:3]) if isinstance(candidate_profile.get("skills"), dict) else "Software Engineering"
    portfolio = candidate_profile.get("portfolio") or candidate_profile.get("github") or ""
    contact_first = contact_name.split()[0] if contact_name else "there"

    from ai.local_llm import query_llm

    prompt = f"""
    You are a top career coach and networking specialist.
    Write two personalized, polite, and persuasive outreach messages for a job seeker reaching out to an industry contact.

    Candidate Name: {c_name}
    Key Skills: {c_skills}
    Portfolio/GitHub: {portfolio}
    Target Role: {target_role}
    Company: {company_name}
    Target Contact Name: {contact_name} ({contact_role})
    Outreach Type: {outreach_type} (options: 'referral' to employee, 'recruiter' to HR, 'manager' to engineering lead, 'follow_up')
    Job Link/ID: {job_id_or_link}

    Requirements:
    1. "connection_note": STRICTLY under 290 characters (must fit in LinkedIn's 300-char free connection request note). Friendly, respectful, mentions company and role.
    2. "email_subject": Punchy subject line.
    3. "full_message": 3 short paragraphs. Clear value proposition, zero fluff, specific low-friction call-to-action (e.g., asking for 5-minute chat or referral).

    Return ONLY raw JSON with no Markdown backticks:
    {{
      "connection_note": "...",
      "email_subject": "...",
      "full_message": "..."
    }}
    """

    system_prompt = "You are a professional networking strategist. Always output valid raw JSON only."

    try:
        llm_res = query_llm(prompt, system_prompt=system_prompt, json_mode=True)
        if llm_res.get("success") and llm_res.get("text"):
            parsed = clean_json(llm_res["text"])
            if parsed.get("connection_note") and parsed.get("full_message"):
                return parsed
    except Exception as e:
        print(f"Local LLM referral generation fallback: {e}")

    # High-converting heuristic templates
    if outreach_type == "referral":
        # Outreach to team member for an internal referral
        conn_note = f"Hi {contact_first}, I'm an engineer passionate about {company_name}'s mission. I saw the {target_role} opening and would love to connect and learn about your experience on the team!"
        if len(conn_note) > 295:
            conn_note = conn_note[:292] + "..."
            
        subject = f"{c_name} - Quick question regarding {target_role} at {company_name}"
        full_msg = (
            f"Hi {contact_first},\n\n"
            f"I hope you're having a great week! I came across your profile while researching {company_name}'s engineering team, and was really impressed by the work your group is doing.\n\n"
            f"I recently applied for the {target_role} role ({job_id_or_link or 'via career portal'}). With my background in {c_skills} and building scalable applications, I believe I could make an immediate contribution to the team.\n\n"
            f"Would you be open to a quick 5-minute chat about your experience at {company_name}, or potentially submitting an internal referral if my profile looks like a good fit? I have attached my resume and projects ({portfolio or 'available on request'}).\n\n"
            f"Thanks so much for your time,\n{c_name}"
        )

    elif outreach_type == "recruiter":
        # Outreach to HR / Recruiter
        conn_note = f"Hi {contact_first}, I recently applied for the {target_role} role at {company_name}. I'd love to connect and follow up on the status of my application!"
        if len(conn_note) > 295:
            conn_note = conn_note[:292] + "..."

        subject = f"Application Follow-up: {target_role} - {c_name}"
        full_msg = (
            f"Dear {contact_first},\n\n"
            f"I hope this note finds you well. I noticed you lead talent acquisition at {company_name} and wanted to reach out regarding the {target_role} position.\n\n"
            f"I have submitted my formal application through your portal. Over the past few years, I've specialized in {c_skills}, delivering high-impact features and reliable systems that match what your team is looking for.\n\n"
            f"I would appreciate 5–10 minutes to discuss how my skill set aligns with your hiring goals for this quarter. I've attached my tailored resume for your review.\n\n"
            f"Thank you for your consideration,\n{c_name}\n{candidate_profile.get('email', '')} | {candidate_profile.get('phone', '')}"
        )

    elif outreach_type == "manager":
        # Outreach to Hiring Manager / Engineering Director
        conn_note = f"Hi {contact_first}, I admire your engineering leadership at {company_name}. I'm an engineer specializing in {c_skills} interested in the {target_role} opening!"
        if len(conn_note) > 295:
            conn_note = conn_note[:292] + "..."

        subject = f"{target_role} Opening on your team at {company_name} - {c_name}"
        full_msg = (
            f"Hi {contact_first},\n\n"
            f"I came across the {target_role} opening on your team at {company_name} and wanted to reach out directly.\n\n"
            f"Having spent significant time building systems with {c_skills}, I thrive tackling complex technical challenges and driving code quality. You can check out some of my recent work at {portfolio or 'my portfolio'}.\n\n"
            f"I would welcome the opportunity to learn more about your team's current technical priorities and discuss how my experience could help achieve them.\n\n"
            f"Best regards,\n{c_name}"
        )

    else:
        # Follow-up
        conn_note = f"Hi {contact_first}, just following up regarding the {target_role} role at {company_name}. Hope you're having a productive week!"
        subject = f"Re: Quick follow-up on {target_role} - {c_name}"
        full_msg = (
            f"Hi {contact_first},\n\n"
            f"I wanted to follow up briefly on my previous message regarding the {target_role} opening at {company_name}.\n\n"
            f"I understand you have a busy schedule, but if the position is still open, I remain very enthusiastic about the opportunity to contribute to your team.\n\n"
            f"Looking forward to hearing from you,\n{c_name}"
        )

    return {
        "connection_note": conn_note,
        "email_subject": subject,
        "full_message": full_msg
    }
