"""
MCP Scraper Client & Bridge for JobPulse AI.
Directly interfaces with the Free Model Context Protocol (MCP) scraper engine.
Fetches real, live job postings from verified company portals & ATS feeds without brittle HTML regexes or blocking.
"""

import json
from scraper.mcp_server import (
    mcp_search_live_jobs,
    fetch_url_text,
    fetch_greenhouse_jobs,
    fetch_lever_jobs
)
from ai.local_llm import query_llm
from ai.jd_analyzer import extract_skills_heuristic

def mcp_search_jobs(role_keyword="software engineer", location="", company=None, max_results=15):
    """
    Executes a high-reliability live job search using the Free MCP engine.
    Fetches real vacancies from official ATS endpoints and company career portals.
    """
    jobs = mcp_search_live_jobs(
        role_keyword=role_keyword,
        location=location,
        company=company,
        max_results=max_results
    )

    # Enrich each job with heuristics / skills
    for job in jobs:
        if not job.get("skills"):
            job["skills"] = extract_skills_heuristic(job.get("title", "") + " " + job.get("description", ""))

    return jobs

def mcp_scrape_posting_details(job_url):
    """
    Uses the Free MCP tool to fetch and parse full job posting text.
    """
    try:
        page_info = fetch_url_text(job_url)
        clean_text = page_info.get("text", "")

        # Extract structured details
        skills = extract_skills_heuristic(clean_text)

        return {
            "success": True,
            "url": job_url,
            "title": page_info.get("title", ""),
            "description": clean_text[:3500],
            "skills": skills,
            "length": page_info.get("length", 0)
        }
    except Exception as e:
        return {
            "success": False,
            "url": job_url,
            "error": str(e)
        }

def mcp_scrape_company_openings(company_name, role_keywords="", location="", max_results=15):
    """
    Uses the Free MCP scraper to retrieve all live openings directly from a company's verified board.
    """
    slug = company_name.lower().strip().replace(' ', '-')
    jobs = []
    
    # Try Greenhouse first
    try:
        jobs = fetch_greenhouse_jobs(slug)
    except Exception:
        pass

    # Try Lever second
    if not jobs:
        try:
            jobs = fetch_lever_jobs(slug)
        except Exception:
            pass

    # Filter by role and location if provided
    filtered = []
    for j in jobs:
        if role_keywords:
            r_low = role_keywords.lower()
            if not any(k in j["title"].lower() for k in r_low.split()):
                continue
        if location and location.lower() != 'any':
            l_low = location.lower()
            if l_low not in j["location"].lower() and "remote" not in j["location"].lower():
                continue
        filtered.append(j)

    return (filtered or jobs)[:max_results]
