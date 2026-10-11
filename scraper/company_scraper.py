import re
import urllib.parse
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def clean_company_name(name):
    if not name:
        return ""
    # remove legal entities like Inc, LLC, Ltd, Corp, Technologies, Solutions
    cleaned = re.sub(r'\b(Inc\.?|LLC\.?|Ltd\.?|Corp\.?|Corporation|Technologies|Tech|Co\.?|Pvt\.?)\b', '', name, flags=re.I)
    cleaned = re.sub(r'[^a-zA-Z0-9\s-]', '', cleaned).strip()
    return cleaned if cleaned else name.strip()

def find_company_career_site(company_name, company_website=""):
    """
    Given a company name and optional website, finds the official careers portal,
    detecting common ATS platforms (Greenhouse, Lever, Ashby, Workday, etc.)
    and standard career pages (/careers, /jobs).
    """
    clean_name = clean_company_name(company_name)
    slug = re.sub(r'\s+', '', clean_name.lower())
    dash_slug = re.sub(r'\s+', '-', clean_name.lower())
    
    result = {
        "company": company_name,
        "official_site": company_website,
        "career_page_url": "",
        "ats_provider": "Unknown",
        "careers_links_found": []
    }

    # 1. Check known high-probability ATS endpoints if slug exists
    ats_candidates = [
        (f"https://jobs.lever.co/{dash_slug}", "Lever"),
        (f"https://boards.greenhouse.io/{dash_slug}", "Greenhouse"),
        (f"https://boards.greenhouse.io/{slug}", "Greenhouse"),
        (f"https://jobs.ashbyhq.com/{dash_slug}", "Ashby"),
        (f"https://apply.workable.com/{dash_slug}/", "Workable"),
    ]

    for url, ats_name in ats_candidates:
        try:
            r = requests.head(url, headers=HEADERS, timeout=4, allow_redirects=True)
            if r.status_code == 200 and "not found" not in r.url.lower():
                result["career_page_url"] = r.url
                result["ats_provider"] = ats_name
                result["careers_links_found"].append(r.url)
                return result
        except Exception:
            continue

    # 2. If company website is provided, inspect it for career links
    if company_website:
        try:
            if not company_website.startswith('http'):
                company_website = 'https://' + company_website
            result["official_site"] = company_website
            
            # Check standard subpaths
            subpaths = ["/careers", "/jobs", "/about/careers", "/join-us", "/work-with-us"]
            base = company_website.rstrip('/')
            for sp in subpaths:
                test_url = base + sp
                try:
                    r = requests.get(test_url, headers=HEADERS, timeout=4, allow_redirects=True)
                    if r.status_code == 200:
                        result["career_page_url"] = r.url
                        result["ats_provider"] = "Direct Portal"
                        result["careers_links_found"].append(r.url)
                        return result
                except Exception:
                    continue
        except Exception:
            pass

    # 3. Fallback search via DuckDuckGo HTML endpoint to locate careers page
    query = f"{company_name} careers jobs official site"
    try:
        search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        resp = requests.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query},
            headers=HEADERS,
            timeout=6
        )
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            links = soup.find_all('a', class_='result__url')
            for a in links:
                raw_href = a.get('href', '').strip()
                # DuckDuckGo redirect link extraction
                if 'uddg=' in raw_href:
                    match = re.search(r'uddg=([^&]+)', raw_href)
                    if match:
                        dest = urllib.parse.unquote(match.group(1))
                        if not result["official_site"] and "linkedin.com" not in dest and "glassdoor.com" not in dest and "indeed.com" not in dest:
                            parsed_dest = urllib.parse.urlparse(dest)
                            result["official_site"] = f"{parsed_dest.scheme}://{parsed_dest.netloc}"
                        
                        if any(w in dest.lower() for w in ['career', 'jobs', 'greenhouse', 'lever', 'workday', 'ashby']):
                            result["career_page_url"] = dest
                            if "greenhouse.io" in dest:
                                result["ats_provider"] = "Greenhouse"
                            elif "lever.co" in dest:
                                result["ats_provider"] = "Lever"
                            elif "ashbyhq.com" in dest:
                                result["ats_provider"] = "Ashby"
                            elif "workday" in dest:
                                result["ats_provider"] = "Workday"
                            else:
                                result["ats_provider"] = "Direct Portal"
                            result["careers_links_found"].append(dest)
                            return result
    except Exception as e:
        print(f"Company scraper search notice: {e}")

    # Fallback to search-based career URL if still empty
    if not result["career_page_url"]:
        result["career_page_url"] = f"https://www.google.com/search?q={urllib.parse.quote(company_name + ' jobs careers')}"

    return result
