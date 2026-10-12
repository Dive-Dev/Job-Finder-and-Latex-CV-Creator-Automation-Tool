import os
import sys
import json
import argparse
from ai.jd_analyzer import analyze_jd
from ai.cv_tailor import calculate_ats_match, tailor_bullet_points, generate_cold_outreach
from sheets.sheets_client import append_job_to_sheet, sync_all_jobs_to_sheet
from sheets.local_db import save_job, get_all_jobs, get_user_profile, save_user_profile, get_stats
from scraper.linkedin_scraper import scrape_linkedin_jobs
from scraper.google_scraper import search_jobs_google
from scraper.company_scraper import find_company_career_site
from scraper.recruiter_finder import search_company_contacts, predict_company_email_patterns
from ai.referral_generator import generate_personalized_referral_outreach
from latex.cv_generator import generate_latex_cv

def load_default_profile():
    profile = get_user_profile()
    if not profile:
        profile_path = os.path.join(os.path.dirname(__file__), 'latex', 'default_profile.json')
        if os.path.exists(profile_path):
            with open(profile_path, 'r', encoding='utf-8') as f:
                profile = json.load(f)
                save_user_profile(profile)
    return profile

def interactive_cli():
    print("=" * 65)
    print("  🚀 JOB FINDER & ATS LATEX CV CREATOR AUTOMATION TOOL  ")
    print("=" * 65)
    print("1. 🎯 Scrape LinkedIn Jobs from Search URL or Keywords")
    print("2. 🔍 Google Search Jobs (Roles, Location, Preferences, ATS Dorks)")
    print("3. 🏢 Find Official Company Career Site")
    print("4. 🤖 Analyze Job Description & Compute ATS Match")
    print("5. 📄 Generate ATS Tailored LaTeX CV (.tex / .pdf)")
    print("6. 🌐 Launch Modern Web Dashboard UI (Recommended)")
    print("7. 📊 View Tracked Applications & Stats")
    print("8. 📋 Sync Jobs to Google Sheets")
    print("9. 👥 Find HR, Recruiters & Employees for Referrals")
    print("0. ❌ Exit")
    print("-" * 65)

    choice = input("Select an option (0-9) [Default: 6]: ").strip() or "6"

    if choice == "1":
        query = input("\nEnter LinkedIn Job Search URL (Authenticated or Public) or Keywords: ").strip()
        location = ""
        cookie = ""
        if not (query.startswith('http://') or query.startswith('https://')):
            location = input("Location [Default: 'Bengaluru, Karnataka, India']: ").strip() or "Bengaluru, Karnataka, India"
        else:
            from scraper.linkedin_scraper import parse_linkedin_search_url
            meta = parse_linkedin_search_url(query)
            if meta.get('current_job_id'):
                print(f"🎯 Detected Active Job ID: #{meta['current_job_id']}")
            if meta.get('filters'):
                print(f"⚙️ Detected Authenticated Filters: {meta['filters']}")
            use_cookie = input("Use an authenticated LinkedIn session cookie (li_at)? (y/n) [n]: ").strip().lower()
            if use_cookie == 'y':
                cookie = input("Paste li_at cookie: ").strip()

        print(f"\n⏳ Scraping LinkedIn jobs & discovering company career sites...")
        jobs = scrape_linkedin_jobs(query, location=location, max_results=10, cookie=cookie)
        print(f"\n✅ Found {len(jobs)} jobs:")
        for idx, j in enumerate(jobs, 1):
            print(f"  {idx}. {j['title']} @ {j['company']} ({j['location']})")
            print(f"     Direct Job: {j['job_url']}")
            if j.get('career_page_url'):
                print(f"     Official Career Site: {j['career_page_url']} [{j.get('ats_provider')}]")
        
        save_opt = input("\nSave these jobs to application tracker? (y/n) [y]: ").strip().lower()
        if save_opt != 'n':
            for j in jobs:
                save_job(j)
            print(f"💾 Saved {len(jobs)} jobs to your database.")

    elif choice == "2":
        role = input("\nEnter Target Role(s) (comma-separated, e.g. 'Full Stack Engineer, Python Developer'): ").strip()
        location = input("Location [Default: 'Bengaluru, Karnataka, India']: ").strip() or "Bengaluru, Karnataka, India"
        pref = input("Keywords / Tech Stack (comma-separated, e.g. 'Python, React'): ").strip()
        ats_only = input("Search direct ATS portals (Greenhouse, Lever, Ashby)? (y/n) [y]: ").strip().lower() != 'n'
        
        print("\n⏳ Executing Google search & ATS discovery...")
        results = search_jobs_google(role, location, preferences={"keywords": pref, "ats_only": ats_only}, max_results=10)
        print(f"\n✅ Found {len(results)} opportunities:")
        for idx, j in enumerate(results, 1):
            print(f"  {idx}. {j['title']} @ {j['company']} [{j.get('ats_provider')}]")
            print(f"     Link: {j['job_url']}")
            if j.get('description'):
                print(f"     Snippet: {j['description'][:100]}...")
                
        save_opt = input("\nSave these jobs to application tracker? (y/n) [y]: ").strip().lower()
        if save_opt != 'n':
            for j in results:
                save_job(j)
            print(f"💾 Saved {len(results)} jobs.")

    elif choice == "3":
        company = input("\nEnter Company Name: ").strip()
        print("\n⏳ Discovering company career portal & ATS endpoints...")
        info = find_company_career_site(company)
        print("\n🏢 Company Details:")
        print(f"  Official Website: {info.get('official_site') or 'N/A'}")
        print(f"  Career Portal:    {info.get('career_page_url') or 'N/A'}")
        print(f"  ATS Platform:     {info.get('ats_provider')}")

    elif choice == "4":
        jd_text = input("\nPaste Job Description:\n")
        print("\n⏳ Analyzing JD with ATS engine...")
        analysis = analyze_jd(jd_text)
        print("\n📋 Extracted JD Insights:")
        print(f"  Role:             {analysis.get('role')}")
        print(f"  Experience:       {analysis.get('experience_level')}")
        print(f"  Skills:           {', '.join(analysis.get('skills', []))}")
        print(f"  Keywords:         {', '.join(analysis.get('keywords', []))}")
        
        profile = load_default_profile()
        match = calculate_ats_match(profile, analysis)
        print(f"\n🎯 ATS Match Score: {match['score']}%")
        print(f"  Matched Skills: {', '.join(match['matched_skills'])}")
        print(f"  Missing Skills: {', '.join(match['missing_skills'])}")

    elif choice == "5":
        profile = load_default_profile()
        print(f"\nUsing profile for: {profile.get('name')}")
        custom = input("Do you want to tailor for a specific role? (Enter role name or press Enter for master CV): ").strip()
        job_data = None
        if custom:
            job_data = {"role": custom, "title": custom, "skills": ["Python", "FastAPI", "Docker", "AWS"]}
        
        print("\n⏳ Generating ATS-optimized LaTeX CV...")
        res = generate_latex_cv(profile, job_data=job_data)
        print(f"\n✅ LaTeX CV created successfully at: {res['tex_path']}")
        if res.get('pdf_compiled'):
            print(f"🎉 Compiled PDF created at: {res['pdf_path']}")
        else:
            print("💡 Tip: Compile with pdflatex locally or click 'Open in Overleaf' in the Web UI!")

    elif choice == "6":
        launch_web_server()

    elif choice == "7":
        stats = get_stats()
        print("\n📊 Application Tracker Statistics:")
        print(f"  Total Jobs:     {stats['total']}")
        print(f"  Wishlist:       {stats['wishlist']}")
        print(f"  Applied:        {stats['applied']}")
        print(f"  Interviewing:   {stats['interviewing']}")
        print(f"  Offers:         {stats['offer']}")
        print(f"  Rejected:       {stats['rejected']}")

    elif choice == "8":
        jobs = get_all_jobs()
        print(f"\n⏳ Syncing {len(jobs)} jobs to Google Sheets...")
        success, msg = sync_all_jobs_to_sheet(jobs)
        if success:
            print(f"✅ {msg}")
        else:
            print(f"⚠️ {msg}")

    elif choice == "9":
        company = input("\nEnter Target Company Name: ").strip()
        print("Select target contact type:")
        print("  1. All Contacts (Recruiters, Managers, Peers)")
        print("  2. Technical Recruiters & Talent Acquisition")
        print("  3. Engineering Managers & Leaders")
        print("  4. Software Engineers & Alumni for Referrals")
        c_type_choice = input("Choice (1-4) [1]: ").strip() or "1"
        type_map = {"1": "all", "2": "recruiters", "3": "managers", "4": "employees"}
        c_type = type_map.get(c_type_choice, "all")

        location = input("Location [Default: 'Bengaluru, Karnataka, India']: ").strip() or "Bengaluru, Karnataka, India"
        print(f"\n⏳ Searching LinkedIn contacts for {company} in {location}...")
        contacts = search_company_contacts(company, contact_type=c_type, location=location, max_results=8)
        email_info = predict_company_email_patterns(company)
        print(f"\n📧 Predicted Company Email Format: {email_info['example']}")
        print(f"✅ Found {len(contacts)} verified profiles:")
        for idx, c in enumerate(contacts, 1):
            print(f"  {idx}. {c['name']} [{c['role_category']}]")
            print(f"     Title:    {c['headline']}")
            print(f"     LinkedIn: {c['profile_url']}")
            if c.get('predicted_email'):
                print(f"     Email:    {c['predicted_email']}")

        if contacts:
            gen = input("\nGenerate personalized outreach message for one of these contacts? (y/n) [y]: ").strip().lower()
            if gen != 'n':
                target_role = input("Target Role (e.g. 'Software Engineer'): ").strip() or "Software Engineer"
                outreach = generate_personalized_referral_outreach(
                    contact_name=contacts[0]['name'],
                    contact_role=contacts[0]['headline'],
                    company_name=company,
                    target_role=target_role,
                    candidate_profile=load_default_profile(),
                    outreach_type="referral" if c_type == "employees" else ("recruiter" if c_type == "recruiters" else "manager")
                )
                print("\n⚡ LinkedIn Connection Request Note (<300 chars):")
                print("-" * 50)
                print(outreach.get('connection_note'))
                print("-" * 50)
                print("\n✉️ Full Email / InMail Pitch:")
                print(f"Subject: {outreach.get('email_subject')}\n")
                print(outreach.get('full_message'))

    elif choice == "0":
        print("Goodbye!")
        sys.exit(0)

def launch_web_server():
    from app import app
    port = int(os.getenv("PORT", 5000))
    print(f"\n🚀 Launching Web Dashboard on http://localhost:{port} ...")
    app.run(host="0.0.0.0", port=port, debug=False)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Job Finder and LaTeX CV Creator Automation")
    parser.add_argument("--ui", action="store_true", help="Launch the Web UI dashboard directly")
    parser.add_argument("--port", type=int, default=5000, help="Web UI port (default: 5000)")
    args = parser.parse_args()

    load_default_profile()

    if args.ui:
        from app import app
        print(f"🚀 Launching Web Dashboard on http://localhost:{args.port} ...")
        app.run(host="0.0.0.0", port=args.port, debug=False)
    else:
        interactive_cli()