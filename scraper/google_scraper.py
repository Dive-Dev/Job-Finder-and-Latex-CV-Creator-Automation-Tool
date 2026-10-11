import re
import urllib.parse
import uuid
import requests
from bs4 import BeautifulSoup
from scraper.company_scraper import find_company_career_site

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def build_google_job_query(role, location, preferences=None):
    """
    Builds an optimized Google dork / job search query.
    """
    preferences = preferences or {}
    exp = preferences.get('experience', '')
    work_type = preferences.get('work_type', '')
    keywords = preferences.get('keywords', '')
    ats_only = preferences.get('ats_only', False)
    
    parts = []
    
    if role:
        parts.append(f'"{role}"')
        
    if location:
        if location.lower() == 'remote':
            parts.append('"remote"')
        else:
            parts.append(f'"{location}"')
            
    if work_type and work_type.lower() != 'any' and work_type.lower() != 'remote':
        parts.append(f'"{work_type}"')
        
    if exp:
        parts.append(f'"{exp}"')
        
    if keywords:
        for kw in [k.strip() for k in keywords.split(',') if k.strip()]:
            parts.append(f'"{kw}"')
            
    if ats_only:
        ats_dork = '(site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com OR site:myworkdayjobs.com OR site:apply.workable.com)'
        parts.append(ats_dork)
    else:
        parts.append('("careers" OR "jobs" OR "apply" OR "job opening")')
        # exclude spam aggregator sites to prioritize company career sites
        parts.append('-site:indeed.com -site:ziprecruiter.com')
        
    return " ".join(parts)

def parse_search_results(html_content, role="", location=""):
    soup = BeautifulSoup(html_content, 'html.parser')
    results = []
    
    # Check DuckDuckGo HTML format
    ddg_results = soup.find_all('div', class_='result')
    if ddg_results:
        for item in ddg_results:
            title_elem = item.find('a', class_='result__a')
            snippet_elem = item.find(['a', 'div'], class_='result__snippet')
            url_elem = item.find('a', class_='result__url')
            
            if not title_elem:
                continue
                
            title_text = title_elem.get_text(strip=True)
            snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
            raw_href = title_elem.get('href', '')
            
            # Extract actual URL from DuckDuckGo redirect
            final_url = raw_href
            if 'uddg=' in raw_href:
                m = re.search(r'uddg=([^&]+)', raw_href)
                if m:
                    final_url = urllib.parse.unquote(m.group(1))
                    
            if not final_url.startswith('http'):
                continue
                
            company, clean_title = extract_company_and_role_from_title(title_text, final_url)
            
            # Detect ATS
            ats_provider = "Company Portal"
            if "greenhouse.io" in final_url:
                ats_provider = "Greenhouse"
            elif "lever.co" in final_url:
                ats_provider = "Lever"
            elif "ashbyhq.com" in final_url:
                ats_provider = "Ashby"
            elif "workday" in final_url:
                ats_provider = "Workday"
            elif "workable.com" in final_url:
                ats_provider = "Workable"
                
            results.append({
                "id": f"g-{uuid.uuid4().hex[:8]}",
                "title": clean_title or role or "Job Opportunity",
                "company": company or "Hiring Company",
                "location": location or ("Remote" if "remote" in (title_text + snippet).lower() else "Specified in Posting"),
                "source": f"Google Search ({ats_provider})",
                "job_url": final_url,
                "career_page_url": final_url,
                "company_url": f"https://{urllib.parse.urlparse(final_url).netloc}",
                "ats_provider": ats_provider,
                "description": snippet,
                "status": "Wishlist",
                "skills": extract_skills_heuristic(title_text + " " + snippet)
            })
            
    return results

def extract_company_and_role_from_title(title_text, url):
    """
    Extracts company name and cleaned role from formats like:
    - 'Senior Software Engineer at Stripe'
    - 'Stripe - Senior Software Engineer'
    - 'Senior Software Engineer (Remote) | Greenhouse'
    """
    # 1. Check URL domain / subdomain for company
    domain_company = ""
    try:
        parsed = urllib.parse.urlparse(url)
        netloc = parsed.netloc.lower()
        path = parsed.path.strip('/')
        
        if 'greenhouse.io' in netloc:
            parts = path.split('/')
            if parts and parts[0]:
                domain_company = parts[0].replace('-', ' ').title()
        elif 'lever.co' in netloc:
            parts = path.split('/')
            if parts and parts[0]:
                domain_company = parts[0].replace('-', ' ').title()
        elif 'ashbyhq.com' in netloc:
            parts = path.split('/')
            if parts and parts[0]:
                domain_company = parts[0].replace('-', ' ').title()
        elif 'myworkdayjobs.com' in netloc:
            domain_company = netloc.split('.')[0].replace('-', ' ').title()
    except Exception:
        pass

    clean_title = title_text
    found_company = domain_company
    
    # Strip common site suffixes
    clean_title = re.sub(r'\s*[-|–]\s*(Greenhouse|Lever|Ashby|Workday|Workable|LinkedIn|Careers).*$', '', clean_title, flags=re.I)

    if ' at ' in clean_title:
        parts = clean_title.split(' at ')
        clean_title = parts[0].strip()
        if not found_company:
            found_company = parts[-1].strip()
    elif ' - ' in clean_title:
        parts = clean_title.split(' - ')
        if len(parts) >= 2:
            if not found_company:
                found_company = parts[0].strip()
            clean_title = parts[1].strip()
    elif ' | ' in clean_title:
        parts = clean_title.split(' | ')
        if len(parts) >= 2:
            clean_title = parts[0].strip()
            if not found_company:
                found_company = parts[1].strip()

    if not found_company:
        found_company = domain_company or "Target Company"

    return found_company, clean_title

def extract_skills_heuristic(text):
    common_skills = [
        "Python", "JavaScript", "TypeScript", "React", "Node.js", "Java", "C++", "C#",
        "Golang", "Rust", "SQL", "PostgreSQL", "MongoDB", "AWS", "Azure", "GCP",
        "Docker", "Kubernetes", "Linux", "Git", "REST", "GraphQL", "Machine Learning",
        "Deep Learning", "TensorFlow", "PyTorch", "Tailwind", "Next.js", "Vue", "Angular",
        "FastAPI", "Flask", "Django", "Spring Boot", "DevOps", "CI/CD", "HTML", "CSS"
    ]
    found = []
    text_lower = text.lower()
    for skill in common_skills:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found.append(skill)
    return found[:8]

def search_jobs_google(role, location="", preferences=None, max_results=12):
    """
    Executes a targeted Google/DuckDuckGo search for active job openings,
    direct ATS postings (Greenhouse, Lever, Ashby, Workday), and company career portals.
    """
    query = build_google_job_query(role, location, preferences)
    
    # 1. Primary: Query DuckDuckGo HTML endpoint
    try:
        resp = requests.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query},
            headers=HEADERS,
            timeout=10
        )
        if resp.status_code == 200:
            results = parse_search_results(resp.text, role=role, location=location)
            if results:
                # Enrich with career portals if not already ATS
                for res in results[:max_results]:
                    if res["ats_provider"] == "Company Portal":
                        c_info = find_company_career_site(res["company"])
                        if c_info.get("career_page_url"):
                            res["career_page_url"] = c_info["career_page_url"]
                            res["ats_provider"] = c_info.get("ats_provider", "Company Portal")
                return results[:max_results]
    except Exception as e:
        print(f"Error querying search endpoint: {e}")

    # 2. Secondary fallback: direct Google search query URL generator for 100% guarantee
    google_url = f"https://www.google.com/search?q={urllib.parse.quote(query)}"
    results = [
        {
            "id": f"g-fallback-1",
            "title": f"{role or 'Software Engineer'}",
            "company": "Direct Career Portals (Google ATS Dork)",
            "location": location or "Remote",
            "source": "Google Search Dork",
            "job_url": google_url,
            "career_page_url": google_url,
            "company_url": "",
            "ats_provider": "Google Jobs",
            "description": f"Curated search query targeting direct Greenhouse, Lever, and Ashby postings for '{role}' in '{location}'. Click to explore instant applications.",
            "status": "Wishlist",
            "skills": extract_skills_heuristic(role + " " + str(preferences))
        }
    ]
    return results
