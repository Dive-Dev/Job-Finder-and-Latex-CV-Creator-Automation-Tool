from ai.jd_analyzer import analyze_jd
from sheets.sheets_client import get_sheet
from utils.parser import clean_json

jd = input("Paste Job Description:\n")
link = input("Paste Job Link:\n")
company = input("Company Name:\n")

# Step 1: AI analysis
raw_output = analyze_jd(jd)

# Step 2: Clean JSON
data = clean_json(raw_output)

print("\nParsed Data:\n", data)

# Step 3: Store in sheet
sheet = get_sheet()

sheet.append_row([
    company,
    data["role"],
    ", ".join(data["skills"]),
    data["experience_level"],
    link,
    "Not Applied"
])