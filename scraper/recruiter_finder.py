import re
import urllib.parse
import uuid
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def predict_company_email_patterns(company_name, company_domain=""):
    """
    Predicts standard enterprise email patterns for a company.
    e.g., first.last@company.com, first@company.com
    """
    if not company_domain:
        clean = re.sub(r'[^a-zA-Z0-9]', '', company_name.lower())
        company_domain = f"{clean}.com"
    else:
        company_domain = company_domain.replace('https://', '').replace('http://', '').strip('/').split('/')[0]
        if company_domain.startswith('www.'):
            company_domain = company_domain[4:]

    return {
        "domain": company_domain,
        "common_formats": [
            f"{{first}}.{{last}}@{company_domain}",
            f"{{first}}@{company_domain}",
            f"{{first}}{{last}}@{company_domain}",
            f"{{f}}{{last}}@{company_domain}"
        ],
        "example": f"john.doe@{company_domain}"
    }

def build_recruiter_search_query(company, contact_type="all", location=""):
    """
    Constructs LinkedIn X-ray search dork queries for HR, Recruiters, Managers, or Employees.
    """
    base = f'site:linkedin.com/in/ "{company}"'
    
    role_dorks = {
        "recruiters": '("Technical Recruiter" OR "Talent Acquisition" OR "Recruiter" OR "Head of Talent" OR "HR Manager" OR "People Operations")',
        "managers": '("Engineering Manager" OR "Director of Engineering" OR "Head of Engineering" OR "VP of Engineering" OR "Software Engineering Manager" OR "Tech Lead")',
        "employees": '("Senior Software Engineer" OR "Software Engineer" OR "Staff Engineer" OR "Developer" OR "Alumni")',
        "all": '("Technical Recruiter" OR "Talent Acquisition" OR "Engineering Manager" OR "Head of Engineering" OR "Senior Software Engineer")'
    }
    
    selected_role = role_dorks.get(contact_type, role_dorks["all"])
    query_parts = [base, selected_role]
    
    if location:
        loc_lower = location.lower()
        if "bengaluru" in loc_lower or "bangalore" in loc_lower or "karnataka" in loc_lower:
            query_parts.append('("Bengaluru" OR "Bangalore" OR "Karnataka")')
        elif loc_lower != 'remote':
            query_parts.append(f'"{location}"')
        
    return " ".join(query_parts)

def parse_linkedin_profiles(html_content, company_name, domain=""):
    soup = BeautifulSoup(html_content, 'html.parser')
    results = []
    seen_urls = set()

    email_meta = predict_company_email_patterns(company_name, domain)
    target_domain = email_meta["domain"]

    items = soup.find_all('div', class_='result')
    for item in items:
        title_elem = item.find('a', class_='result__a')
        snippet_elem = item.find(['a', 'div'], class_='result__snippet')
        
        if not title_elem:
            continue
            
        title_text = title_elem.get_text(strip=True)
        snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
        raw_href = title_elem.get('href', '')
        
        # Extract actual LinkedIn URL
        profile_url = raw_href
        if 'uddg=' in raw_href:
            m = re.search(r'uddg=([^&]+)', raw_href)
            if m:
                profile_url = urllib.parse.unquote(m.group(1))

        if "linkedin.com/in/" not in profile_url or profile_url in seen_urls:
            continue
            
        seen_urls.add(profile_url)

        # Parse Name and Title from Google/DuckDuckGo title
        # Format usually: "Jane Doe - Senior Technical Recruiter - Stripe | LinkedIn"
        clean_title = re.sub(r'\s*[-|–]\s*LinkedIn.*$', '', title_text, flags=re.I).strip()
        parts = re.split(r'\s*[-|–]\s*', clean_title)

        name = "Professional"
        headline = clean_title
        if len(parts) >= 2:
            name = parts[0].strip()
            headline = " - ".join(parts[1:]).strip()
        elif len(parts) == 1:
            name = parts[0].strip()

        # Categorize role
        role_category = "Employee / Team Member"
        h_lower = (headline + " " + snippet).lower()
        if any(w in h_lower for w in ["recruiter", "talent acquisition", "hr manager", "people ops", "sourcer"]):
            role_category = "Recruiter / HR"
        elif any(w in h_lower for w in ["engineering manager", "director of engineering", "head of engineering", "vp of engineering"]):
            role_category = "Hiring Manager / Eng Lead"

        # Predict email
        name_tokens = re.sub(r'[^a-zA-Z\s]', '', name).strip().split()
        predicted_email = ""
        if len(name_tokens) >= 2:
            first = name_tokens[0].lower()
            last = name_tokens[-1].lower()
            predicted_email = f"{first}.{last}@{target_domain}"
        elif len(name_tokens) == 1:
            predicted_email = f"{name_tokens[0].lower()}@{target_domain}"

        results.append({
            "id": f"c-{uuid.uuid4().hex[:8]}",
            "name": name,
            "headline": headline,
            "role_category": role_category,
            "company": company_name,
            "profile_url": profile_url,
            "predicted_email": predicted_email,
            "snippet": snippet,
            "email_domain": target_domain
        })

    return results

def search_company_contacts(company_name, contact_type="all", location="", domain="", max_results=10):
    """
    Searches for recruiters, hiring managers, and employees for referrals at a specific company.
    """
    if not company_name:
        return []

    query = build_recruiter_search_query(company_name, contact_type=contact_type, location=location)

    # 1. Primary: DuckDuckGo HTML endpoint for LinkedIn X-ray search
    try:
        resp = requests.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query},
            headers=HEADERS,
            timeout=10
        )
        if resp.status_code == 200:
            contacts = parse_linkedin_profiles(resp.text, company_name, domain)
            if contacts:
                return contacts[:max_results]
    except Exception as e:
        print(f"Error querying recruiter search endpoint: {e}")

    # 2. Fallback: Provide direct clickable LinkedIn search link & sample template
    clean_company = urllib.parse.quote(company_name)
    linkedin_people_url = f"https://www.linkedin.com/search/results/people/?keywords={clean_company}%20recruiter"

    email_meta = predict_company_email_patterns(company_name, domain)

    return [
        {
            "id": "c-direct-search",
            "name": f"{company_name} Recruiting Team",
            "headline": f"Talent Acquisition & Technical Recruiting at {company_name}",
            "role_category": "Recruiter / HR",
            "company": company_name,
            "profile_url": linkedin_people_url,
            "predicted_email": email_meta["example"],
            "snippet": f"Explore live verified recruiters and engineering team members on LinkedIn for {company_name}.",
            "email_domain": email_meta["domain"],
            "is_search_hub": True
        }
    ]
