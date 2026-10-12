# 🚀 JobPulse AI — Smart Job Finder & ATS LaTeX CV Creator

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/backend-Flask-black.svg)](https://palletsprojects.com/p/flask/)
[![LaTeX](https://img.shields.io/badge/latex-ATS--Optimized-green.svg)](https://www.latex-project.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An intelligent, end-to-end automation suite for discovering high-signal job opportunities, finding official company career sites, matching your candidate profile against job descriptions, and generating ATS-optimized LaTeX CVs ready for 1-click application.

---

## ✨ Key Features

### 1. 🎯 LinkedIn Job Search URL Scraper (Authenticated & Public)
- **Authenticated Search URL Parsing:** Paste any URL copied straight from your logged-in browser session (e.g. `https://www.linkedin.com/jobs/search/?currentJobId=3948572834&keywords=Python&location=Bengaluru&geoId=105214831&f_TPR=r86400&f_WT=1%2C2`).
  - Automatically captures the currently viewed job (`currentJobId`) with full descriptions.
  - Automatically inherits and honors your authenticated search filters: Time Posted (`f_TPR`), Work Type (`f_WT`), Experience Level (`f_E`), Job Type (`f_JT`), Easy Apply (`f_AL`), and Company filters.
- **Optional Member Session Cookie (`li_at`):** Provide your `li_at` session cookie to scrape member-only jobs, 1st-degree connection postings, and private recommendations without getting blocked.
- **Public Guest API Fallback:** Works immediately out of the box even without credentials or session cookies.
- **Automatic Company Discovery:** Links each job post directly to the company's official career portal and ATS.

### 2. 🇮🇳 Bengaluru & Karnataka Tech Job Optimizer (Silicon Valley of India)
- **Multi-Option Role & Hub Select:** Concurrently target multiple tech roles (`Full Stack Developer`, `Python Developer`, `Backend Engineer`, `React`, `DevOps`) and key tech hubs (`Bellandur / ORR`, `Koramangala / HSR`, `Whitefield`, `Electronic City`, `Manyata Tech Park`, `Indiranagar`).
- **Bengaluru GeoID Integration:** Uses LinkedIn's official Bengaluru Metropolitan Area geo identifier (`geoId = 105214831`) for high-precision metro targeting.
- **Bilingual Geographic Matcher:** Automatically expands queries with Boolean `("Bengaluru" OR "Bangalore" OR "Bengaluru, Karnataka")` across ATS engines.
- **Top Unicorn Portals & ATS:** Direct links to top Bengaluru tech ecosystems (Flipkart, Swiggy, Razorpay, CRED, Zepto, Google India) + Indian ATS portals (`darwinbox.in`, `greenhouse.io`, `lever.co`, `ashbyhq.com`).
- **⚡ 1-Click Quick Search:** Aggregates and ranks jobs from direct ATS platforms and LinkedIn simultaneously with ATS compatibility scores.

### 3. 🔍 Google Search & Direct ATS Finder (No Spam)
- **Targeted Discovery:** Search by **Role**, **Location**, **Experience Level**, and **Work Arrangement** (Remote, Hybrid, On-site).
- **Direct ATS Dorking:** Built-in search operators filter out aggregator spam and focus strictly on direct applicant tracking systems:
  - `boards.greenhouse.io`
  - `jobs.lever.co`
  - `jobs.ashbyhq.com`
  - `myworkdayjobs.com`
  - `apply.workable.com`
  - `darwinbox.in` (leading enterprise ATS in India)
- **Preference Keywords:** Add required skills or stacks (e.g., `Python, React, AWS, Docker`) to pinpoint dream openings.

### 3. 👥 HR, Recruiters & Employee Referral Intelligence
- **LinkedIn X-Ray Contact Finder:** Uncovers verified **Technical Recruiters**, **Talent Acquisition Specialists**, **Engineering Managers**, and **Team Members/Alumni** for any target company.
- **Enterprise Email Pattern Predictor:** Predicts corporate email formats (e.g., `first.last@company.com`, `first@company.com`) for direct outreach.
- **Personalized Referral Message Studio:**
  - ⚡ **LinkedIn Connection Request Note:** Tailored strictly under 300 characters to fit LinkedIn's free invitation limits.
  - ✉️ **InMail & Cold Email Drafts:** Custom pitches for internal employee referrals, recruiter follow-ups, and hiring manager inquiries.
- **Networking Tracker:** Save contacts and track outreach status (`Not Contacted` ➔ `Message Sent` ➔ `Connected` ➔ `Call Scheduled` ➔ `Referred`).

### 4. 🏢 Company Career Sites & ATS Explorer
- **Instant Career Portal Lookup:** Enter any company name (e.g., *Stripe, OpenAI, Spotify, Figma*) or domain to instantly detect their official career site and underlying ATS platform.
- **Direct Apply Links:** Bypass third-party job boards to apply directly on company hiring systems.

### 5. 📄 LaTeX CV Studio & ATS Tailoring
- **Gold-Standard ATS Template:** Single-column, battle-tested modern LaTeX resume layout (Jake's Resume / Clean Academic-Industry style).
- **Special Character Escaping:** Comprehensive LaTeX character sanitization (`%`, `&`, `$`, `#`, `_`, `{`, `}`, `~`, `^`) prevents compilation errors.
- **AI STAR Bullet Tailoring:** Dynamically tailors your experience bullet points to match the target job's keywords using the Google XYZ / STAR formula.
- **1-Click Overleaf Export:** Built-in "Open in Overleaf" button sends LaTeX code directly to Overleaf for instant cloud PDF compiling in your browser.
- **Local PDF Compilation:** Automatically compiles with `pdflatex` or `tectonic` if installed on your machine.

### 6. 🤖 AI Job Description Analyzer & Outreach Generator
- **Deep ATS Breakdown:** Extracts Role, Experience Level, Core Skills, ATS Keywords, and Responsibilities.
- **Compatibility Match Score:** Computes a 0–100% compatibility rating against your master profile with gap analysis (matched vs. missing skills).
- **Cold Outreach Writer:** Automatically crafts high-converting LinkedIn InMail messages and tailored cover letters for hiring managers.
- **Offline Fallback:** Features a built-in heuristic NLP/regex engine that works offline even without an AI API key!

### 7. 📋 Kanban Pipeline & Dual Persistence
- **Interactive Kanban Board:** Move jobs seamlessly through `Wishlist` ➔ `Applied` ➔ `Interviewing` ➔ `Offer` ➔ `Rejected`.
- **⚡ 1-Click Apply:** Opens application portals and automatically updates status to "Applied" with timestamps.
- **Dual Persistence:** Always-ready local SQLite database (`jobs.db`) + optional 1-click sync to **Google Sheets** via `gspread`.

---

## 🏗️ Project Architecture

```
Job Finder and Latex CV Creator Automation Tool/
├── app.py                      # Flask Web Dashboard Backend & REST API
├── main.py                     # Interactive CLI & Launch Entrypoint
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variables template
├── jobs.db                     # SQLite database (auto-created)
│
├── ai/
│   ├── jd_analyzer.py          # Gemini AI & local heuristic JD extractor
│   └── cv_tailor.py            # ATS Match scoring, STAR bullet points, cold outreach
│
├── scraper/
│   ├── linkedin_scraper.py     # LinkedIn Search URL & guest API scraper
│   ├── google_scraper.py       # Google Search with ATS dorking & filters
│   └── company_scraper.py      # Company official website & career page finder
│
├── latex/
│   ├── template.tex            # Clean single-column ATS LaTeX resume template
│   ├── cv_generator.py         # LaTeX generator, sanitizer & Overleaf export
│   └── default_profile.json    # Candidate master profile
│
├── sheets/
│   ├── sheets_client.py        # Google Sheets integration (gspread)
│   └── local_db.py             # SQLite persistence & stats
│
├── templates/
│   └── index.html              # Sleek modern dashboard
├── static/
│   ├── css/style.css           # Premium dark glassmorphism design system
│   └── js/app.js               # Reactive SPA logic, scrapers & Kanban
│
└── output/                     # Generated .tex and .pdf files
```

---

## ⚡ Quick Start

### 1. Installation

Clone the repository and install requirements:

```bash
git clone https://github.com/Dive-Dev/Job-Finder-and-Latex-CV-Creator-Automation-Tool.git
cd "Job Finder and Latex CV Creator Automation Tool"

pip install -r requirements.txt
```

### 2. Launch the Web Dashboard (Recommended)

Start the modern UI on `http://localhost:5000`:

```bash
python main.py --ui
```
*Or:*
```bash
python app.py
```

Open your browser to [http://localhost:5000](http://localhost:5000) to access the complete Job Finder & CV Creator studio.

### 3. Interactive CLI Mode

Prefer running from the terminal? Simply run:

```bash
python main.py
```

You will see an interactive menu to scrape LinkedIn, search Google, analyze JDs, generate LaTeX CVs, or sync to Sheets:
```
=================================================================
  🚀 JOB FINDER & ATS LATEX CV CREATOR AUTOMATION TOOL  
=================================================================
1. 🎯 Scrape LinkedIn Jobs from Search URL or Keywords
2. 🔍 Google Search Jobs (Roles, Location, Preferences, ATS Dorks)
3. 🏢 Find Official Company Career Site
4. 🤖 Analyze Job Description & Compute ATS Match
5. 📄 Generate ATS Tailored LaTeX CV (.tex / .pdf)
6. 🌐 Launch Modern Web Dashboard UI (Recommended)
7. 📊 View Tracked Applications & Stats
8. 📋 Sync Jobs to Google Sheets
0. ❌ Exit
-----------------------------------------------------------------
```

---

## ⚙️ Configuration (.env)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Free API key from [Google AI Studio](https://aistudio.google.com/app/apikey) | *(Optional, local fallback used if blank)* |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google Service Account JSON | `creds.json` |
| `GOOGLE_SHEET_NAME` | Target Google Spreadsheet title | `Job Applications Tracker` |
| `PORT` | Local web server port | `5000` |

### Setting up Google Sheets (Optional):
1. Create a service account in Google Cloud Console.
2. Download the JSON key and save it as `creds.json` in the project root.
3. Share your Google Sheet with the `client_email` listed in `creds.json`.
4. Click **"Sync Sheets"** in the top navigation or Pipeline tab.

---

## 📖 Step-by-Step Usage Guide

### 1. Scraping LinkedIn Jobs
1. Go to the **Discovery** tab.
2. In the LinkedIn card, paste any search URL:
   - Example: `https://www.linkedin.com/jobs/search?keywords=Software%20Engineer&location=Remote`
   - Or just enter keywords like `"Machine Learning Engineer"` and location `"New York"`.
3. Check *Automatically discover company official career pages*.
4. Click **"Scrape LinkedIn Jobs"**.
5. Discovered jobs appear with ATS match ratings, 1-click apply buttons, and career portal links.

### 2. Google Search & Direct ATS Postings
1. In the Google card, enter:
   - **Role:** e.g., `Senior Full Stack Developer`
   - **Location:** e.g., `Remote`
   - **Experience:** `Mid level` or `Senior`
   - **Tech Stack:** `Python, React, Docker`
2. Keep **Direct ATS filter** checked to search directly on Greenhouse, Lever, Ashby, and Workday.
3. Click **"Search Direct Opportunities"**.

### 3. Generating & Tailoring your LaTeX CV
1. Open the **LaTeX CV Studio** tab.
2. Update your master information (Education, Experience, Projects, Skills).
3. Select any tracked job from the dropdown to tailor your resume for that specific company.
4. Click **"AI STAR Tailoring"** or **"Generate LaTeX CV"**.
5. The system generates ATS-ready LaTeX code in the editor pane.
6. Click **"🍃 Open Overleaf"** to open and compile the PDF with 1-click in the cloud, or **"Download .tex"** to compile locally.

### 4. 1-Click Application & Kanban Tracking
1. Open the **Pipeline** tab to view your active application board.
2. Click **⚡ 1-Click Apply** on any job card. It will open the company application portal in a new tab and update the job to **"Applied"**.
3. Drag or update statuses between **Wishlist**, **Applied**, **Interviewing**, **Offer**, and **Rejected**.
4. Click **"Push to Sheets"** to sync your updated pipeline to Google Sheets.

---

## 🛠️ Technology Stack

- **Backend:** Python 3.10+, Flask, SQLite
- **Web Scraping:** BeautifulSoup4, Requests, Public LinkedIn Guest API, DuckDuckGo / Google Search Dorking
- **AI & ATS Intelligence:** Google Gemini AI (`google-generativeai`) + Offline Rule-Based NLP Heuristics
- **LaTeX Engine:** ATS-Optimized Single Column Template, Special Character Sanitizer, Overleaf Snip API
- **Google Sheets:** `gspread`, `oauth2client`
- **Frontend:** Vanilla HTML5, CSS3 Glassmorphism System, Reactive JavaScript

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
