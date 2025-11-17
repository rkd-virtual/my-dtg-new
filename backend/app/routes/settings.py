# -----------------------------------------------------------
# Imports for Blueprint routing, JSON requests, authentication
# -----------------------------------------------------------
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import UserProfile

# -----------------------------------------------------------
# Create a Blueprint for all settings/profile-related endpoints
# -----------------------------------------------------------
settings_bp = Blueprint("settings", __name__)


# ---------------------------------------------------------------
# Helper function to sanitize text input (trims & limits length)
# ---------------------------------------------------------------
def clean_str(v, maxlen=255):
    if v is None:
        return None
    v = str(v).strip()   # remove spaces, convert to string
    return v[:maxlen]    # truncate to safe length


# -----------------------------------------------------------
# Helper to normalize any input into a list of strings
# Handles lists, comma-separated strings, or single strings
# -----------------------------------------------------------
def clean_list(v):
    """Coerce to list[str]. Accepts string, comma-separated string, or list."""
    if v is None:
        return []
    if isinstance(v, list):
        # keep non-empty, stripped values
        return [clean_str(x or "") for x in v if str(x or "").strip() != ""]
    # handle comma-separated string input like "a,b,c"
    return [clean_str(x) for x in str(v).split(",") if str(x).strip()]


# -----------------------------------------------------------
# GET /settings — returns the logged-in user's saved settings
# Requires JWT authentication (must be logged in)
# -----------------------------------------------------------
@settings_bp.get("/settings")
@jwt_required()
def get_settings():
    user_id = get_jwt_identity()   # extract user ID from JWT token
    profile = UserProfile.query.filter_by(user_id=user_id).first()

    # If profile doesn't exist yet, create a blank one
    if not profile:
        profile = UserProfile(user_id=user_id, other_accounts=[])
        db.session.add(profile)
        db.session.commit()

    # Return user profile data as JSON (for frontend Settings form)
    return jsonify({
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "job_title": profile.job_title,
        "amazon_site": profile.amazon_site,
        "other_accounts": profile.other_accounts or [],
    })

# -----------------------------------------------------------
# PUT /settings — updates the user's settings/profile fields
# Requires JWT authentication (must be logged in)
# -----------------------------------------------------------
@settings_bp.put("/settings")
@jwt_required()
def update_settings():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}   # safely parse JSON body

    # Find or create the user's profile record
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id)

    # Update all profile fields with sanitized values
    profile.first_name      = clean_str(data.get("first_name"))
    profile.last_name       = clean_str(data.get("last_name"))
    profile.job_title       = clean_str(data.get("job_title"))
    profile.amazon_site     = clean_str(data.get("amazon_site"))
    profile.other_accounts  = clean_list(data.get("other_accounts"))

    # Save changes to the database
    db.session.add(profile)
    db.session.commit()

    # Respond with success message
    return jsonify(message="Settings updated")
