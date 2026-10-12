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
- **Top Unicorn Portals & ATS:** Direct links to top Bengaluru tech ecosystems (Flipkart, Swiggy, Razorpay, CRED, Zepto, Google India) + Indian and global ATS portals (`darwinbox.in`, `greenhouse.io`, `lever.co`, `smartrecruiters.com`, `myworkdayjobs.com`).
- **⚡ 1-Click Quick Search:** Aggregates and ranks jobs from direct ATS platforms and LinkedIn simultaneously with ATS compatibility scores.

### 3. 🔍 Google Search & Direct ATS Finder (No Spam)
- **Targeted Discovery:** Search by **Role**, **Location**, **Experience Level**, and **Work Arrangement** (Remote, Hybrid, On-site).
- **Direct ATS Dorking:** Built-in search operators filter out aggregator spam and focus strictly on direct applicant tracking systems:
  - `boards.greenhouse.io`
  - `jobs.lever.co`
  - `myworkdayjobs.com`
  - `apply.workable.com`
  - `darwinbox.in` (leading enterprise ATS in India)
  - `smartrecruiters.com`
- **Preference Keywords:** Add required skills or stacks (e.g., `Python, React, AWS, Docker`) to pinpoint dream openings.

### 3. 👥 HR, Recruiters & Employee Referral Intelligence
- **LinkedIn X-Ray Contact Finder:** Uncovers verified **Technical Recruiters**, **Talent Acquisition Specialists**, **Engineering Managers**, and **Team Members/Alumni** for any target company.
- **Enterprise Email Pattern Predictor:** Predicts corporate email formats (e.g., `first.last@company.com`, `first@company.com`) for direct outreach.
- **Personalized Referral Message Studio:**
  - ⚡ **LinkedIn Connection Request Note:** Tailored strictly under 300 characters to fit LinkedIn's free invitation limits.
  - ✉️ **InMail & Cold Email Drafts:** Custom pitches for internal employee referrals, recruiter follow-ups, and hiring manager inquiries.
- **Networking Tracker:** Save contacts and track outreach status (`Not Contacted` ➔ `Message Sent` ➔ `Connected` ➔ `Call Scheduled` ➔ `Referred`).

### 4. 🏢 Company Career Sites Explorer & Live Crawler
- **Curated Lookups Registry (60+ Employers):** Instant zero-latency lookups for top tech employers (Amazon, Google, Microsoft, Sandisk / Western Digital, Qualcomm, Nvidia, Swiggy, Flipkart, Zepto, Razorpay, Infosys, etc.).
- **Multi-Company Batch Search:** Enter single or comma-separated company names (e.g. `Sandisk, Amazon, Swiggy`) to look up and crawl multiple career portals in one go.
- **Live Career Site Crawler:** Automatically crawls target career pages to extract verified page titles, descriptions, and clickable live open role listings.
- **Direct ATS Integration:** Identifies and links directly to underlying ATS platforms (Workday, Greenhouse, Lever, SmartRecruiters, Darwinbox, Direct Portals) with complete elimination of defunct/broken Ashby redirects.

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

### 7. 📊 Sheets-Based Tabular UI & Multi-Selection Batch System
- **Dense Google Sheets Grid View:** Full spreadsheet-style interface featuring sticky headers, zebra rows, monospace timestamps, and inline status dropdown cells.
- **Multi-Selection Checkbox Engine:** Select individual rows or use the master "Select All" toggle across Discovery and Pipeline views.
- **Batch Action Toolbar:**
  - 🗑️ **Delete Selected (N):** Remove multiple applications from both UI and database in a single transaction.
  - 🚀 **Batch Status Update:** Transition selected opportunities across `Wishlist`, `Applied`, `Interviewing`, `Offer`, or `Rejected`.
  - 📊 **Push Selected to Sheets:** Sync selected jobs to Google Sheets.
- **Togglable Pipeline Views:** Seamlessly switch between the new dense **Sheets View** and the classic **Kanban Board**.


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
2. Keep **Direct ATS filter** checked to search directly on Greenhouse, Lever, Workday, and Darwinbox.
3. Click **"Search Direct Opportunities"**.

### 6. ✉️ Cover Letter Studio & AI Tailoring
- **ATS-Compliant LaTeX Template:** Single-page executive cover letter matching the exact typography and header layout of your LaTeX CV.
- **AI Content Generation:** Tailors a structured 4-paragraph cover letter using your Local Model (Ollama/LM Studio) or Gemini:
  1. *Opening hook & high-impact positioning*
  2. *Core achievement & quantifiable metrics aligned with JD requirements*
  3. *Technical alignment & domain passion*
  4. *Professional call-to-action & request for interview*
- **Live Interactive Editor:** Edit paragraphs in real-time, view formatted text, or switch to raw LaTeX mode.
- **1-Click Export:** Download formatted `.tex`, compile local `.pdf`, or click **"🍃 Open Overleaf"** for cloud PDF generation.

### 7. 🤖 Autonomous Job Search Agent & Local LLM Integration
- **Local Model Support:** Seamlessly connect to your self-hosted **Ollama** (`http://localhost:11434`) or **LM Studio** (`http://localhost:1234`) running models like `llama3`, `mistral`, `deepseek-coder`, `qwen2.5`, or `phi3`.
- **Autonomous Multi-Stage Pipeline:** Runs discovery, company lookups, live career crawlers, ATS scoring, LaTeX CV tailoring, Cover Letter generation, and recruiter scouting end-to-end.
- **Live Terminal & Telemetry:** Real-time logging terminal, animated progress tracking, and structured deliverables table.

---

## 🎨 Modern Designer UI: React JS + Chakra UI

JobPulse AI features a designer-grade interface built with **React 18** and **Chakra UI v2**:
- **Aesthetic:** Deep obsidian dark mode (`#0a0d14`), electric indigo / cyan / cyber violet glowing accents, and glassmorphism.
- **Typography:** Google Fonts (`Plus Jakarta Sans` for sleek UI typography and `JetBrains Mono` for code & terminal).
- **Interactive Tabs:**
  - 🤖 **Autonomous Agent:** Mission directives, model configuration, live progress, and deliverables.
  - ✉️ **Cover Letter Studio:** 4-paragraph ATS generator, live preview, LaTeX viewer, and Overleaf export.
  - 🎯 **Discovery:** Authenticated LinkedIn URL crawler and Google ATS search.
  - 🏢 **Company Sites:** 60+ curated company portals, direct live vacancy scraper.
  - 🌐 **Company Intel:** Human-like crawler studying products, clients, tech stack, and interview hooks.
  - 📋 **Pipeline:** Google Sheets-style tabular grid & Kanban board, multi-selection batch delete and apply.
  - 📄 **LaTeX CV Studio:** Candidate profile editor, AI STAR bullet tailoring, live LaTeX editor.
  - ✉️ **Cover Letter Studio:** 4-paragraph ATS generator, live preview, LaTeX viewer, and Overleaf export.
  - 🎯 **Interview Prep Studio:** Role-specific technical Q&A, product talking points, behavioral STAR scenarios, and interactive mock simulator.
  - 👥 **People & Referrals:** Hunter.io / Apollo.io / RocketReach style contact scraper with corporate email confidence and direct SMTP referral dispatch.
  - 🔍 **AI JD Inspector:** ATS circular score gauge, matched vs missing skills breakdown.
  - ⚙️ **Settings:** SMTP mailer configuration, Agent Continuous Learning, Google Sheets sync, and API keys.

---

## 🐳 Docker & n8n Orchestration

You can run the entire JobPulse AI suite and automated n8n workflows with Docker Compose:

```bash
# Build and run JobPulse AI and n8n
docker-compose up -d
```

- **JobPulse AI Web Studio:** [http://localhost:5000](http://localhost:5000)
- **n8n Workflow Automation Platform:** [http://localhost:5678](http://localhost:5678)
- **Pre-built Workflow:** Located at `n8n/workflows/jobpulse_autonomous_agent_workflow.json` (runs scheduled morning crawls, company studying, and agent auto-training).

---

## 🚀 Local Quick Start Guide

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm

### 2. Setup Backend
```bash
# Clone the repository
git clone https://github.com/Dive-Dev/Job-Finder-and-Latex-CV-Creator-Automation-Tool.git
cd "Job Finder and Latex CV Creator Automation Tool"

# Install Python dependencies
pip install -r requirements.txt

# Run backend server
python app.py
```
Backend will be available at `http://localhost:5000`.

### 3. Setup React + Chakra UI Frontend (Optional Dev Server)
The compiled React production build is already pre-bundled and served automatically by Flask at `http://localhost:5000`.
To run the Vite dev server with Hot Module Replacement:
```bash
cd frontend
npm install
npm run dev
```
Vite dev server will start at `http://localhost:3000` (auto-proxying `/api` requests to Flask on port 5000).

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Chakra UI v2, Framer Motion, Emotion, React Icons, Vite (100% Fully Responsive)
- **Backend:** Python 3.10+, Flask, SQLite
- **Workflow Automation & Orchestration:** n8n, Docker, Docker Compose
- **Web Scraping & Intelligence:** Human-like Web Crawler, Apollo/Hunter/RocketReach People Engine, LinkedIn Guest API, Google ATS Dorking
- **AI & LLM Engines:** Local Models (Ollama, LM Studio: Llama 3, Mistral, DeepSeek) + Google Gemini API + Agent Continuous Learning
- **Outreach & Communication:** SMTP Mailer (SSL/TLS), Mailto fallback, LaTeX Resume & Cover Letter Attachments
- **LaTeX Engine:** ATS-Optimized Clean Resume & Cover Letter Templates, Character Sanitizer, Overleaf Snip API
- **Cloud Database / Sync:** Google Sheets API (`gspread`, `oauth2client`) + SQLite local cache

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

