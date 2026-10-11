def analyze_jd(jd_text):
    prompt = f"""
    Extract structured data from this job description.

    Return ONLY JSON:

    {{
      "role": "",
      "skills": ["", ""],
      "keywords": ["", ""],
      "experience_level": ""
    }}

    Job Description:
    {jd_text}
    """

    response = model.generate_content(prompt)
    return response.text