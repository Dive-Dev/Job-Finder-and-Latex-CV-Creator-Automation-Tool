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

def parse_linkedin_search_url(url):
    """
    Parses a LinkedIn search URL and extracts keywords, location, and filters.
    """
    parsed = urllib.parse.urlparse(url)
    params = urllib.parse.parse_qs(parsed.query)
    
    keywords = params.get('keywords', [''])[0]
    location = params.get('location', [''])[0]
    
    # If not in query params, inspect path (e.g., /jobs/software-engineer-jobs-san-francisco)
    if not keywords and '/jobs/' in parsed.path:
        slug = parsed.path.split('/jobs/')[-1].replace('-jobs', '').replace('/', ' ')
        keywords = slug.replace('-', ' ')
        
    return {
        'keywords': keywords,
        'location': location,
        'raw_params': {k: v[0] for k, v in params.items()}
    }

def scrape_linkedin_jobs(search_url_or_keywords, location="", max_results=15, find_company_sites=True):
    """
    Scrapes LinkedIn jobs using either a full search URL or keywords + location.
    Uses LinkedIn's public guest job search API.
    """
    keywords = search_url_or_keywords.strip()
    extra_params = {}
    
    if keywords.startswith('http://') or keywords.startswith('https://'):
        parsed_info = parse_linkedin_search_url(keywords)
        keywords = parsed_info['keywords']
        if not location:
            location = parsed_info['location']
        extra_params = parsed_info['raw_params']
    
    # Check if this is a single job view URL
    if '/jobs/view/' in search_url_or_keywords:
        single_job = scrape_single_linkedin_job(search_url_or_keywords)
        if single_job:
            return [single_job]
        return []

    jobs = []
    start = 0
    batch_size = 25
    
    base_api = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
    
    while len(jobs) < max_results:
        query_params = {
            "keywords": keywords,
            "location": location,
            "start": start
        }
        # Include optional filters if present
        for filter_key in ['f_TPR', 'f_WT', 'f_E', 'f_JT']:
            if filter_key in extra_params:
                query_params[filter_key] = extra_params[filter_key]
                
        try:
            resp = requests.get(base_api, params=query_params, headers=HEADERS, timeout=10)
            if resp.status_code != 200 or not resp.text.strip():
                break
                
            soup = BeautifulSoup(resp.text, 'html.parser')
            cards = soup.find_all(['li', 'div'], class_=re.compile(r'base-card|job-search-card'))
            
            if not cards:
                # Try finding any cards
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

def scrape_single_linkedin_job(job_url):
    """
    Fetches full job description and criteria from a single LinkedIn job link.
    """
    try:
        job_id_match = re.search(r'/view/(?:[^\/]+-)?(\d+)|-(\d+)(?:\?|$)', job_url)
        job_id = (job_id_match.group(1) or job_id_match.group(2)) if job_id_match else ""
        
        detail_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}" if job_id else job_url
        
        resp = requests.get(detail_url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            # Fallback directly to job_url
            resp = requests.get(job_url, headers=HEADERS, timeout=10)
            
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
