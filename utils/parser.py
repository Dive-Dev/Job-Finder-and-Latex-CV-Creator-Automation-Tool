import json
import re

def clean_json(response_text):
    try:
        # extract JSON block
        match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print("JSON parse error:", e)

    return {
        "role": "",
        "skills": [],
        "keywords": [],
        "experience_level": ""
    }