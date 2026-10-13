"""
Coder Skill Engine for JobPulse AI & Local LLM
Provides specialized technical problem-solving, code review, LaTeX syntax debugging,
and technical assessment capabilities using Ollama, LM Studio, or Gemini.
"""

import json
import re
from ai.local_llm import query_llm
from utils.parser import clean_json

CODER_SYSTEM_PROMPT = """You are an Elite Principal Systems Architect, Staff Software Engineer, and Expert Coder.
You have deep mastery across:
- Python, Go, TypeScript, Rust, C++, Java, SQL, React, Node.js
- Distributed Systems, Concurrency, Algorithms, and System Design (Google, Meta, Amazon bar)
- LaTeX document compilation, resume typesetting, and typography syntax
- Clean Code, Refactoring, Big-O Complexity, and Security best practices

When answering:
1. Write idiomatic, production-grade, highly-performant code.
2. Provide exact time and space complexity (Big-O).
3. Handle edge cases, null checks, and race conditions gracefully.
4. For LaTeX, produce compile-safe code with properly escaped characters.
5. If returning JSON, output ONLY valid JSON without Markdown fences or conversational text.
"""

def solve_code_challenge(problem_statement, language="python", constraints=""):
    """
    Solves complex algorithmic or system challenges with optimal complexity and tests.
    """
    prompt = f"""
    Problem Statement:
    {problem_statement}

    Target Language: {language}
    Constraints / Requirements: {constraints or "Optimal time and space complexity"}

    Please provide:
    1. Comprehensive Solution with detailed inline comments
    2. Complexity Analysis (Time Complexity & Space Complexity)
    3. Edge Cases Handled
    4. Unit Test Verification Cases
    """
    return query_llm(prompt, system_prompt=CODER_SYSTEM_PROMPT)

def review_code(code_snippet, language="python", context=""):
    """
    Performs a senior-level code review: identifies bugs, performance bottlenecks,
    security vulnerabilities, and refactoring recommendations.
    """
    prompt = f"""
    Review this {language} code:
    Context: {context or "Production codebase"}

    ```
    {code_snippet}
    ```

    Evaluate:
    1. Code Correctness & Potential Bugs
    2. Algorithmic Efficiency & Bottlenecks (Big-O)
    3. Security Vulnerabilities & Edge Cases
    4. Clean Code & Architectural Refactoring
    5. Optimized / Refactored Code Drop-in Replacement
    """
    return query_llm(prompt, system_prompt=CODER_SYSTEM_PROMPT)

def fix_latex_cv_syntax(latex_source, error_message=""):
    """
    Diagnoses and automatically fixes LaTeX compilation errors, unescaped characters,
    bad packages, or geometry overflow in resume and cover letter templates.
    """
    prompt = f"""
    Diagnose and fix this LaTeX source code:
    Error Output: {error_message or "Compilation error or unescaped characters"}

    LaTeX Source Code:
    ```latex
    {latex_source}
    ```

    Requirements:
    1. Identify all unescaped special characters (%, &, _, #, $, ^, ~, \\).
    2. Fix broken environments, missing braces, or invalid package arguments.
    3. Ensure clean 1-page fit and ATS parser compatibility.
    4. Output the complete corrected LaTeX code.
    """
    res = query_llm(prompt, system_prompt=CODER_SYSTEM_PROMPT)
    fixed_code = res.get("text", "")
    # Extract code if wrapped in code blocks
    code_match = re.search(r'```(?:latex|tex)?\s*(.*?)\s*```', fixed_code, re.DOTALL)
    if code_match:
        fixed_code = code_match.group(1).strip()
    return {
        "success": res.get("success", False),
        "fixed_latex": fixed_code or latex_source,
        "raw_response": res.get("text", ""),
        "provider": res.get("provider", "none")
    }

def assess_tech_stack_alignment(candidate_skills, job_requirements):
    """
    Evaluates candidate tech stack alignment against required competencies
    from a Senior/Staff Engineering perspective.
    """
    prompt = f"""
    Compare Candidate Tech Stack vs Required Job Stack:

    Candidate Skills:
    {json.dumps(candidate_skills, indent=2) if isinstance(candidate_skills, (dict, list)) else candidate_skills}

    Target Requirements:
    {json.dumps(job_requirements, indent=2) if isinstance(job_requirements, (dict, list)) else job_requirements}

    Return a JSON object with:
    {{
      "match_percentage": <0-100 integer>,
      "strong_matches": [<matched key skills>],
      "critical_gaps": [<missing must-have skills>],
      "architectural_strengths": "<summary of senior strengths>",
      "bridge_recommendations": [<actionable steps to bridge gaps before interview>]
    }}
    """
    res = query_llm(prompt, system_prompt=CODER_SYSTEM_PROMPT, json_mode=True)
    try:
        parsed = clean_json(res.get("text", ""))
        return {"success": True, "assessment": parsed}
    except Exception:
        return {"success": res.get("success", False), "assessment_text": res.get("text", "")}

def generate_tech_interview_questions(role_title, tech_stack, seniority="Senior"):
    """
    Generates senior-level coding, concurrency, and system design interview questions
    with model answers and evaluation rubrics.
    """
    prompt = f"""
    Generate deep technical interview questions for:
    Role: {role_title} ({seniority} Level)
    Core Stack: {', '.join(tech_stack) if isinstance(tech_stack, list) else tech_stack}

    Provide:
    1. 2 Algorithmic / Coding Challenges with optimal solutions
    2. 2 Low-Level Design / Concurrency / Architecture Questions
    3. 1 High-Scale System Design Scenario (scalability, storage, bottlenecks)
    4. Ideal Candidate Signals vs Red Flags
    """
    return query_llm(prompt, system_prompt=CODER_SYSTEM_PROMPT)
