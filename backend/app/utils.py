# -------------------------------------------------------------------
# Imports for environment, email handling, and secure token creation
# -------------------------------------------------------------------
import os, smtplib, random
from email.message import EmailMessage
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask import current_app

# -----------------------------------------------------------
# Generate numeric code
# -----------------------------------------------------------
def generate_reset_code(length=6):
    """Return a zero-padded numeric code as string, e.g. '000123'"""
    return str(random.randint(0, 10**length - 1)).zfill(length)

# -----------------------------------------------------------
# Create a serializer object using the app's secret key
# Used to generate and verify time-limited, signed tokens
# -----------------------------------------------------------
def get_signer():
    return URLSafeTimedSerializer(
        current_app.config["JWT_SECRET_KEY"],   # key used to sign/verify
        salt="email-verify"                     # salt ensures unique token namespace
    )

# ----------------------------------------------------------------------
# Generate a verification token for a specific user ID
# The token includes a small JSON payload and can be emailed to the user
# ----------------------------------------------------------------------
def make_verify_token(user_id: int) -> str:
    return get_signer().dumps({
        "uid": user_id,                         # user ID to identify who owns the token
        "purpose": "verify"                     # custom flag so we know what the token is for
    })

# ------------------------------------------------------------------------
# Validate and decode a token received from the user
# Ensures it’s not expired and was originally created for "verify" purpose
# ------------------------------------------------------------------------
def load_verify_token(token: str, max_age_seconds=60*60*24):
    data = get_signer().loads(token, max_age=max_age_seconds)
    if data.get("purpose") != "verify":
        raise BadSignature("wrong purpose")
    return data

# -----------------------------------------------------------
# Send an email using SMTP with optional TLS and authentication
# This function composes an HTML email and sends it to the recipient
# -----------------------------------------------------------
def send_mail(to: str, subject: str, html: str):
    # Read mail configuration from environment variables
    host    = os.getenv("MAIL_HOST")
    port    = int(os.getenv("MAIL_PORT", "587"))
    user    = os.getenv("MAIL_USERNAME")
    pwd     = os.getenv("MAIL_PASSWORD")
    use_tls = os.getenv("MAIL_USE_TLS", "True").lower() == "true"
    sender  = os.getenv("MAIL_FROM", "DTG Portal <noreply@example.com>")

    # Create the email message with both plain text and HTML versions
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content("HTML required")
    msg.add_alternative(html, subtype="html")

    # Connect to SMTP server and send the message securely
    with smtplib.SMTP(host, port) as s:
        if use_tls:
            s.starttls()            # enable encryption if configured
        if user:
            s.login(user, pwd)      # authenticate if credentials provided
        s.send_message(msg)         # finally send the email
