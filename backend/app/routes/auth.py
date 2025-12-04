# -----------------------------------------------------------
# Import all necessary Flask and extension libraries
# -----------------------------------------------------------
from flask import Blueprint, request, jsonify, make_response, current_app
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity,
    set_access_cookies, unset_jwt_cookies
)
from datetime import datetime, timezone, timedelta
from urllib.parse import quote
from sqlalchemy.exc import SQLAlchemyError
import os, json
import requests

# -----------------------------------------------------------
# Import app-specific modules for database and helpers
# -----------------------------------------------------------
from ..extensions import db
from ..models import User, UserProfile, UserSite, ShippingInformation
from ..utils import make_verify_token, load_verify_token, send_mail, generate_reset_code

# Helper: ensure value becomes a list of non-empty strings
def listify(v):
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    s = str(v).strip()
    if not s:
        return []
    # if comma separated, split; otherwise single element list
    if "," in s:
        return [x.strip() for x in s.split(",") if x.strip()]
    return [s]

# -----------------------------------------------------------
# Initialize a Blueprint for authentication-related routes
# -----------------------------------------------------------
auth_bp    = Blueprint("auth", __name__)
profile_bp = Blueprint("profile", __name__)

ALLOWED_EMAIL_DOMAINS = ("@dtgpower.com", "@amazon.com")
@auth_bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()   
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "")

    errors = {}

    # required checks
    if not first_name or len(first_name) < 2:
        errors["first_name"] = "First name is required"
    if not last_name or len(last_name) < 2:
        errors["last_name"] = "Last name is required"    
    if not email:
        errors["email"] = "Email is required"
    else:
        # basic email format guard (you might use a proper regex or email validator lib)
        if "@" not in email or "." not in email.split("@")[-1]:
            errors["email"] = "Invalid email address"
        else:
            if not any(email.endswith(d) for d in ALLOWED_EMAIL_DOMAINS):
                errors["email"] = "Only dtgpower.com and amazon.com domains are allowed"

    if not password:
        errors["password"] = "Password is required"
    elif len(password) < 8:
        errors["password"] = "Password must be at least 8 characters"

    # If there are validation errors, return 422 with the errors mapping
    if errors:
        return jsonify(message="Validation failed", errors=errors), 422

    # check existing email
    if User.query.filter_by(email=email).first():
        return jsonify(message="Email already registered"), 409

    # create user and profile
    user = User(email=email, is_verified=False)
    user.set_password(password)
    user.first_name = first_name
    user.last_name = last_name
    db.session.add(user)
    db.session.flush()

    db.session.add(UserProfile(
    user_id=user.id,
    first_name=first_name,
    last_name=last_name,
    other_accounts=[]
    ))
    db.session.commit()

    token = make_verify_token(user.id)
    frontend = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    verify_link = f"{frontend}/setup-profile?member={quote(token, safe='')}"

    # (existing email HTML builder) ...
    html = f"""\
    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Verify your email</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;">
        <!-- preheader (hidden preview text) -->
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
        Please verify your email address to finish creating your account.
        </div>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f5f5;">
        <tr>
            <td align="center" style="padding:24px;">
            <!-- card -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;">
                <tr>
                <td style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:24px;">
                    Thank you for creating an account! To finish signing up, please verify your email address.
                    </p>
                    <p style="margin:0 0 20px 0;font-size:16px;line-height:24px;">
                    To confirm your email, please click this link:
                    </p>
                </td>
                </tr>

                <!-- button (bulletproof table) -->
                <tr>
                <td align="center" style="padding:0 28px 24px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:544px;">
                    <tr>
                        <td align="center" bgcolor="#1f2937" style="border-radius:8px;">
                        <a href="{verify_link}"
                            style="display:block;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;
                                    font-size:16px;line-height:24px;color:#ffffff;text-decoration:none;
                                    font-weight:600;border-radius:8px;background:#1f2937;">
                            Verify Email
                        </a>
                        </td>
                    </tr>
                    </table>
                </td>
                </tr>

                <!-- footer copy -->
                <tr>
                <td style="padding:4px 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 8px 0;font-size:14px;line-height:22px;">
                    Welcome and thank you!
                    </p>
                    <p style="margin:12px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;">
                    If the button doesn’t work, copy and paste this URL into your browser:<br>
                    <span style="word-break:break-all;color:#374151;">{verify_link}</span>
                    </p>
                </td>
                </tr>
            </table>
            <!-- /card -->
            </td>
        </tr>
        </table>
    </body>
    </html>
    """

    send_mail(user.email, "Verify your DTG Portal account", html)
    return jsonify(message="Verification email sent"), 201

# ---------------------------------------------------------------------------
# RESEND VERIFICATION — re-sends verification email if user not yet verified
# ---------------------------------------------------------------------------
@auth_bp.post("/resend-verification")
def resend_verification():
    data    = request.get_json(silent=True) or {}
    email   = (data.get("email") or "").strip().lower()
    user    = User.query.filter_by(email=email).first()
    if not user or user.is_verified:
        # Always return success to prevent user enumeration
        return jsonify(message="If the email exists, a new link was sent"), 200

    # Create new token and resend verification email
    token       = make_verify_token(user.id)
    frontend    = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    verify_link = f"{frontend}/setup-profile?member={quote(token, safe='')}"
    
    html = f"""\
    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Verify your email</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;">
        <!-- preheader (hidden preview text) -->
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
        Please verify your email address to finish creating your account.
        </div>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f5f5;">
        <tr>
            <td align="center" style="padding:24px;">
            <!-- card -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;">
                <tr>
                <td style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:24px;">
                    Thank you for creating an account! To finish signing up, please verify your email address.
                    </p>
                    <p style="margin:0 0 20px 0;font-size:16px;line-height:24px;">
                    To confirm your email, please click this link:
                    </p>
                </td>
                </tr>

                <!-- button (bulletproof table) -->
                <tr>
                <td align="center" style="padding:0 28px 24px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:544px;">
                    <tr>
                        <td align="center" bgcolor="#1f2937" style="border-radius:8px;">
                        <a href="{verify_link}"
                            style="display:block;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;
                                    font-size:16px;line-height:24px;color:#ffffff;text-decoration:none;
                                    font-weight:600;border-radius:8px;background:#1f2937;">
                            Verify Email
                        </a>
                        </td>
                    </tr>
                    </table>
                </td>
                </tr>

                <!-- footer copy -->
                <tr>
                <td style="padding:4px 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 8px 0;font-size:14px;line-height:22px;">
                    Welcome and thank you!
                    </p>
                    <p style="margin:12px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;">
                    If the button doesn’t work, copy and paste this URL into your browser:<br>
                    <span style="word-break:break-all;color:#374151;">{verify_link}</span>
                    </p>
                </td>
                </tr>
            </table>
            <!-- /card -->
            </td>
        </tr>
        </table>
    </body>
    </html>
    """
    send_mail(user.email, "Your verification link", html)
    return jsonify(message="Verification email resent"), 200

# -----------------------------------------------------------------
# VERIFY EMAIL — validates the token user clicked from their email
# -----------------------------------------------------------------
@auth_bp.post("/verify-email")
def verify_email():
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()

    # Decode and validate token
    try:
        payload = load_verify_token(token)
        uid = int(payload["uid"])
    except Exception:
        return jsonify(message="Invalid or expired verification link"), 400

    user = User.query.get(uid)
    if not user:
        return jsonify(message="User not found"), 404

    # Mark email as verified if not done already
    if not user.is_verified:
        user.is_verified = True
        user.email_verified_at = datetime.now(timezone.utc)
        db.session.commit()

    # Return raw JSON to avoid any response transformers trimming fields
    payload = {"message": "Email verified", "email": user.email, "setup_token": token}
    resp = make_response(json.dumps(payload), 200)
    resp.headers["Content-Type"] = "application/json"
    return resp

# -----------------------------------------------------------
# SETUP PROFILE — completes the user profile after verification
# -----------------------------------------------------------
@auth_bp.put("/setup-profile")
def setup_profile():
    """
    Robust setup-profile handler (developer-friendly).
    Accepts:
      - token (required)
      - first_name, last_name, job_title (optional)
      - amazon_site: can be "CTZ", "Amazon CTZ", ["CTZ"], ["Amazon CTZ"], "CTZ,RYT", '["Amazon CTZ"]', etc.
      - other_accounts: similar flexible shapes

    Normalizes amazon_site -> list of strings, each prefixed with "Amazon " if necessary,
    stores into UserProfile.amazon_site (ARRAY) and also syncs rows into user_sites
    (site_slug, label, is_default) and calls external API to insert into shipping_information.
    """
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    if not token:
        return jsonify(message="token is required"), 400

    # decode token -> uid
    try:
        payload = load_verify_token(token)
        uid = int(payload.get("uid"))
    except Exception as e:
        current_app.logger.exception("Failed to decode setup token")
        return jsonify(message="Invalid or expired link"), 400

    user = User.query.get(uid)
    if not user:
        return jsonify(message="User not found"), 404
    if not user.is_verified:
        return jsonify(message="Please verify your email first"), 403

    # helper sanitizer
    def s(v, n=255):
        if v is None:
            return None
        v = str(v).strip()
        return v[:n] if v else None

    # flexible list parser
    def listify(v):
        if v is None:
            return []
        if isinstance(v, list):
            return [s(x) for x in v if s(x)]
        if isinstance(v, str):
            txt = v.strip()
            # try JSON parse first (handles JSON arrays)
            if (txt.startswith("[") and txt.endswith("]")) or (txt.startswith("{") and txt.endswith("}")):
                try:
                    parsed = json.loads(txt)
                    if isinstance(parsed, list):
                        return [s(x) for x in parsed if s(x)]
                    # if parsed is string or dict, fall-through to CSV handling
                except Exception:
                    # continue to CSV fallback
                    pass
            # CSV fallback
            if "," in txt:
                return [s(x) for x in txt.split(",") if s(x)]
            # single token
            return [s(txt)] if s(txt) else []
        # fallback: cast to string
        try:
            return [s(str(v))]
        except Exception:
            return []

    try:
        # Load or create the profile; ensure arrays are initialized to avoid NOT NULL DB errors
        profile = UserProfile.query.filter_by(user_id=uid).first()
        if not profile:
            profile = UserProfile(user_id=uid, amazon_site=[], other_accounts=[])
            db.session.add(profile)
            # flush to ensure DB constraints applied early
            db.session.flush()

        # Save simple fields
        profile.first_name = s(data.get("first_name")) or profile.first_name
        profile.last_name = s(data.get("last_name")) or profile.last_name
        profile.job_title = s(data.get("job_title")) or profile.job_title

        # amazon_site: normalize into full labels "Amazon <CODE>" and store as list (ARRAY)
        raw_site = data.get("amazon_site")
        site_items = listify(raw_site) 
        normalized_sites = []
        for item in site_items:
            if not item:
                continue
            # if user passed "Amazon CTZ" or "amazon CTZ" keep it
            if item.lower().startswith("amazon"):
                normalized_sites.append(item.strip())
            else:
                # item could be the code "CTZ"
                normalized_sites.append(f"Amazon {item.strip()}")

        # If setup-profile flow sent a single string "Amazon CTZ" we still handle above.
        if normalized_sites:
            profile.amazon_site = normalized_sites
        else:
            # keep existing profile.amazon_site or set empty list to satisfy NOT NULL
            if not getattr(profile, "amazon_site", None):
                profile.amazon_site = []

        # other_accounts -> always an array
        other_items = listify(data.get("other_accounts"))
        if other_items:
            profile.other_accounts = other_items
        else:
            if not getattr(profile, "other_accounts", None):
                profile.other_accounts = []

        # mark profile completed timestamp
        user.profile_completed_at = datetime.now(timezone.utc)

        db.session.add(profile)
        db.session.add(user)

        # ----------------------------------------------------
        # NEW ENHANCEMENT: Fetch and Insert Shipping Information
        # ----------------------------------------------------
        first_name = profile.first_name if profile.first_name else data.get("first_name", "Unknown")
        last_name = profile.last_name if profile.last_name else data.get("last_name", "User")
        
        # We process ALL new or existing amazon_sites for address lookup
        sites_to_process = normalized_sites # uses the cleaned, normalized sites from above

        for full_account_name in sites_to_process:
            try:
                # 1. Prepare the payload for the external API call
                api_payload = {
                    "account_name": full_account_name,
                    "first_name": first_name,
                    "last_name": last_name
                }
                
                # 2. Construct the API URL (Using the provided environment variable pattern)
                api_url = current_app.config.get("AMAZON_SITE_API_URL", "https://dtg-backend.onrender.com/")
                fetch_address_url = api_url.rstrip('/') + "/api/fetch-address"
                
                # 3. Call the external API
                response = requests.post(fetch_address_url, json=api_payload, timeout=5)
                response.raise_for_status() # Raises an HTTPError for bad responses (4xx or 5xx)
                address_data = response.json()
                
                # 4. Insert the fetched address data into shipping_information table
                # Assuming you have a ShippingInformation ORM Model defined
                
                # Prepare 'shipto' using first_name and last_name (fetched from profile/data)
                shipto_name = f"{first_name} {last_name}".strip()
                
                new_shipping_info = ShippingInformation(
                    user_id=uid,
                    address1=s(address_data.get("address1")),
                    address2=s(address_data.get("address2")),
                    city=s(address_data.get("city")),
                    state=s(address_data.get("state")),
                    zip=s(address_data.get("zip")),
                    country=s(address_data.get("country")),
                    shipto=s(address_data.get("shipto") or shipto_name) # Use API's shipto or fallback
                )
                
                db.session.add(new_shipping_info)
                current_app.logger.info("Inserted shipping info for user %s and site %s", uid, full_account_name)

            except requests.exceptions.RequestException as req_e:
                # Log the API call error but continue processing other sites/profile sync
                current_app.logger.error("API call failed for shipping info for user %s and site %s: %s",
                                         uid, full_account_name, str(req_e))
            except Exception as e:
                # Log any other unexpected error during the loop
                current_app.logger.error("Error processing shipping info for user %s and site %s: %s",
                                         uid, full_account_name, str(e))
        
        # -----------------------------
        # Sync user_sites table from profile.amazon_site
        # (Rest of the original sync logic remains unchanged)
        # -----------------------------
        from sqlalchemy import text # Retained for context, though likely imported at top
        
        try:
            normalized_sites = getattr(profile, "amazon_site", []) or []

            # 1) Trim, dedupe preserving order and normalize to "Amazon CODE"
            cleaned = []
            seen = set()
            for v in normalized_sites:
                if not v:
                    continue
                t = str(v).strip()
                if not t:
                    continue
                if not t.lower().startswith("amazon"):
                    t = f"Amazon {t}"
                if t in seen:
                    continue
                seen.add(t)
                cleaned.append(t)
            normalized_sites = cleaned

            # Derive desired list of dicts [{slug,label}, ...]
            desired = []
            for full_label in normalized_sites:
                parts = full_label.strip().split()
                if not parts:
                    continue
                slug = parts[-1].strip()
                if not slug:
                    continue
                desired.append({"slug": slug, "label": full_label})

            desired_slugs = [d["slug"] for d in desired]

            # If no desired sites: delete all existing for this user
            if not desired_slugs:
                db.session.execute(text("DELETE FROM user_sites WHERE user_id = :uid"), {"uid": uid})
            else:
                # Fetch existing rows for this user (id, site_slug)
                existing = db.session.execute(
                    text("SELECT id, site_slug FROM user_sites WHERE user_id = :uid"),
                    {"uid": uid}
                ).fetchall()
                existing_by_slug = {row[1]: row[0] for row in existing if row[1] is not None}

                # Delete rows removed by the user
                to_delete = [s for s in existing_by_slug.keys() if s not in desired_slugs]
                for slug in to_delete:
                    db.session.execute(
                        text("DELETE FROM user_sites WHERE user_id = :uid AND site_slug = :slug"),
                        {"uid": uid, "slug": slug}
                    )

                # Clear existing defaults
                db.session.execute(text("UPDATE user_sites SET is_default = false WHERE user_id = :uid"), {"uid": uid})

                # Upsert desired rows (update else insert) — do NOT touch created_at/updated_at
                for i, info in enumerate(desired):
                    slug = info["slug"]
                    label = info["label"]
                    is_default = (i == 0)

                    # Try update
                    res = db.session.execute(
                        text("""
                            UPDATE user_sites
                            SET label = :label, is_default = :is_default
                            WHERE user_id = :uid AND site_slug = :slug
                        """),
                        {"label": label, "is_default": is_default, "uid": uid, "slug": slug}
                    )

                    # If no row updated, insert
                    if (res.rowcount or 0) == 0:
                        db.session.execute(
                            text("""
                                INSERT INTO user_sites (user_id, site_slug, label, is_default)
                                VALUES (:uid, :slug, :label, :is_default)
                            """),
                            {"uid": uid, "slug": slug, "label": label, "is_default": is_default}
                        )

        except Exception:
            current_app.logger.exception(
                "Failed to sync user_sites for user %s; desired=%s existing_slugs=%s",
                uid, desired_slugs, list(existing_by_slug.keys()) if 'existing_by_slug' in locals() else None
            )

        # -----------------------------
        # commit final transaction (includes profile updates, user updates, shipping_information inserts, and user_sites sync)
        # -----------------------------
        db.session.commit()

        return jsonify(
            message="Profile saved. Please log in.",
            profile={
                "id": user.id,
                "email": user.email,
                "first_name": profile.first_name,
                "last_name": profile.last_name,
                "job_title": profile.job_title,
                "amazon_site": profile.amazon_site,
                "other_accounts": profile.other_accounts,
            },
        ), 200

    except SQLAlchemyError as e:
        current_app.logger.exception("Database error saving setup_profile")
        db.session.rollback()
        # In dev return error message for faster debugging (remove in prod)
        if current_app.config.get("ENV") == "development" or current_app.config.get("DEBUG"):
            return jsonify(message="Database error", detail=str(e.__dict__.get("orig"))), 500
        return jsonify(message="Database error saving profile"), 500

    except Exception as e:
        current_app.logger.exception("Unexpected error saving setup_profile")
        db.session.rollback()
        if current_app.config.get("ENV") == "development" or current_app.config.get("DEBUG"):
            # return traceback in development to aid debugging
            import traceback
            tb = traceback.format_exc()
            return jsonify(message="Unexpected error", detail=str(e), traceback=tb), 500
        return jsonify(message="Unexpected error"), 500



# --------------------------------------------------------------
# LOGIN — authenticates user and issues JWT (also sets cookie)
# --------------------------------------------------------------
@auth_bp.post("/login")
def login():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "")

    # 1) Basic validation
    if not email or not password:
        return jsonify(message="Email and password are required"), 400

    # 2) Look up user by email
    user = User.query.filter_by(email=email).first()
    if not user:
        # No user with that email
        return jsonify(message="No account found. Please sign up first."), 404

    # 3) Verify password
    if not user.check_password(password):
        return jsonify(message="The provided credentials are invalid."), 401

    # 4) Verify email confirmation
    if not user.is_verified:
        return jsonify(message="Please verify your email to continue"), 403

    # Create and send JWT token + cookie
    token = create_access_token(identity=str(user.id))
    resp  = jsonify(token=token)
    set_access_cookies(resp, token)
    return resp, 200

# ----------------------------------------------
# MEMBER CHECK — authenticates exsisting user 
# ----------------------------------------------
@auth_bp.post("/check-member")
def check_member():
    """
    POST /api/auth/check-member
    Body: { email: "<email>", token: "<optional-setup-token>" }

    Returns 200 with JSON:
      { exists: bool, allowed: bool, message: str }
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    token = (data.get("token") or "").strip()

    if not email:
        return jsonify(message="Email is required"), 400

    try:
        user = User.query.filter_by(email=email).first()
    except Exception as e:
        # DB failure
        return jsonify(message=f"DB error: {str(e)}"), 500

    if not user:
        return jsonify({
            "exists": False,
            "allowed": False,
            "message": "This email isn’t registered. Please sign up first."
        }), 200

    # If a token is supplied, validate it's for the same user
    if token:
        try:
            payload = load_verify_token(token)
            uid_from_token = int(payload.get("uid"))
            if user.id != uid_from_token:
                return jsonify({
                    "exists": True,
                    "allowed": False,
                    "message": "The verification link does not match this email."
                }), 200
        except Exception:
            return jsonify({
                "exists": True,
                "allowed": False,
                "message": "Invalid or expired verification token."
            }), 200

    # If profile already completed
    """ if getattr(user, "profile_completed_at", None):
        return jsonify({
            "exists": True,
            "allowed": False,
            "message": "Profile already completed. Please log in."
        }), 200 """

    # Determine reference timestamp for 30-day window:
    ts = None
    if getattr(user, "email_verified_at", None):
        ts = user.email_verified_at
    elif getattr(user, "created_at", None):
        ts = user.created_at

    if ts is None:
        # No timestamps available: allow by default (or change to deny)
        return jsonify({"exists": True, "allowed": True, "message": "OK"}), 200

    # Ensure ts is datetime and timezone-aware if possible
    if isinstance(ts, datetime):
        now = datetime.now(timezone.utc)
        # If ts is naive, treat it as UTC:
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        age = now - ts
    else:
        age = timedelta(days=9999)

    if age <= timedelta(days=30):
        return jsonify({"exists": True, "allowed": True, "message": "OK"}), 200

    # Expired
    return jsonify({
        "exists": True,
        "allowed": False,
        "message": "This verification link has expired (over 30 days). Please request a new verification email."
    }), 200

# -----------------
# FORGOT PASSWORD 
# -----------------
@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        # Generic response to avoid enumeration
        return jsonify(message="If the email exists, a reset code has been sent."), 200

    user = User.query.filter_by(email=email).first()
    if not user:
        # Always return the same message to avoid leaking which emails exist
        return jsonify(message="If the email exists, a reset code has been sent."), 200

    # generate a plain numeric code (6 digits)
    raw_code = generate_reset_code(6)  # should return e.g. "023491"

    # save plain code (you asked for normal digit) and expiry (30 minutes)
    user.password_reset_code = raw_code
    user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.session.add(user)
    db.session.commit()

    # Email the code. Keep content simple and prominent.
    html = f"""
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px">
        <h2>DTG Portal — password reset code</h2>
        <p style="font-size:28px;font-weight:700;margin:18px 0;">{raw_code}</p>
        <p>This code is valid for 30 minutes. Enter the code in the portal to reset your password.</p>
        <p>If you didn't request this, you can ignore this email.</p>
      </div>
    """
    try:
        send_mail(user.email, "DTG Portal — password reset code", html)
    except Exception as e:
        # Log but still return generic response
        print("send_mail failed:", str(e), flush=True)

    return jsonify(message="If the email exists, a reset code has been sent."), 200

# -----------------------------------------------------------
# RESET PASSWORD — verify code & set new password
# -----------------------------------------------------------
@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    code = (data.get("code") or "").strip()
    new_password = data.get("new_password") or ""

    if not email or not code or not new_password:
        return jsonify(message="Email, code and new password are required"), 400
    if len(new_password) < 8:
        return jsonify(message="Password must be at least 8 characters"), 400
    # optional: ensure code is digits-only and length 6
    if not code.isdigit() or len(code) != 6:
        return jsonify(message="Invalid reset code format"), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        # keep message generic
        return jsonify(message="Invalid code or email"), 400

    # ensure a code exists for user
    if not user.password_reset_code or not user.password_reset_expires_at:
        return jsonify(message="Invalid reset code"), 400

    # check expiry
    now = datetime.now(timezone.utc)
    if user.password_reset_expires_at < now:
        # clear expired values
        user.password_reset_code = None
        user.password_reset_expires_at = None
        db.session.add(user)
        db.session.commit()
        return jsonify(message="Reset code expired"), 400

    # compare codes
    if user.password_reset_code != code:
        return jsonify(message="Invalid reset code"), 400

    # success: update password and clear reset fields
    user.set_password(new_password)
    user.password_reset_code = None
    user.password_reset_expires_at = None
    db.session.add(user)
    db.session.commit()

    return jsonify(message="Password reset successful. Please log in."), 200

# -----------------------------------------------------------
# This is for setup check
# -----------------------------------------------------------
@auth_bp.get("/check-setup")
def check_setup():
    token = request.args.get("member", "")
    # use existing helper that you already imported: load_verify_token
    try:
        payload = load_verify_token(token)
    except Exception:
        return jsonify({"status": "invalid"}), 400

    if not payload or "uid" not in payload:
        return jsonify({"status": "invalid"}), 400

    try:
        uid = int(payload["uid"])
    except Exception:
        return jsonify({"status": "invalid"}), 400

    user = User.query.get(uid)
    if not user:
        return jsonify({"status": "invalid"}), 400

    # If email not verified → allow setup (or indicate pending)
    if not user.is_verified:
        return jsonify({"status": "pending_email"}), 200

    # If profile completed → indicate already completed
    if getattr(user, "profile_completed_at", None):
        return jsonify({"status": "already_completed"}), 200

    # Otherwise they are allowed to continue
    return jsonify({"status": "allowed"}), 200

# -----------------------------------------------------------
# Change password section
# -----------------------------------------------------------
@auth_bp.put("/change-password")
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    current = data.get("current_password")
    new = data.get("new_password")

    if not current or not new:
        return jsonify(message="Missing fields"), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify(message="User not found"), 404

    # Validate current password
    if not user.check_password(current):
        return jsonify(message="Current password is incorrect"), 400

    user.set_password(new)
    db.session.commit()

    return jsonify(message="Password updated"), 200


# -----------------------------------------------------------
# LOGOUT — removes JWT cookies from browser (ends session)
# -----------------------------------------------------------
@auth_bp.post("/session/logout")
def session_logout():
    resp = jsonify(message="Logged out")
    unset_jwt_cookies(resp)
    return resp

# -----------------------------------------------------------
# ME — returns the logged-in user's basic info (JWT protected)
# -----------------------------------------------------------

@auth_bp.get("/me")
@jwt_required()
def me():
    ident = get_jwt_identity()
    try:
        user_id = int(ident)
    except (TypeError, ValueError):
        # fallback if token is bad — force a logout from frontend if this happens
        return jsonify(message="Invalid token identity"), 401

    # fetch user
    user = User.query.get(user_id)
    if not user:
        return jsonify(message="User not found"), 404

    # fetch profile (adjust model name if yours differs)
    profile = None
    try:
        profile = UserProfile.query.filter_by(user_id=user_id).first()
    except Exception:
        # If you didn't create a UserProfile model, you can also query directly using raw SQL/DB session
        profile = None

    first_name = getattr(profile, "first_name", None) if profile else None
    last_name = getattr(profile, "last_name", None) if profile else None
    job_title = getattr(profile, "job_title", None) if profile else None
    avatar = getattr(profile, "profile_image", None) if profile else None  # adjust field name if different

    # build a human-friendly display name
    if first_name or last_name:
        name = f"{first_name or ''}{(' ' + last_name) if last_name else ''}".strip()
    else:
        # fallback: if user has a name field, use it; otherwise use local part of email
        name = getattr(user, "name", None) or (user.email.split("@")[0] if user.email else None)

    payload = {
        "id": user.id,
        "email": user.email,
        "is_verified": user.is_verified,
        "first_name": first_name,
        "last_name": last_name,
        "name": name,
        "job_title": job_title,
        "avatar": avatar,
    }

    return jsonify(payload), 200

# -----------------------------------------------------------
# Profile -  Detailed informations (JWT protected)
# -----------------------------------------------------------
@auth_bp.get("/profile")
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify(message="User not found"), 404

    profile = user.profile
    if not profile:
        return jsonify(message="Profile not found"), 404

    # Find default site from UserSite (normalized). Fallback to first site or empty string.
    default_site = None
    default_site_obj = user.sites.filter_by(is_default=True).first()
    if not default_site_obj:
        default_site_obj = user.sites.order_by(UserSite.created_at.desc()).first()

    if default_site_obj:
        default_site = default_site_obj.label or f"Amazon {default_site_obj.site_slug}"
    else:
        default_site = None

    return jsonify({
        "id": user.id,
        "email": user.email,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "job_title": profile.job_title,
        "amazon_site": default_site,                 
        "other_accounts": profile.other_accounts,
    })

# -----------------------------------------------------------
# Profile -  update action
# -----------------------------------------------------------
@auth_bp.put("/profile")
@jwt_required()
def update_profile():
    """
    PUT /auth/profile
    Body: { "amazon_site": "CTZ" }   # frontend sends site code (like DEN2/CTZ)
    Updates UserSite to mark the given site as default (is_default=True)
    and unsets all others (is_default=False).
    """
    data = request.get_json(silent=True) or {}
    amazon_site_code = data.get("amazon_site")

    if amazon_site_code is None:
        return jsonify(message="amazon_site is required"), 400

    def s(v, n=255):
        if v is None:
            return None
        v = str(v).strip()
        return v[:n]

    # Resolve current user id from JWT identity
    ident = get_jwt_identity()
    try:
        user_id = int(ident)
    except (TypeError, ValueError):
        return jsonify(message="Invalid token identity"), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify(message="User not found"), 404

    # sanitize site code and build label
    site_code = s(amazon_site_code)
    if not site_code:
        return jsonify(message="Invalid amazon_site value"), 400

    # ensure no "Amazon " prefix duplication
    if site_code.lower().startswith("amazon"):
        # user may have sent "Amazon CTZ" — extract last token as code
        site_code = site_code.split()[-1]

    full_label = f"Amazon {site_code}"

    try:
        # use a nested transaction to avoid "transaction already begun" error
        with db.session.begin_nested():
            # Unset previous defaults
            UserSite.query.filter_by(user_id=user.id, is_default=True).update({"is_default": False})

            # Find or create the selected site
            site = UserSite.query.filter_by(user_id=user.id, site_slug=site_code).first()
            if site:
                site.label = full_label
                site.is_default = True
                db.session.add(site)
            else:
                site = UserSite(
                    user_id=user.id,
                    site_slug=site_code,
                    label=full_label,
                    is_default=True,
                    created_at=datetime.now(timezone.utc)
                )
                db.session.add(site)

        db.session.commit()

    except SQLAlchemyError:
        current_app.logger.exception("DB error while updating default site")
        db.session.rollback()
        return jsonify(message="Database error updating profile"), 500
    except Exception:
        current_app.logger.exception("Unexpected error while updating profile")
        db.session.rollback()
        return jsonify(message="Unexpected error"), 500

    # Optional: call third-party API to refresh related data
    api_data = None
    api_base = current_app.config.get("AMAZON_SITE_API_URL")
    if api_base:
        try:
            import requests
            resp = requests.get(
                f"{api_base.rstrip('/')}/api/dashboard",
                params={"site_code": site_code},
                timeout=8
            )
            if resp.ok:
                try:
                    api_data = resp.json()
                except Exception:
                    api_data = {"status": "ok"}
        except Exception:
            current_app.logger.exception("Error calling third-party API")

    out = {
        "message": "Profile updated successfully",
        "profile": {
            "id": user.id,
            "email": user.email,
            "amazon_site": full_label,
        },
    }
    if api_data is not None:
        out["dashboard_data"] = api_data

    return jsonify(out), 200

# ----------------------------------------------------------------------
# Add this route to auth.py (place near get_profile / update_profile)
# ----------------------------------------------------------------------
@auth_bp.get("/profile/sites")
@jwt_required()
def get_profile_sites():
    """
    Return the list of user_sites rows for the current user.
    Response: [{ id, user_id, site_slug, label, is_default, created_at }, ...]
    """
    ident = get_jwt_identity()
    try:
        user_id = int(ident)
    except (TypeError, ValueError):
        return jsonify(message="Invalid token identity"), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify(message="User not found"), 404

    # load sites via relationship (or query UserSite directly)
    try:
        rows = user.sites.order_by(UserSite.id.asc()).all()
    except Exception:
        # fallback query if relationship doesn't support order_by
        rows = UserSite.query.filter_by(user_id=user.id).order_by(UserSite.id.asc()).all()

    result = []
    for r in rows:
        created = None
        if getattr(r, "created_at", None):
            try:
                created = r.created_at.isoformat()
            except Exception:
                created = str(r.created_at)
        result.append({
            "id": r.id,
            "user_id": r.user_id,
            "site_slug": r.site_slug,
            "label": r.label,
            "is_default": bool(r.is_default),
            "created_at": created,
        })

    return jsonify(result), 200
