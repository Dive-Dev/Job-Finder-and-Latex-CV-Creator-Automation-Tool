import re
import json
import time
from scraper.human_crawler import HumanWebCrawler
from ai.local_llm import query_llm
from sheets.local_db import save_company_research, get_company_research

SYSTEM_PROMPT = """You are an elite corporate intelligence analyst and executive recruiter researcher.
Analyze the provided company website content extracted by a human-like web crawler.
Synthesize a comprehensive, executive intelligence dossier in valid JSON format.

JSON schema:
{
  "company_name": "Official Name",
  "tagline": "Short punchy tagline or value proposition",
  "industry": "Primary industry / domain",
  "overview": "2-3 sentence executive synopsis of what the company does and problems it solves",
  "mission_and_values": "Core mission, vision, or principles",
  "products": [
    {
      "name": "Product or Platform Name",
      "description": "What it does and key features",
      "target_users": "Who uses it (e.g. Enterprise, Developers, Consumers)"
    }
  ],
  "clients_and_customers": [
    {
      "name": "Client or Customer Name",
      "segment": "Industry or use-case",
      "context": "Details or case study reference if available"
    }
  ],
  "tech_stack_inferred": [
    "Identified or inferred language, framework, cloud infra, or tool"
  ],
  "engineering_culture": "Key traits of their work culture, pace, and technology focus",
  "interview_cheat_sheet": {
    "why_work_here_hook": "A strong, authentic 2-sentence pitch explaining why a high-caliber engineer wants to build their products",
    "smart_questions_to_ask": [
      "Thoughtful question 1 demonstrating deep research into their products or client scale",
      "Thoughtful question 2 about their architecture or future roadmap"
    ],
    "cover_letter_alignment_snippet": "A tailored 2-sentence hook highlighting how candidate skills directly solve challenges in their core products or client scale"
  }
}
Output only the JSON object. Do not include markdown code block quotes if possible.
"""

def extract_dossier_with_llm(crawl_result):
    """
    Synthesizes the crawled website content into an executive dossier using local LLM or Gemini.
    """
    company_name = crawl_result.get("company_name", "Unknown Company")
    home = crawl_result.get("home", {})
    subpages = crawl_result.get("subpages", [])
    
    # Compile text for prompt
    context_chunks = [
        f"COMPANY NAME: {company_name}",
        f"HOMEPAGE TITLE: {home.get('title', '')}",
        f"META DESCRIPTION: {home.get('meta_description', '')}",
        f"HOMEPAGE HEADINGS: {json.dumps(home.get('headings', {}))}",
        f"HOMEPAGE SNIPPETS:\n" + "\n".join(home.get("content_snippets", [])[:8]),
        f"DETECTED CLIENT/PARTNER LOGOS: {', '.join(home.get('client_logos', []))}"
    ]

    for sub in subpages:
        stype = sub.get("type", "page").upper()
        sdata = sub.get("data", {})
        context_chunks.append(
            f"\n--- {stype} PAGE ({sdata.get('url', '')}) ---\n"
            f"TITLE: {sdata.get('title', '')}\n"
            f"HEADINGS: {json.dumps(sdata.get('headings', {}))}\n"
            f"SNIPPETS:\n" + "\n".join(sdata.get("content_snippets", [])[:8]) + "\n"
            f"CLIENT LOGOS: {', '.join(sdata.get('client_logos', []))}"
        )

    full_context = "\n".join(context_chunks)
    prompt = f"Website Intelligence Data for '{company_name}':\n\n{full_context}\n\nProduce the complete structured JSON dossier according to the system instructions."

    try:
        response = query_llm(prompt, system_prompt=SYSTEM_PROMPT, json_mode=True)
        raw_text = response.get("text", "").strip()
        # Clean any markdown fences
        clean_json = re.sub(r'^```json\s*', '', raw_text, flags=re.I)
        clean_json = re.sub(r'^```\s*', '', clean_json)
        clean_json = re.sub(r'\s*```$', '', clean_json)
        data = json.loads(clean_json)
        data["source"] = f"LLM ({response.get('model', 'local')})"
        return data
    except Exception as e:
        print(f"LLM synthesis unavailable or failed ({e}). Falling back to NLP heuristics...")
        return heuristic_dossier_synthesis(company_name, crawl_result)

def heuristic_dossier_synthesis(company_name, crawl_result):
    """
    Robust rule-based NLP heuristic synthesis when local model is offline.
    Extracts products, clients, and tailored interview hooks directly from the crawl signals.
    """
    home = crawl_result.get("home", {})
    subpages = crawl_result.get("subpages", [])
    
    title = home.get("title", f"{company_name} Official Site")
    meta_desc = home.get("meta_description", "")
    all_snippets = list(home.get("content_snippets", []))
    all_logos = list(home.get("client_logos", []))
    all_headings = list(home.get("headings", {}).get("h2", []))

    for sub in subpages:
        sdata = sub.get("data", {})
        all_snippets.extend(sdata.get("content_snippets", []))
        all_logos.extend(sdata.get("client_logos", []))
        all_headings.extend(sdata.get("headings", {}).get("h2", []))

    # Infer Overview
    overview = meta_desc or (all_snippets[0] if all_snippets else f"{company_name} is a leading enterprise technology company.")
    if len(overview) > 300:
        overview = overview[:297] + "..."

    # Infer Products
    products = []
    # Check headings and snippets for product clues
    candidate_products = []
    for h in all_headings:
        if len(h) < 50 and not any(skip in h.lower() for skip in ["about", "contact", "cookie", "privacy", "careers", "news"]):
            candidate_products.append(h)

    if not candidate_products:
        candidate_products = [f"{company_name} Core Platform", f"{company_name} Enterprise Solutions"]

    for cp in candidate_products[:3]:
        products.append({
            "name": cp,
            "description": f"Proprietary technology offering designed to deliver high-performance scalability and reliable user experience for {company_name}'s market.",
            "target_users": "Enterprise Organizations & End Users"
        })

    # Infer Clients & Customers
    clients = []
    unique_logos = list(dict.fromkeys(all_logos))
    if unique_logos:
        for logo in unique_logos[:5]:
            clients.append({
                "name": logo,
                "segment": "Enterprise Partner",
                "context": f"Publicly highlighted customer/partner on {company_name}'s digital platform."
            })
    else:
        # Standard tech/enterprise segments
        clients = [
            {"name": "Global Enterprise Clients", "segment": "Fortune 500", "context": "Large-scale deployments requiring high-availability infrastructure."},
            {"name": "Fast-Growing Tech Startups", "segment": "Scale-ups", "context": "Leveraging digital products to accelerate growth."}
        ]

    # Inferred Tech Stack
    tech_keywords = ["Python", "React", "TypeScript", "Node.js", "Java", "Go", "AWS", "Kubernetes", "Docker", "PostgreSQL", "Redis", "Kafka", "Microservices"]
    detected_tech = []
    combined_text = " ".join(all_snippets) + " " + " ".join(all_headings)
    for kw in tech_keywords:
        if re.search(r'\b' + re.escape(kw) + r'\b', combined_text, re.I):
            detected_tech.append(kw)
    if not detected_tech:
        detected_tech = ["Python", "React", "Cloud Architecture (AWS/GCP)", "Microservices", "REST APIs", "High-Scale Databases"]

    return {
        "company_name": company_name,
        "tagline": title.split('|')[0].split('-')[0].strip(),
        "industry": "Software, Cloud & Technology Solutions",
        "overview": overview,
        "mission_and_values": f"Delivering mission-critical technology, world-class product reliability, and innovative engineering to empower clients globally.",
        "products": products,
        "clients_and_customers": clients,
        "tech_stack_inferred": detected_tech,
        "engineering_culture": "Engineering-first, customer-centric, and focused on robust scalable systems.",
        "interview_cheat_sheet": {
            "why_work_here_hook": f"I am deeply inspired by {company_name}'s commitment to building scalable platforms like {products[0]['name']}. The technical challenge of supporting enterprise scale with high reliability aligns directly with my engineering background.",
            "smart_questions_to_ask": [
                f"How has the architecture of {products[0]['name']} evolved to handle increasing throughput and client demand?",
                f"What are the major engineering priorities for the team over the next 12 months as you expand your customer ecosystem?"
            ],
            "cover_letter_alignment_snippet": f"Having tracked {company_name}'s innovation in {products[0]['name']}, I am eager to apply my experience in scalable backend architecture and full-stack development to help your team continue delivering exceptional reliability for high-impact clients."
        },
        "source": "NLP Heuristic Analysis"
    }

def study_company_like_a_human(company_name, official_url=None, human_pacing=True, force_refresh=False):
    """
    Main entry point for deep company investigation:
    1. Checks database cache.
    2. Runs HumanWebCrawler (human pacing, jitter delays, link exploration).
    3. Synthesizes executive dossier using local LLM or NLP heuristics.
    4. Persists dossier into SQLite for instant future lookups.
    """
    if not force_refresh:
        cached = get_company_research(company_name)
        if cached:
            return {
                "success": True,
                "cached": True,
                "dossier": cached,
                "crawl_logs": [f"Retrieved cached intelligence dossier for '{company_name}'."]
            }

    # Execute Human-like crawl
    crawler = HumanWebCrawler(human_pacing=human_pacing)
    crawl_data = crawler.crawl_company_website(company_name, official_url=official_url)

    # Synthesize dossier
    crawler.log("🧠 Step 5/5: Synthesizing executive intelligence dossier (products, clients, tech stack, interview hooks)...")
    dossier = extract_dossier_with_llm(crawl_data)
    dossier["official_url"] = crawl_data.get("official_url")
    dossier["crawl_timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")
    dossier["pages_visited"] = crawl_data.get("visited_count", 1)

    crawler.log(f"✅ Dossier finalized with {len(dossier.get('products', []))} products and {len(dossier.get('clients_and_customers', []))} clients.")

    # Save to SQLite database
    try:
        save_company_research(
            company_name=company_name,
            website=dossier.get("official_url", ""),
            dossier_dict=dossier
        )
    except Exception as e:
        print(f"Error persisting company research to DB: {e}")

    return {
        "success": True,
        "cached": False,
        "dossier": dossier,
        "crawl_logs": crawl_data.get("crawl_logs", [])
    }
