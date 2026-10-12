import re
import json
from ai.local_llm import query_llm
from sheets.local_db import get_company_research

SYSTEM_INTERVIEW_PROMPT = """You are an elite Silicon Valley technical interview coach and engineering hiring manager.
Your task is to generate a comprehensive, role-specific Interview Preparation Master Pack for a candidate interviewing for a target job at a specific company.

Schema:
{
  "role_title": "...",
  "company": "...",
  "technical_questions": [
    {
      "question": "Realistic technical or system design question specific to the role stack",
      "model_answer": "Structured, high-impact answer demonstrating depth",
      "key_topics": ["Topic 1", "Topic 2"]
    }
  ],
  "company_and_product_questions": [
    {
      "question": "Targeted question about the company's specific product or engineering challenge",
      "strategic_talking_points": "How to answer authentically referencing their products, scale, or clients"
    }
  ],
  "behavioral_star_questions": [
    {
      "question": "Behavioral scenario question (e.g. conflict, production failure, trade-off)",
      "star_framework_guide": "Situation, Task, Action, Result breakdown",
      "sample_response": "Concise model answer"
    }
  ],
  "questions_to_ask_interviewer": [
    "High-signal question 1 demonstrating deep technical curiosity about their architecture",
    "High-signal question 2 demonstrating business and team impact"
  ],
  "cheat_sheet_tips": [
    "Key tip 1",
    "Key tip 2"
  ]
}
Output only the JSON object.
"""

def generate_interview_prep_pack(profile, job_data):
    """
    Synthesizes an interview master pack using Local LLM / Gemini or heuristic fallback.
    Integrates researched company products and clients.
    """
    candidate_name = profile.get("name", "Candidate")
    candidate_title = profile.get("title", "Software Engineer")
    skills = profile.get("skills", {})
    if isinstance(skills, dict):
        skills_list = [item for sublist in skills.values() for item in (sublist if isinstance(sublist, list) else [sublist])]
    elif isinstance(skills, list):
        skills_list = skills
    else:
        skills_list = ["Python", "React", "System Architecture"]
    
    top_skills_str = ", ".join(skills_list[:6])

    job_title = job_data.get("title", "Software Engineer")
    company = job_data.get("company", "Target Company")
    description = job_data.get("description", "")[:1200]

    # Fetch researched company dossier
    dossier = get_company_research(company) or {}
    products_intel = ", ".join([p.get("name", "") for p in dossier.get("products", [])[:3] if p.get("name")])
    clients_intel = ", ".join([c.get("name", "") for c in dossier.get("clients_and_customers", [])[:3] if c.get("name")])
    why_hook = (dossier.get("interview_cheat_sheet") or {}).get("why_work_here_hook", "")

    context = f"""
    Candidate: {candidate_name} ({candidate_title})
    Skills: {top_skills_str}
    Target Role: {job_title} at {company}
    JD Snippet: {description}
    Company Products: {products_intel or company + ' Technology Platform'}
    Notable Clients: {clients_intel or 'Enterprise Clients'}
    Research Hook: {why_hook}
    """

    user_prompt = f"Generate an executive interview preparation pack for this candidate and target role:\n{context}"

    try:
        res = query_llm(user_prompt, system_prompt=SYSTEM_INTERVIEW_PROMPT, json_mode=True, timeout=20)
        if res.get("success") and res.get("text"):
            raw_text = res["text"].strip()
            clean_json = re.sub(r"^```(?:json)?\n?", "", raw_text)
            clean_json = re.sub(r"\n?```$", "", clean_json)
            data = json.loads(clean_json)
            data["provider"] = res.get("provider", "local_llm")
            data["model"] = res.get("model", "local")
            return data
    except Exception as e:
        print(f"Interview prep LLM query fallback: {e}")

    # High-impact heuristic fallback pack
    prod_name = products_intel.split(",")[0] if products_intel else f"{company}'s core platform"
    return {
        "role_title": job_title,
        "company": company,
        "technical_questions": [
            {
                "question": f"How would you design a scalable service handling high concurrent reads and writes for {company}'s architecture?",
                "model_answer": f"I would utilize an event-driven microservices pattern with API gateway throttling, distributed caching (Redis) for hot read paths, and asynchronous message streaming (Kafka) for durable write ingest. Database partitioning and read replicas ensure database scaling without locking.",
                "key_topics": ["System Design", "Caching Strategies", "Distributed Queues", "Database Sharding"]
            },
            {
                "question": f"Given your experience in {top_skills_str}, how do you diagnose and eliminate memory leaks or database query latency in production?",
                "model_answer": "I start by instrumenting APM metrics (latency p95/p99 spikes), isolating slow queries with EXPLAIN ANALYZE, inspecting index utilization, and reviewing recent connection pooling limits. For memory leaks, heap snapshots and profiling across garbage collection cycles reveal unbounded object retention.",
                "key_topics": ["Profiling", "Query Optimization", "Performance Diagnostics"]
            }
        ],
        "company_and_product_questions": [
            {
                "question": f"Why do you want to join {company} specifically?",
                "strategic_talking_points": why_hook or f"Highlight {company}'s impact in building {prod_name}. Emphasize that your technical foundation in {top_skills_str} solves their specific scaling challenges."
            },
            {
                "question": f"How would you improve the reliability or user latency of {prod_name}?",
                "strategic_talking_points": f"Discuss introducing edge caching, background job queues, and robust circuit breakers to guarantee graceful degradation under sudden traffic spikes."
            }
        ],
        "behavioral_star_questions": [
            {
                "question": "Tell me about a time you resolved a major production outage or disagreement over technical architecture.",
                "star_framework_guide": "Situation: High-severity incident or design deadlock. Task: Restore stability or achieve consensus. Action: Data-driven root cause analysis and blameless post-mortem. Result: 99.99% uptime restored and reusable automated test suite built.",
                "sample_response": "During a critical deployment, our latency surged by 300%. I quickly rolled back the change, used distributed traces to identify an unindexed foreign key in a new join query, deployed an indexed migration in staging, and prevented future recurrences by adding automated query linting to CI/CD."
            }
        ],
        "questions_to_ask_interviewer": [
            f"What does the engineering roadmap look like for {prod_name} over the next two quarters?",
            "How does your engineering team measure developer velocity, code reviews, and production deployment confidence?",
            "What has been the most challenging distributed systems trade-off your team tackled recently?"
        ],
        "cheat_sheet_tips": [
            "Structure every answer using STAR: Situation, Task, Action, and Quantifiable Result.",
            f"Reference {company}'s real products ({prod_name}) naturally to prove you are thoroughly prepared.",
            "Ask clarifying questions before jumping into system design solutions."
        ],
        "provider": "heuristic_coach",
        "model": "built-in"
    }
