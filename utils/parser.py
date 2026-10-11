import json
import re

def clean_json(response_text):
    """
    Robustly parses JSON from LLM or API responses, stripping markdown blocks,
    preceding text, and trailing explanations.
    """
    if not response_text:
        return {}

    text = response_text.strip()
    
    # Strip markdown code blocks ```json ... ```
    if '```' in text:
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text, re.IGNORECASE)
        if match:
            text = match.group(1).strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except Exception:
        pass

    # Extract outermost JSON object { ... }
    try:
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            return json.loads(match.group(0))
    except Exception:
        pass

    # Extract outermost JSON array [ ... ]
    try:
        match = re.search(r'\[[\s\S]*\]', text)
        if match:
            return json.loads(match.group(0))
    except Exception as e:
        print("JSON parse fallback error:", e)

    return {
        "role": "",
        "skills": [],
        "keywords": [],
        "experience_level": ""
    }