import os
import re
import urllib.parse
import requests
from bs4 import BeautifulSoup
from scraper.company_scraper import find_company_career_site

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.linkedin.com/",
}

def build_linkedin_session(cookie=None):
    """
    Creates a requests.Session configured with browser headers and optional
    authenticated LinkedIn session cookies (li_at / JSESSIONID).
    """
    session = requests.Session()
    session.headers.update(HEADERS)
    
    raw_cookie = cookie or os.environ.get('LINKEDIN_COOKIE') or os.environ.get('LI_AT')
    if raw_cookie:
        clean_cookie = raw_cookie.strip()
        # Handle cases where full cookie string or header was pasted
        if "li_at=" in clean_cookie:
            match = re.search(r'li_at=([^;]+)', clean_cookie)
            if match:
                clean_cookie = match.group(1).strip()
        session.cookies.set("li_at", clean_cookie, domain=".linkedin.com")
        session.cookies.set("JSESSIONID", "ajax:0000000000000000000", domain=".linkedin.com")
        session.headers.update({
            "csrf-token": "ajax:0000000000000000000",
            "x-restli-protocol-version": "2.0.0"
        })
    return session

def parse_linkedin_search_url(url):
    """
    Parses any LinkedIn search, recommended, collections, or authenticated URL
    and extracts keywords, location, active job ID (currentJobId), and all search filters.
    """
    parsed = urllib.parse.urlparse(url)
    params = urllib.parse.parse_qs(parsed.query)
    
    # 1. Active / currently selected job ID in authenticated view
    current_job_id = params.get('currentJobId', [''])[0]
    if not current_job_id and '/view/' in parsed.path:
        view_match = re.search(r'/view/(?:[^\/]+-)?(\d+)|-(\d+)(?:\?|$)', parsed.path)
        if view_match:
            current_job_id = view_match.group(1) or view_match.group(2)
            
    # 2. Keywords
    keywords = params.get('keywords', [''])[0]
    if not keywords and '/jobs/' in parsed.path:
        slug = parsed.path.split('/jobs/')[-1].replace('-jobs', '').replace('/', ' ')
        if not any(k in slug for k in ['search', 'collections', 'tracker', 'view']):
            keywords = slug.replace('-', ' ')
            
    # 3. Location & GeoID
    location = params.get('location', [''])[0]
    geo_id = params.get('geoId', [''])[0]
    
    # 4. Authenticated & specialized filters
    # Time posted: f_TPR (e.g. r86400, r604800)
    # Work type: f_WT (1=onsite, 2=remote, 3=hybrid)
    # Experience: f_E (1,2,3,4,5,6)
    # Job type: f_JT (F,P,C,T,I)
    # Easy Apply: f_AL (true)
    # Company: f_C
    # Distance: distance
    # Sort: sortBy (DD = date, R = relevance)
    recognized_filters = {}
    for key, val_list in params.items():
        if key in ['f_TPR', 'f_WT', 'f_E', 'f_JT', 'f_AL', 'f_C', 'f_SB2', 'f_PP', 'distance', 'sortBy', 'start']:
            recognized_filters[key] = val_list[0]

    return {
        'keywords': keywords,
        'location': location,
        'geo_id': geo_id,
        'current_job_id': current_job_id,
        'is_authenticated_url': bool(current_job_id or 'f_TPR' in params or 'f_WT' in params or 'origin=JOB_SEARCH_PAGE' in url),
        'filters': recognized_filters,
        'raw_params': {k: v[0] for k, v in params.items()}
    }

def scrape_linkedin_jobs(search_url_or_keywords, location="", max_results=15, find_company_sites=True, cookie=None):
    """
    Scrapes LinkedIn jobs using either an authenticated/public search URL or keywords + location.
    Optimized for multi-role searches, authenticated filters, and Bengaluru, Karnataka, India.
    """
    extra_params = {}
    extracted_geo_id = None
    initial_job_to_add = None
    
    session = build_linkedin_session(cookie)

    # Handle list of keywords or search URL
    keyword_list = []
    if isinstance(search_url_or_keywords, list):
        keyword_list = [k.strip() for k in search_url_or_keywords if k.strip()]
    elif isinstance(search_url_or_keywords, str):
        kw_str = search_url_or_keywords.strip()
        if kw_str.startswith('http://') or kw_str.startswith('https://'):
            parsed_info = parse_linkedin_search_url(kw_str)
            
            # If authenticated search URL has a currently active/previewed job, scrape it first
            if parsed_info.get('current_job_id'):
                try:
                    job_view_url = f"https://www.linkedin.com/jobs/view/{parsed_info['current_job_id']}"
                    initial_job_to_add = scrape_single_linkedin_job(job_view_url, cookie=cookie)
                except Exception as e:
                    print(f"Notice: Could not pre-fetch currentJobId {parsed_info['current_job_id']}: {e}")

            if parsed_info.get('keywords'):
                keyword_list = [parsed_info['keywords']]
            elif initial_job_to_add and initial_job_to_add.get('title'):
                keyword_list = [initial_job_to_add['title']]
            else:
                keyword_list = [""]

            if parsed_info.get('location') and not location:
                location = parsed_info['location']
                
            if parsed_info.get('geo_id'):
                extracted_geo_id = parsed_info['geo_id']
                
            extra_params = parsed_info.get('filters', {})
        elif ',' in kw_str:
            keyword_list = [k.strip() for k in kw_str.split(',') if k.strip()]
        else:
            keyword_list = [kw_str]

    # Check if this is a single job view URL
    if isinstance(search_url_or_keywords, str) and '/jobs/view/' in search_url_or_keywords:
        single_job = scrape_single_linkedin_job(search_url_or_keywords, cookie=cookie)
        if single_job:
            return [single_job]
        return []

    # Bengaluru & Karnataka location optimization
    loc_clean = location.strip()
    loc_lower = loc_clean.lower()
    geo_id = extracted_geo_id
    
    if not geo_id:
        if "bengaluru" in loc_lower or "bangalore" in loc_lower or "karnataka" in loc_lower:
            loc_clean = "Bengaluru, Karnataka, India"
            geo_id = "105214831"  # LinkedIn's official Bengaluru Metropolitan Area geoId
        elif not loc_clean:
            loc_clean = "Bengaluru, Karnataka, India"
            geo_id = "105214831"

    jobs = []
    seen_urls = set()
    
    # Add initial active job from authenticated URL if found
    if initial_job_to_add:
        jobs.append(initial_job_to_add)
        if initial_job_to_add.get('job_url'):
            seen_urls.add(initial_job_to_add['job_url'])

    base_api = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"

    for kw in keyword_list:
        if len(jobs) >= max_results:
            break
        start = 0
        batch_size = 25
        
        while len(jobs) < max_results and start < 50:
            query_params = {
                "start": start
            }
            if kw:
                query_params["keywords"] = kw
            if loc_clean:
                query_params["location"] = loc_clean
            if geo_id:
                query_params["geoId"] = geo_id

            # Forward authenticated filters from user URL
            for filter_key in ['f_TPR', 'f_WT', 'f_E', 'f_JT', 'f_AL', 'f_C', 'f_SB2', 'distance', 'sortBy']:
                if filter_key in extra_params:
                    query_params[filter_key] = extra_params[filter_key]
                    
            try:
                resp = session.get(base_api, params=query_params, timeout=12)
                if resp.status_code != 200 or not resp.text.strip():
                    break
                    
                soup = BeautifulSoup(resp.text, 'html.parser')
                cards = soup.find_all(['li', 'div'], class_=re.compile(r'base-card|job-search-card'))
                if not cards:
                    cards = soup.find_all('div', class_='base-card')
                if not cards:
                    break
                
                for card in cards:
                    if len(jobs) >= max_results:
                        break
                        
                    title_elem = card.find(['h3', 'h2'], class_=re.compile(r'base-search-card__title|job-card-list__title'))
                    company_elem = card.find(['h4', 'a'], class_=re.compile(r'base-search-card__subtitle|job-search-card__subtitle'))
                    location_elem = card.find('span', class_=re.compile(r'job-search-card__location'))
                    link_elem = card.find('a', class_=re.compile(r'base-card__full-link|job-search-card__job-link'))
                    date_elem = card.find('time', class_=re.compile(r'job-search-card__listdate'))
                    
                    title = title_elem.get_text(strip=True) if title_elem else ""
                    company = company_elem.get_text(strip=True) if company_elem else ""
                    company_url = company_elem.get('href', '').split('?')[0] if (company_elem and company_elem.name == 'a') else ""
                    loc = location_elem.get_text(strip=True) if location_elem else ""
                    posted_date = date_elem.get_text(strip=True) if date_elem else ""
                    
                    job_url = ""
                    if link_elem and link_elem.get('href'):
                        raw_url = link_elem.get('href')
                        job_url = raw_url.split('?')[0]
                    elif card.find('a'):
                        job_url = card.find('a').get('href', '').split('?')[0]
                        
                    if not title or not company:
                        continue
                        
                    if job_url in seen_urls:
                        continue
                    seen_urls.add(job_url)

                    job_id_match = re.search(r'-(\d+)(?:\?|$)|/view/(\d+)', job_url)
                    job_id = (job_id_match.group(1) or job_id_match.group(2)) if job_id_match else str(start + len(jobs))
                    
                    career_site_info = {}
                    if find_company_sites:
                        career_site_info = find_company_career_site(company)
                        
                    job_obj = {
                        "id": f"li-{job_id}",
                        "title": title,
                        "company": company,
                        "location": loc,
                        "source": "LinkedIn",
                        "job_url": job_url,
                        "company_url": company_url or career_site_info.get("official_site", ""),
                        "career_page_url": career_site_info.get("career_page_url", ""),
                        "ats_provider": career_site_info.get("ats_provider", "Unknown"),
                        "posted_date": posted_date,
                        "description": "",
                        "role_type": "Full-Time",
                        "experience_level": "",
                        "skills": [],
                        "status": "Wishlist"
                    }
                    
                    jobs.append(job_obj)
                
                start += batch_size
            except Exception as e:
                print(f"Error scraping LinkedIn batch at start={start}: {e}")
                break
            
    return jobs

def scrape_single_linkedin_job(job_url, cookie=None):
    """
    Fetches full job description and criteria from a single LinkedIn job link.
    Supports authenticated sessions and guest endpoints.
    """
    try:
        session = build_linkedin_session(cookie)
        job_id_match = re.search(r'/view/(?:[^\/]+-)?(\d+)|-(\d+)(?:\?|$)', job_url)
        job_id = (job_id_match.group(1) or job_id_match.group(2)) if job_id_match else ""
        
        detail_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}" if job_id else job_url
        
        resp = session.get(detail_url, timeout=12)
        if resp.status_code != 200:
            # Fallback directly to job_url with session
            resp = session.get(job_url, timeout=12)
            
        if resp.status_code != 200:
            return None
            
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        title_elem = soup.find(['h1', 'h2'], class_=re.compile(r'top-card-layout__title|topcard__title'))
        company_elem = soup.find(['a', 'span'], class_=re.compile(r'topcard__org-name-link|top-card-layout__first-subline'))
        location_elem = soup.find('span', class_=re.compile(r'topcard__flavor--bullet|top-card-layout__second-subline'))
        desc_elem = soup.find('div', class_=re.compile(r'show-more-less-html__markup|description__text'))
        
        title = title_elem.get_text(strip=True) if title_elem else "Software Role"
        company = company_elem.get_text(strip=True) if company_elem else "Hiring Company"
        loc = location_elem.get_text(strip=True) if location_elem else ""
        description = desc_elem.get_text(separator="\n", strip=True) if desc_elem else ""
        
        career_site_info = find_company_career_site(company)
        
        return {
            "id": f"li-{job_id}" if job_id else "li-direct",
            "title": title,
            "company": company,
            "location": loc,
            "source": "LinkedIn",
            "job_url": job_url,
            "company_url": career_site_info.get("official_site", ""),
            "career_page_url": career_site_info.get("career_page_url", ""),
            "ats_provider": career_site_info.get("ats_provider", "Unknown"),
            "description": description,
            "skills": [],
            "status": "Wishlist"
        }
    except Exception as e:
        print(f"Error scraping single LinkedIn job: {e}")
        return None
