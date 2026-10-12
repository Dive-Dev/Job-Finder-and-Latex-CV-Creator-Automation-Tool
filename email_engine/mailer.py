import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

def get_smtp_config():
    return {
        "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASSWORD", ""), # App Password
        "from_name": os.getenv("SMTP_FROM_NAME", "JobPulse Candidate"),
        "use_tls": os.getenv("SMTP_USE_TLS", "true").lower() == "true",
    }

def test_smtp_connection(config=None):
    cfg = config or get_smtp_config()
    if not cfg.get("user") or not cfg.get("password"):
        return {
            "success": False,
            "message": "SMTP credentials (user/password) not set. Configure in Settings or .env."
        }
    try:
        server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=10)
        if cfg.get("use_tls"):
            context = ssl.create_default_context()
            server.starttls(context=context)
        server.login(cfg["user"], cfg["password"])
        server.quit()
        return {"success": True, "message": "SMTP connection & authentication successful!"}
    except Exception as e:
        return {"success": False, "message": f"SMTP connection failed: {str(e)}"}

def generate_mailto_url(recipient_email, subject, body):
    """
    Constructs a 1-click mailto: URI that opens in default system email client.
    """
    params = {
        "subject": subject,
        "body": body
    }
    query = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    return f"mailto:{recipient_email}?{query}"

def send_referral_email(recipient_email, subject, body_text, attachment_path=None, config=None):
    """
    Sends referral email via SMTP with optional attached PDF Resume or Cover Letter.
    Returns status dict and fallback mailto URI.
    """
    mailto_url = generate_mailto_url(recipient_email, subject, body_text)
    cfg = config or get_smtp_config()

    if not cfg.get("user") or not cfg.get("password"):
        return {
            "success": False,
            "delivered": False,
            "message": "SMTP not configured. Click 'Open in Email Client' to send via Outlook/Gmail.",
            "mailto_url": mailto_url
        }

    try:
        msg = MIMEMultipart()
        msg["From"] = f"{cfg.get('from_name', '')} <{cfg['user']}>"
        msg["To"] = recipient_email
        msg["Subject"] = subject

        # Attach body plain text
        msg.attach(MIMEText(body_text, "plain", "utf-8"))

        # Optional PDF attachment
        if attachment_path and os.path.exists(attachment_path):
            filename = os.path.basename(attachment_path)
            with open(attachment_path, "rb") as f:
                part = MIMEApplication(f.read(), Name=filename)
                part["Content-Disposition"] = f'attachment; filename="{filename}"'
                msg.attach(part)

        # Send via SMTP
        server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15)
        if cfg.get("use_tls"):
            context = ssl.create_default_context()
            server.starttls(context=context)
        server.login(cfg["user"], cfg["password"])
        server.send_message(msg)
        server.quit()

        return {
            "success": True,
            "delivered": True,
            "message": f"Referral email successfully dispatched to {recipient_email}!",
            "mailto_url": mailto_url
        }
    except Exception as e:
        return {
            "success": False,
            "delivered": False,
            "message": f"SMTP dispatch failed: {str(e)}",
            "mailto_url": mailto_url
        }
