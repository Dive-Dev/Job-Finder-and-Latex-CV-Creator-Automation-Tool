import os
import re
import shutil
import subprocess
import urllib.parse
from datetime import datetime
from latex.cv_generator import escape_latex, OUTPUT_DIR, LATEX_DIR
from ai.cover_letter_tailor import generate_tailored_cover_letter_content

COVER_TEMPLATE_PATH = os.path.join(LATEX_DIR, 'cover_letter_template.tex')

def generate_cover_letter(profile=None, job_data=None, recipient_info=None, paragraphs=None, output_filename=None):
    """
    Assembles a professional ATS LaTeX cover letter and writes .tex to output/
    """
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

    job_data = job_data or {}
    recipient_info = recipient_info or {}

    with open(COVER_TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        template = f.read()

    name = escape_latex(profile.get('name', 'Job Applicant'))
    title = escape_latex(profile.get('title', 'Software Engineer'))
    phone = escape_latex(profile.get('phone', ''))
    email = escape_latex(profile.get('email', ''))
    linkedin = profile.get('linkedin', '').replace('https://', '').replace('http://', '').strip('/')
    github = profile.get('github', '').replace('https://', '').replace('http://', '').strip('/')
    portfolio = profile.get('portfolio', '').replace('https://', '').replace('http://', '').strip('/')
    location = escape_latex(profile.get('location', ''))

    portfolio_line = f" $|$ \\href{{https://{portfolio}}}{{\\underline{{{portfolio}}}}}" if portfolio else ""

    date_str = datetime.now().strftime("%B %d, %Y")
    
    company = escape_latex(job_data.get('company', 'Hiring Organization'))
    company_location = escape_latex(job_data.get('location', 'Bengaluru, India'))
    
    recip_name = escape_latex(recipient_info.get('name') or "Hiring Team")
    recip_title = escape_latex(recipient_info.get('title') or "Technical Recruiting & Engineering Leadership")
    salutation = escape_latex(recipient_info.get('name') or f"Hiring Team at {job_data.get('company', 'the organization')}")

    # Generate content paragraphs if not directly provided
    if not paragraphs:
        paragraphs = generate_tailored_cover_letter_content(profile, job_data, recipient_info)

    p_open = escape_latex(paragraphs.get("opening", ""))
    p_core = escape_latex(paragraphs.get("core_experience", ""))
    p_values = escape_latex(paragraphs.get("values_and_impact", ""))
    p_close = escape_latex(paragraphs.get("closing", ""))

    content = template.replace('<<NAME>>', name)
    content = content.replace('<<TITLE>>', title)
    content = content.replace('<<PHONE>>', phone)
    content = content.replace('<<EMAIL>>', email)
    content = content.replace('<<LINKEDIN>>', linkedin)
    content = content.replace('<<GITHUB>>', github)
    content = content.replace('<<PORTFOLIO_LINE>>', portfolio_line)
    content = content.replace('<<LOCATION>>', location)
    content = content.replace('<<DATE>>', date_str)
    content = content.replace('<<RECIPIENT_NAME>>', recip_name)
    content = content.replace('<<RECIPIENT_TITLE>>', recip_title)
    content = content.replace('<<COMPANY_NAME>>', company)
    content = content.replace('<<COMPANY_LOCATION>>', company_location)
    content = content.replace('<<SALUTATION_NAME>>', salutation)
    content = content.replace('<<OPENING_PARAGRAPH>>', p_open)
    content = content.replace('<<CORE_EXPERIENCE_PARAGRAPH>>', p_core)
    content = content.replace('<<VALUES_AND_IMPACT_PARAGRAPH>>', p_values)
    content = content.replace('<<CLOSING_PARAGRAPH>>', p_close)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if not output_filename:
        safe_comp = re.sub(r'[^a-zA-Z0-9]', '', job_data.get('company', 'Company'))
        safe_role = re.sub(r'[^a-zA-Z0-9]', '', (job_data.get('title', 'Role')).split()[0])
        output_filename = f"CoverLetter_{safe_comp}_{safe_role}.tex"

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
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
            target_pdf = tex_path.replace('.tex', '.pdf')
            if os.path.exists(target_pdf):
                pdf_path = target_pdf
                pdf_compiled = True
        except Exception as e:
            compile_err = str(e)

    encoded_tex = urllib.parse.quote(content)
    overleaf_direct_url = f"https://www.overleaf.com/docs?snip_uri=data:application/x-tex;charset=utf-8,{encoded_tex[:2000]}"

    plain_text = (
        f"{profile.get('name', '')}\n{profile.get('email', '')} | {profile.get('phone', '')}\n\n"
        f"Date: {date_str}\nTo: {recipient_info.get('name') or 'Hiring Team'}\n{job_data.get('company', '')}\n\n"
        f"Dear {recipient_info.get('name') or 'Hiring Team'},\n\n"
        f"{paragraphs.get('opening', '')}\n\n"
        f"{paragraphs.get('core_experience', '')}\n\n"
        f"{paragraphs.get('values_and_impact', '')}\n\n"
        f"{paragraphs.get('closing', '')}\n\n"
        f"Sincerely,\n{profile.get('name', '')}\n{profile.get('title', '')}"
    )

    return {
        "latex_code": content,
        "tex_path": tex_path,
        "tex_filename": output_filename,
        "pdf_compiled": pdf_compiled,
        "pdf_path": pdf_path,
        "compiler_available": bool(compiler),
        "compile_error": compile_err,
        "overleaf_url": overleaf_direct_url,
        "paragraphs": paragraphs,
        "plain_text": plain_text
    }
