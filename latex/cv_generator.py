import os
import re
import subprocess
import shutil
import urllib.parse
from datetime import datetime

LATEX_DIR = os.path.dirname(__file__)
TEMPLATE_PATH = os.path.join(LATEX_DIR, 'template.tex')
OUTPUT_DIR = os.path.join(os.path.dirname(LATEX_DIR), 'output')

os.makedirs(OUTPUT_DIR, exist_ok=True)

def escape_latex(text):
    """
    Escapes LaTeX special characters so strings compile cleanly without syntax errors.
    """
    if not text or not isinstance(text, str):
        return ""
    
    # Order matters: backslash first
    replacements = [
        ('\\', r'\textbackslash{}'),
        ('&', r'\&'),
        ('%', r'\%'),
        ('$', r'\$'),
        ('#', r'\#'),
        ('_', r'\_'),
        ('{', r'\{'),
        ('}', r'\}'),
        ('~', r'\textasciitilde{}'),
        ('^', r'\textasciicircum{}'),
    ]
    for char, replacement in replacements:
        # Avoid escaping links or existing commands if already formatted
        text = text.replace(char, replacement)
    return text

def build_education_section(edu_list):
    items = []
    for edu in edu_list:
        institution = escape_latex(edu.get('institution', ''))
        loc = escape_latex(edu.get('location', ''))
        degree = escape_latex(edu.get('degree', ''))
        dates = escape_latex(edu.get('dates', ''))
        details = escape_latex(edu.get('details', ''))
        gpa = escape_latex(edu.get('gpa', ''))

        subheading = f"    \\resumeSubheading\n      {{{institution}}}{{{loc}}}\n      {{{degree}}}{{{dates}}}"
        
        extra = []
        if gpa:
            extra.append(f"\\textbf{{GPA:}} {gpa}")
        if details:
            extra.append(details)
            
        if extra:
            detail_line = " $|$ ".join(extra)
            item_block = f"{subheading}\n    \\resumeItemListStart\n      \\resumeItem{{{detail_line}}}\n    \\resumeItemListEnd"
        else:
            item_block = subheading
            
        items.append(item_block)
    return "\n".join(items)

def build_experience_section(exp_list):
    items = []
    for exp in exp_list:
        comp = escape_latex(exp.get('company', ''))
        loc = escape_latex(exp.get('location', ''))
        role = escape_latex(exp.get('role', ''))
        dates = escape_latex(exp.get('dates', ''))
        bullets = exp.get('bullets', [])
        
        block = [
            f"    \\resumeSubheading",
            f"      {{{comp}}}{{{loc}}}",
            f"      {{{role}}}{{{dates}}}",
            f"    \\resumeItemListStart"
        ]
        for b in bullets:
            esc_b = escape_latex(b)
            block.append(f"      \\resumeItem{{{esc_b}}}")
        block.append("    \\resumeItemListEnd")
        items.append("\n".join(block))
    return "\n".join(items)

def build_projects_section(proj_list):
    items = []
    for proj in proj_list:
        name = escape_latex(proj.get('name', ''))
        tech = escape_latex(proj.get('technologies', ''))
        link = escape_latex(proj.get('link', ''))
        bullets = proj.get('bullets', [])
        
        title_part = f"\\textbf{{{name}}}"
        if tech:
            title_part += f" $|$ \\emph{{{tech}}}"
            
        block = [
            f"    \\resumeProjectHeading",
            f"      {{{title_part}}}{{{link}}}",
            f"    \\resumeItemListStart"
        ]
        for b in bullets:
            esc_b = escape_latex(b)
            block.append(f"      \\resumeItem{{{esc_b}}}")
        block.append("    \\resumeItemListEnd")
        items.append("\n".join(block))
    return "\n".join(items)

def build_skills_section(skills_dict):
    lines = []
    for category, skills in skills_dict.items():
        cat_name = escape_latex(category)
        if isinstance(skills, list):
            s_str = ", ".join(escape_latex(s) for s in skills)
        else:
            s_str = escape_latex(str(skills))
        lines.append(f"     \\textbf{{{cat_name}}}{{: {s_str}}} \\\\")
    return "\n".join(lines)

def generate_latex_cv(profile=None, job_data=None, output_filename=None, filename=None):
    """
    Generates tailored LaTeX CV string and writes .tex file to output folder.
    """
    if not output_filename and filename:
        output_filename = filename
    if not profile or not isinstance(profile, dict):
        profile_json_path = os.path.join(LATEX_DIR, 'default_profile.json')
        if os.path.exists(profile_json_path):
            import json
            try:
                with open(profile_json_path, 'r', encoding='utf-8') as pf:
                    profile = json.load(pf)
            except Exception:
                profile = {}
        else:
            profile = {}

    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        template = f.read()

    name = escape_latex(profile.get('name', 'Job Applicant'))
    phone = escape_latex(profile.get('phone', ''))
    email = escape_latex(profile.get('email', ''))
    linkedin = profile.get('linkedin', '').replace('https://', '').replace('http://', '').strip('/')
    github = profile.get('github', '').replace('https://', '').replace('http://', '').strip('/')
    portfolio = profile.get('portfolio', '').replace('https://', '').replace('http://', '').strip('/')
    location = escape_latex(profile.get('location', ''))

    portfolio_line = ""
    if portfolio:
        portfolio_line = f"$|$ \\href{{https://{portfolio}}}{{\\underline{{{escape_latex(portfolio)}}}}}"

    summary = profile.get('summary', '')
    summary_section = ""
    if summary:
        esc_summary = escape_latex(summary)
        summary_section = f"%-----------SUMMARY-----------\n\\section{{Summary}}\n  \\small{{{esc_summary}}}\n"

    # Experience - check if tailored bullets exist
    experience = profile.get('experience', [])
    if job_data and job_data.get('tailored_experience'):
        experience = job_data['tailored_experience']

    edu_items = build_education_section(profile.get('education', []))
    exp_items = build_experience_section(experience)
    proj_items = build_projects_section(profile.get('projects', []))
    skills_items = build_skills_section(profile.get('skills', {}))

    certs = profile.get('certifications', [])
    cert_section = ""
    if certs:
        cert_items = "\n".join([f"    \\resumeItem{{{escape_latex(c)}}}" for c in certs])
        cert_section = f"%-----------CERTIFICATIONS-----------\n\\section{{Certifications}}\n  \\resumeItemListStart\n{cert_items}\n  \\resumeItemListEnd\n"

    achievements = profile.get('achievements', [])
    achievements_section = ""
    if achievements:
        ach_items = "\n".join([f"    \\resumeItem{{{escape_latex(a)}}}" for a in achievements])
        achievements_section = f"%-----------ACHIEVEMENTS-----------\n\\section{{Achievements \\& Leadership}}\n  \\resumeItemListStart\n{ach_items}\n  \\resumeItemListEnd\n"

    content = template
    replacements = {
        "(( CANDIDATE_NAME ))": name,
        "(( PHONE ))": phone,
        "(( EMAIL ))": email,
        "(( LINKEDIN ))": escape_latex(linkedin),
        "(( GITHUB ))": escape_latex(github),
        "(( PORTFOLIO_LINE ))": portfolio_line,
        "(( LOCATION ))": location,
        "(( SUMMARY_SECTION ))": summary_section,
        "(( EDUCATION_ITEMS ))": edu_items,
        "(( EXPERIENCE_ITEMS ))": exp_items,
        "(( PROJECT_ITEMS ))": proj_items,
        "(( SKILLS_ITEMS ))": skills_items,
        "(( ACHIEVEMENTS_SECTION ))": achievements_section,
        "(( CERTIFICATIONS_SECTION ))": cert_section,
    }

    for placeholder, val in replacements.items():
        content = content.replace(placeholder, val)

    # Save to output file
    if not output_filename:
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', profile.get('name', 'Resume'))
        suffix = "_Tailored" if job_data else ""
        output_filename = f"{safe_name}{suffix}_CV.tex"

    tex_path = os.path.join(OUTPUT_DIR, output_filename)
    with open(tex_path, 'w', encoding='utf-8') as f:
        f.write(content)

    # Attempt PDF Compilation if pdflatex or tectonic is in PATH
    pdf_path = None
    pdf_compiled = False
    compile_err = None

    compiler = shutil.which("pdflatex") or shutil.which("tectonic") or shutil.which("xelatex")
    if compiler:
        try:
            if "tectonic" in compiler:
                cmd = [compiler, tex_path, "--outdir", OUTPUT_DIR]
            else:
                cmd = [compiler, "-interaction=nonstopmode", f"-output-directory={OUTPUT_DIR}", tex_path]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
            target_pdf = tex_path.replace('.tex', '.pdf')
            if os.path.exists(target_pdf):
                pdf_path = target_pdf
                pdf_compiled = True
        except Exception as e:
            compile_err = str(e)

    # Prepare Overleaf encoded export link / helper
    encoded_tex = urllib.parse.quote(content)
    overleaf_direct_url = f"https://www.overleaf.com/docs?snip_uri=data:application/x-tex;charset=utf-8,{encoded_tex[:2000]}"

    return {
        "latex_code": content,
        "tex_path": tex_path,
        "tex_filename": output_filename,
        "pdf_compiled": pdf_compiled,
        "pdf_path": pdf_path,
        "compiler_available": bool(compiler),
        "compile_error": compile_err,
        "overleaf_url": overleaf_direct_url
    }
