import os
import re
import json
from dotenv import load_dotenv
from utils.parser import clean_json

load_dotenv()

def get_gemini_model():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        # Choose modern model
        try:
            return genai.GenerativeModel("gemini-1.5-flash")
        except Exception:
            return genai.GenerativeModel("gemini-pro")
    except Exception as e:
        print(f"Gemini initialization error: {e}")
        return None

def heuristic_analyze_jd(jd_text):
    """
    High-fidelity offline heuristic analyzer when API key is not yet set.
    """
    text_lower = jd_text.lower()
    
    # Detect Role
    role = "Software Engineer"
    role_patterns = [
        r'(senior|lead|staff|principal|junior|entry-level)?\s*(software engineer|frontend engineer|backend engineer|full stack engineer|data engineer|data scientist|machine learning engineer|devops engineer|cloud engineer|product manager|qa engineer|systems engineer)',
        r'(senior|lead|staff|principal|junior)?\s*(python developer|react developer|java developer|node developer|go developer|mobile developer)'
    ]
    for pat in role_patterns:
        m = re.search(pat, text_lower)
        if m:
            role = m.group(0).strip().title()
            break

    # Detect Experience Level
    exp_level = "Mid Level"
    if any(w in text_lower for w in ["senior", "lead", "staff", "5+ years", "6+ years", "7+ years"]):
        exp_level = "Senior Level (5+ years)"
    elif any(w in text_lower for w in ["junior", "entry level", "graduate", "0-2 years", "1-2 years"]):
        exp_level = "Junior / Entry Level (0-2 years)"
    elif any(w in text_lower for w in ["3+ years", "2-4 years", "mid-level", "mid level"]):
        exp_level = "Mid Level (2-4 years)"

    # Detect Skills
    skill_catalog = [
        "Python", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express",
        "Java", "Spring Boot", "C++", "C#", ".NET", "Golang", "Rust", "PHP", "Ruby on Rails",
        "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux",
        "Git", "REST APIs", "GraphQL", "Microservices", "Kafka", "RabbitMQ",
        "Machine Learning", "PyTorch", "TensorFlow", "Pandas", "Scikit-Learn",
        "Tailwind CSS", "HTML5", "CSS3", "Redux", "Jest", "Pytest", "Agile", "Scrum"
    ]
    found_skills = []
    for skill in skill_catalog:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.append(skill)

    # Keywords
    common_keywords = [
        "Scalability", "System Design", "Cloud Infrastructure", "API Design",
        "Distributed Systems", "Performance Optimization", "Code Review", "Unit Testing",
        "Continuous Deployment", "Problem Solving", "Cross-Functional Collaboration"
    ]
    found_keywords = [kw for kw in common_keywords if any(w in text_lower for w in kw.lower().split())]

    # Responsibilities & Requirements heuristics
    responsibilities = []
    requirements = []
    lines = [l.strip() for l in jd_text.split('\n') if l.strip()]
    
    current_section = None
    for line in lines:
        l_lower = line.lower()
        if any(h in l_lower for h in ["responsibilities", "what you'll do", "what you will do", "the role"]):
            current_section = "resp"
            continue
        elif any(h in l_lower for h in ["requirements", "qualifications", "what you bring", "what we're looking for"]):
            current_section = "req"
            continue
        elif any(h in l_lower for h in ["about us", "benefits", "compensation", "about the team"]):
            current_section = None

        if line.startswith(('-', '•', '*', '–')) or (line[0].isdigit() and line[1] in ('.', ')')):
            clean_item = re.sub(r'^[-•*–\d.)\s]+', '', line).strip()
            if len(clean_item) > 15:
                if current_section == "resp" and len(responsibilities) < 6:
                    responsibilities.append(clean_item)
                elif current_section == "req" and len(requirements) < 6:
                    requirements.append(clean_item)

    return {
        "role": role,
        "experience_level": exp_level,
        "skills": found_skills if found_skills else ["Python", "Problem Solving", "Git"],
        "keywords": found_keywords if found_keywords else ["System Architecture", "API Integration"],
        "responsibilities": responsibilities if responsibilities else ["Design and build scalable software features.", "Collaborate with cross-functional product and engineering teams."],
        "requirements": requirements if requirements else ["Relevant experience in modern software engineering.", "Solid foundation in data structures and problem solving."],
        "summary": f"Targeting {role} with focus on {', '.join(found_skills[:4]) if found_skills else 'software engineering'}.",
        "ai_powered": False
    }

def analyze_jd(jd_text):
    """
    Analyzes job description using the configured Local LLM (Ollama / LM Studio)
    or Gemini, and falls back gracefully to offline heuristic analyzer.
    """
    if not jd_text or not jd_text.strip():
        return {
            "role": "General Developer",
            "experience_level": "Mid Level",
            "skills": [],
            "keywords": [],
            "responsibilities": [],
            "requirements": [],
            "summary": "No job description text provided.",
            "ai_powered": False
        }

    from ai.local_llm import query_llm

    prompt = f"""
    You are an expert ATS (Applicant Tracking System) and Senior Technical Recruiter.
    Extract deep structured data from the following job description.

    Return ONLY raw JSON with no Markdown backticks:
    {{
      "role": "Exact or standard job title",
      "company": "Company name if mentioned, otherwise empty string",
      "experience_level": "e.g. Junior / Mid / Senior (X years)",
      "skills": ["Skill1", "Skill2", "Skill3"],
      "keywords": ["ATS Keyword 1", "ATS Keyword 2"],
      "responsibilities": ["Key responsibility 1", "Key responsibility 2"],
      "requirements": ["Key requirement 1", "Key requirement 2"],
      "salary_range": "e.g. Not Disclosed",
      "summary": "Concise 2-sentence executive summary of what this role seeks"
    }}

    Job Description:
    {jd_text[:4000]}
    """

    system_prompt = "You are an expert ATS parser and resume optimizer. Always return valid raw JSON only."

    try:
        llm_res = query_llm(prompt, system_prompt=system_prompt, json_mode=True)
        if llm_res.get("success") and llm_res.get("text"):
            parsed = clean_json(llm_res["text"])
            if parsed and parsed.get("role"):
                parsed["ai_powered"] = True
                parsed["model"] = llm_res.get("model", "local-model")
                parsed["provider"] = llm_res.get("provider", "local")
                return parsed
    except Exception as e:
        print(f"Local LLM analyze error: {e}")

    # Fallback to high-fidelity offline heuristic
    fallback = heuristic_analyze_jd(jd_text)
    fallback["note"] = "Processed using built-in ATS heuristics (Local Model offline)."
    return fallback

def extract_skills_heuristic(text):
    """Convenience helper extracting skills from raw text using heuristic catalog."""
    if not text:
        return []
    res = heuristic_analyze_jd(text)
    return res.get("skills", [])