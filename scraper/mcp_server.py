"""
Model Context Protocol (MCP) Standard Server for JobPulse Web Scraping.
Implements the official Model Context Protocol (JSON-RPC 2.0 over stdio).
Provides free, zero-cost tools for live ATS job feeds (Greenhouse, Lever),
HTML/text page scraping, and structured job intelligence.
"""

import sys
import json
import re
import urllib.parse
import urllib.request
import traceback

def fetch_url_text(url, timeout=12):
    """Fetches clean readable text and title from any URL without heavy dependencies."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        html = response.read().decode('utf-8', errors='replace')

    # Extract title
    title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    title = title_match.group(1).strip() if title_match else ""

    # Clean script, style, comments
    cleaned = re.sub(r'<(script|style|noscript)[^>]*>.*?</\1>', ' ', html, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r'<!--.*?-->', ' ', cleaned, flags=re.DOTALL)
    # Convert paragraph/break tags to newlines
    cleaned = re.sub(r'<(br|p|div|h[1-6]|li)[^>]*>', '\n', cleaned, flags=re.IGNORECASE)
    # Strip remaining HTML tags
    cleaned = re.sub(r'<[^>]+>', ' ', cleaned)
    # Clean whitespace
    lines = [re.sub(r'\s+', ' ', line).strip() for line in cleaned.splitlines()]
    clean_text = '\n'.join([l for l in lines if l])
    return {
        "url": url,
        "title": title,
        "text": clean_text[:25000],  # first 25k chars
        "length": len(clean_text)
    }

def fetch_greenhouse_jobs(company_slug):
    """
    Queries Greenhouse public job API (Free & official, never blocked).
    Endpoint: https://boards-api.greenhouse.io/v1/boards/{company}/jobs
    """
    url = f"https://boards-api.greenhouse.io/v1/boards/{company_slug}/jobs"
    headers = {"User-Agent": "JobPulse-MCP/1.0"}
    jobs = []
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
        
        raw_jobs = data.get("jobs", [])
        for j in raw_jobs:
            loc = j.get("location", {}).get("name", "Remote / Specified in Posting")
            jobs.append({
                "id": f"gh-{j.get('id')}",
                "title": j.get("title", "Software Engineer"),
                "company": company_slug.title(),
                "location": loc,
                "source": f"Greenhouse ATS ({company_slug.title()})",
                "job_url": j.get("absolute_url", ""),
                "career_page_url": f"https://boards.greenhouse.io/{company_slug}",
                "ats_provider": "Greenhouse",
                "description": f"Live opening for {j.get('title')} at {company_slug.title()}. Location: {loc}.",
                "role_type": "Full-Time",
                "status": "Wishlist"
            })
    except Exception:
        pass
    return jobs

def fetch_lever_jobs(company_slug):
    """
    Queries Lever public job postings endpoint.
    Endpoint: https://api.lever.co/v0/postings/{company}?mode=json
    """
    url = f"https://api.lever.co/v0/postings/{company_slug}?mode=json"
    headers = {"User-Agent": "JobPulse-MCP/1.0"}
    jobs = []
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as response:
            raw_jobs = json.loads(response.read().decode('utf-8'))
            
        if isinstance(raw_jobs, list):
            for j in raw_jobs:
                cats = j.get("categories", {})
                loc = cats.get("location") or "Remote / Specified in Posting"
                jobs.append({
                    "id": f"lev-{j.get('id')}",
                    "title": j.get("text", "Software Engineer"),
                    "company": company_slug.title(),
                    "location": loc,
                    "source": f"Lever ATS ({company_slug.title()})",
                    "job_url": j.get("hostedUrl", ""),
                    "career_page_url": f"https://jobs.lever.co/{company_slug}",
                    "ats_provider": "Lever",
                    "description": j.get("descriptionPlain", "")[:600] or f"Opening for {j.get('text')} at {company_slug.title()}",
                    "role_type": cats.get("commitment", "Full-Time"),
                    "status": "Wishlist"
                })
    except Exception:
        pass
    return jobs

def mcp_search_live_jobs(role_keyword="software engineer", location="", company=None, max_results=15):
    """
    Multi-tiered Free MCP job search:
    1. Checks official top employer ATS feeds (Greenhouse & Lever)
    2. Filters by target role keyword and location
    """
    all_jobs = []
    target_companies = []
    if company:
        target_companies = [c.strip().lower() for c in company.split(',') if c.strip()]
    else:
        # Verified tech companies with active public ATS endpoints
        target_companies = ["gitlab", "automattic", "elastic", "mongodb", "hashicorp", "reddit", "stripe", "figma", "datadog"]

    for comp in target_companies:
        if len(all_jobs) >= max_results:
            break

        # Check Greenhouse
        comp_jobs = fetch_greenhouse_jobs(comp)
        # Fallback to Lever if Greenhouse has none
        if not comp_jobs:
            comp_jobs = fetch_lever_jobs(comp)

        for j in comp_jobs:
            # Filter by role
            if role_keyword:
                r_low = role_keyword.lower()
                words = [w for w in r_low.replace(',', ' ').split() if len(w) > 2]
                if words and not any(k in j["title"].lower() for k in words):
                    continue
            if location and location.lower() != 'any':
                l_low = location.lower()
                if l_low not in j["location"].lower() and "remote" not in j["location"].lower():
                    continue
            all_jobs.append(j)
            if len(all_jobs) >= max_results:
                break

    return all_jobs[:max_results]

# --- MCP Tool Registry & Protocol Handler ---

TOOLS = [
    {
        "name": "scrape_job_url",
        "description": "Scrapes a job posting or career portal URL and returns clean readable text and title.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "The HTTP/HTTPS URL of the job posting or career page"}
            },
            "required": ["url"]
        }
    },
    {
        "name": "scrape_ats_jobs",
        "description": "Directly queries free, official ATS API feeds (Greenhouse / Lever) for a company.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "company": {"type": "string", "description": "The company name or slug (e.g. stripe, gitlab)"},
                "ats_type": {"type": "string", "enum": ["greenhouse", "lever", "auto"], "default": "auto"}
            },
            "required": ["company"]
        }
    },
    {
        "name": "search_live_jobs",
        "description": "Searches live job openings across verified employer portals and ATS boards without blocking.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "role": {"type": "string", "description": "Role title or keyword to filter by"},
                "location": {"type": "string", "description": "Location (e.g. Bengaluru, Remote, San Francisco)"},
                "company": {"type": "string", "description": "Specific company name or comma-separated companies"},
                "max_results": {"type": "integer", "default": 15}
            }
        }
    }
]

def handle_tool_call(tool_name, arguments):
    if tool_name == "scrape_job_url":
        url = arguments.get("url")
        if not url:
            raise ValueError("URL is required")
        res = fetch_url_text(url)
        return json.dumps(res, indent=2)

    elif tool_name == "scrape_ats_jobs":
        company = arguments.get("company", "").strip().lower()
        ats_type = arguments.get("ats_type", "auto")
        jobs = []
        if ats_type in ["greenhouse", "auto"]:
            try:
                jobs = fetch_greenhouse_jobs(company)
            except Exception:
                pass
        if not jobs and ats_type in ["lever", "auto"]:
            try:
                jobs = fetch_lever_jobs(company)
            except Exception:
                pass
        return json.dumps({"company": company, "jobs_count": len(jobs), "jobs": jobs}, indent=2)

    elif tool_name == "search_live_jobs":
        role = arguments.get("role", "software engineer")
        loc = arguments.get("location", "")
        comp = arguments.get("company")
        max_res = int(arguments.get("max_results", 15))
        jobs = mcp_search_live_jobs(role_keyword=role, location=loc, company=comp, max_results=max_res)
        return json.dumps({"jobs_found": len(jobs), "jobs": jobs}, indent=2)

    else:
        raise ValueError(f"Unknown MCP tool: {tool_name}")

def run_stdio_server():
    """Runs the JSON-RPC 2.0 stdio loop for the MCP server."""
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            line = line.strip()
            if not line:
                continue

            request = json.loads(line)
            req_id = request.get("id")
            method = request.get("method")
            params = request.get("params", {})

            if method == "initialize":
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "serverInfo": {
                            "name": "jobpulse-mcp-scraper",
                            "version": "1.0.0"
                        },
                        "capabilities": {
                            "tools": {}
                        }
                    }
                }
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()

            elif method == "notifications/initialized":
                # Notification, no response required
                pass

            elif method == "tools/list":
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "tools": TOOLS
                    }
                }
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()

            elif method == "tools/call":
                tool_name = params.get("name")
                arguments = params.get("arguments", {})
                try:
                    result_text = handle_tool_call(tool_name, arguments)
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": result_text
                                }
                            ]
                        }
                    }
                except Exception as e:
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {
                            "code": -32000,
                            "message": str(e)
                        }
                    }
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()

            elif method == "ping":
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {}
                }
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()

            else:
                if req_id is not None:
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {
                            "code": -32601,
                            "message": f"Method not found: {method}"
                        }
                    }
                    sys.stdout.write(json.dumps(response) + "\n")
                    sys.stdout.flush()

        except Exception as e:
            traceback.print_exc(file=sys.stderr)

if __name__ == "__main__":
    run_stdio_server()
