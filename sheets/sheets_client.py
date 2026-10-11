import os
import json
from dotenv import load_dotenv

load_dotenv()

SPREADSHEET_NAME = os.getenv("GOOGLE_SHEET_NAME", "Job Applications Tracker")
CREDS_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "creds.json")

def get_sheet():
    """
    Connects to Google Sheets using gspread and service account credentials.
    Returns (sheet, None) on success or (None, error_message) on failure.
    """
    try:
        import gspread
        from oauth2client.service_account import ServiceAccountCredentials
    except ImportError as e:
        return None, f"Required libraries missing: {e}"

    if not os.path.exists(CREDS_FILE):
        return None, f"Credentials file '{CREDS_FILE}' not found. Please provide valid service account JSON."

    try:
        with open(CREDS_FILE, 'r') as f:
            content = f.read().strip()
            if not content or content == "{}":
                return None, "creds.json is empty. Please paste your Google Service Account credentials."
            # Check valid JSON
            json.loads(content)
    except Exception as e:
        return None, f"Invalid JSON in {CREDS_FILE}: {str(e)}"

    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]

    try:
        creds = ServiceAccountCredentials.from_json_keyfile_name(CREDS_FILE, scope)
        client = gspread.authorize(creds)
        
        try:
            spreadsheet = client.open(SPREADSHEET_NAME)
        except gspread.SpreadsheetNotFound:
            # Try opening by key/URL if provided, or create new
            try:
                spreadsheet = client.create(SPREADSHEET_NAME)
            except Exception as ce:
                return None, f"Spreadsheet '{SPREADSHEET_NAME}' not found and could not be created: {str(ce)}"

        sheet = spreadsheet.sheet1
        
        # Verify or add headers
        headers = ["ID", "Company", "Role", "Location", "Skills", "Exp Level", "Job Link", "Career Page", "Status", "Date Applied", "Notes"]
        try:
            existing_headers = sheet.row_values(1)
            if not existing_headers:
                sheet.append_row(headers)
        except Exception:
            pass
            
        return sheet, None
    except Exception as e:
        return None, f"Google Sheets connection failed: {str(e)}"

def append_job_to_sheet(job_data):
    sheet, err = get_sheet()
    if err or not sheet:
        return False, err
        
    try:
        skills = job_data.get("skills", [])
        if isinstance(skills, list):
            skills_str = ", ".join(skills)
        else:
            skills_str = str(skills)
            
        row = [
            job_data.get("id", ""),
            job_data.get("company", ""),
            job_data.get("title", ""),
            job_data.get("location", ""),
            skills_str,
            job_data.get("experience_level", ""),
            job_data.get("job_url", ""),
            job_data.get("career_page_url", ""),
            job_data.get("status", "Wishlist"),
            job_data.get("applied_date", ""),
            job_data.get("notes", "")
        ]
        sheet.append_row(row)
        return True, "Successfully appended to Google Sheet"
    except Exception as e:
        return False, f"Failed to append row: {str(e)}"

def sync_all_jobs_to_sheet(jobs_list):
    sheet, err = get_sheet()
    if err or not sheet:
        return False, err
        
    try:
        headers = ["ID", "Company", "Role", "Location", "Skills", "Exp Level", "Job Link", "Career Page", "Status", "Date Applied", "Notes"]
        sheet.clear()
        
        rows = [headers]
        for job in jobs_list:
            skills = job.get("skills", [])
            skills_str = ", ".join(skills) if isinstance(skills, list) else str(skills)
            rows.append([
                job.get("id", ""),
                job.get("company", ""),
                job.get("title", ""),
                job.get("location", ""),
                skills_str,
                job.get("experience_level", ""),
                job.get("job_url", ""),
                job.get("career_page_url", ""),
                job.get("status", "Wishlist"),
                job.get("applied_date", ""),
                job.get("notes", "")
            ])
            
        sheet.append_rows(rows)
        return True, f"Successfully synced {len(jobs_list)} jobs to Google Sheets!"
    except Exception as e:
        return False, f"Failed syncing jobs: {str(e)}"
