# -----------------------------------------------------------
# Imports for Blueprint routing, JSON requests, authentication
# -----------------------------------------------------------
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import UserProfile, User, ShippingInformation

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

    user = None
    email = None
    try:
        user = User.query.get(user_id)
        email = getattr(user, "email", None)
    except Exception:
        email = None    

    # Return user profile data as JSON (for frontend Settings form)
    return jsonify({
        "first_name": getattr(profile, "first_name", None),
        "last_name": getattr(profile, "last_name", None),
        "job_title": getattr(profile, "job_title", None),
        "amazon_site": getattr(profile, "amazon_site", None),
        "other_accounts": getattr(profile, "other_accounts", []) or [],
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



# -----------------------------------------------------------
# GET /settings/shipping
# Returns saved shipping info if present.
# If missing → frontend will call the 3rd-party service itself.
# -----------------------------------------------------------
@settings_bp.get("/settings/shipping")
@jwt_required()
def get_shipping():
    user_id = get_jwt_identity()
    ship = ShippingInformation.query.filter_by(user_id=user_id).first()

    if not ship:
        # return empty → frontend will call 3rd-party API itself
        return jsonify({
            "address1": "",
            "address2": "",
            "city": "",
            "state": "",
            "zip": "",
            "country": "",
            "shipto": ""
        }), 200

    return jsonify({
        "address1": ship.address1 or "",
        "address2": ship.address2 or "",
        "city": ship.city or "",
        "state": ship.state or "",
        "zip": ship.zip or "",
        "country": ship.country or "",
        "shipto": ship.shipto or "",
    })


# -----------------------------------------------------------
# PUT /settings/shipping
# Save or update shipping info for the user
# -----------------------------------------------------------
@settings_bp.put("/settings/shipping")
@jwt_required()
def save_shipping():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    def cs(value, maxlen=255):
        if value is None:
            return ""
        return str(value).strip()[:maxlen]

    ship = ShippingInformation.query.filter_by(user_id=user_id).first()
    if not ship:
        ship = ShippingInformation(user_id=user_id)

    ship.address1 = cs(data.get("address1"))
    ship.address2 = cs(data.get("address2"))
    ship.city = cs(data.get("city"), 100)
    ship.state = cs(data.get("state"), 100)
    ship.zip = cs(data.get("zip"), 20)
    ship.country = cs(data.get("country"), 50)
    ship.shipto = cs(data.get("shipto"))

    db.session.add(ship)
    db.session.commit()

    return jsonify(message="Shipping information saved"), 200
