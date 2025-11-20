from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from ..extensions import db
from ..models import User, UserSite
from typing import List, Dict
import re

bp = Blueprint("user_sites", __name__)

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

def normalize_slug(raw: str) -> str:
    if not raw:
        return ""
    s = str(raw).lower().strip()
    if s.startswith("amazon"):
        s = s[len("amazon"):].lstrip(":-_ .")
    s = "".join(ch if (ch.isalnum() or ch in "-_.") else " " for ch in s)
    return " ".join(s.split()).strip()

def extract_slug_and_label(raw_value: str, explicit_label: str | None):
    """
    Main fix:
    If raw_value looks like 'Amazon DEN6', treat it as a label.
    Extract last token 'DEN6' as slug.
    """
    val = (raw_value or "").strip()
    lbl = (explicit_label or "").strip()

    looks_like_label = bool(re.search(r"\s", val)) or val.lower().startswith("amazon")

    if looks_like_label and not lbl:
        lbl = val
        m = re.search(r"([A-Za-z0-9\-_.]+)$", val)
        slug = m.group(1) if m else val
    else:
        slug = val

    return slug.strip(), (lbl or None)


def get_current_user():
    ident = get_jwt_identity()
    try:
        return User.query.get(int(ident))
    except:
        return None


def user_site_to_dict(site: UserSite) -> Dict:
    return {
        "id": site.id,
        "user_id": site.user_id,
        "site_slug": site.site_slug,
        "label": site.label,
        "address": getattr(site, "address", None),
        "is_default": bool(site.is_default),
        "created_at": site.created_at.isoformat() if getattr(site, "created_at", None) else None,
    }

# ------------------------------------------------------------
# GET /sites
# ------------------------------------------------------------

@bp.get("/sites")
@jwt_required()
def list_user_sites():
    user = get_current_user()
    if not user:
        return jsonify(message="Invalid token identity"), 401

    try:
        rows = user.sites.order_by(UserSite.created_at.asc()).all()
        return jsonify([user_site_to_dict(r) for r in rows]), 200
    except Exception as e:
        current_app.logger.exception("Error fetching user sites")
        return jsonify(message="internal_server_error", detail=str(e)), 500


# ------------------------------------------------------------
# POST /sites  (Create)
# ------------------------------------------------------------

@bp.post("/sites")
@jwt_required()
def create_sites():
    payload = request.get_json(silent=True) or {}
    items = payload.get("sites") or []

    if not isinstance(items, list) or len(items) == 0:
        return jsonify(message="No sites provided"), 400

    user = get_current_user()
    if not user:
        return jsonify(message="Invalid token identity"), 401

    normalized_in = {}

    # --------------------------------------------------------
    # Build normalized list (extract slug + label properly)
    # --------------------------------------------------------
    for it in items:
        raw_val = (it.get("site_slug") or "").strip()
        if not raw_val:
            continue

        explicit_label = it.get("label")
        slug, label = extract_slug_and_label(raw_val, explicit_label)
        normalized_key = normalize_slug(slug)

        if not normalized_key:
            continue
        if normalized_key in normalized_in:
            continue

        normalized_in[normalized_key] = {
            "site_slug": slug,   # short code only
            "label": label       # full label if provided
        }

    if not normalized_in:
        return jsonify([]), 200

    try:
        existing_rows = db.session.query(UserSite.site_slug).filter(UserSite.user_id == user.id).all()
        existing_norm = set(normalize_slug(r[0]) for r in existing_rows if r[0])

        to_create: List[UserSite] = []
        for n, raw in normalized_in.items():
            if n in existing_norm:
                continue
            us = UserSite(
                user_id=user.id,
                site_slug=raw["site_slug"],
                label=raw.get("label"),
                is_default=False
            )
            to_create.append(us)

        if not to_create:
            return jsonify([]), 200

        with db.session.begin_nested():
            db.session.add_all(to_create)
        db.session.commit()

        created = [user_site_to_dict(r) for r in to_create]
        return jsonify(created), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("create_sites error")
        return jsonify(message="internal_server_error", detail=str(e)), 500


# ------------------------------------------------------------
# PATCH /sites/<id>/default
# ------------------------------------------------------------

@bp.patch("/sites/<int:site_id>/default")
@jwt_required()
def set_default(site_id):
    user = get_current_user()
    if not user:
        return jsonify(message="Invalid token identity"), 401

    target = UserSite.query.filter_by(id=site_id, user_id=user.id).first()
    if not target:
        return jsonify(message="Site not found"), 404

    try:
        with db.session.begin_nested():
            db.session.query(UserSite).filter(
                UserSite.user_id == user.id,
                UserSite.is_default == True
            ).update({"is_default": False})

            target.is_default = True
            db.session.add(target)

        db.session.commit()
        return jsonify(ok=True), 200

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to set default site")
        return jsonify(message="Failed to set default"), 500



# ------------------------------------------------------------
# DELETE /sites/<id>
# ------------------------------------------------------------

@bp.delete("/sites/<int:site_id>")
@jwt_required()
def delete_site(site_id):
    user = get_current_user()
    if not user:
        return jsonify(message="Invalid token identity"), 401

    target = UserSite.query.filter_by(id=site_id, user_id=user.id).first()
    if not target:
        return jsonify(message="Site not found"), 404

    try:
        db.session.delete(target)
        db.session.commit()
        return "", 204

    except Exception:
        db.session.rollback()
        current_app.logger.exception("delete_site error")
        return jsonify(message="Failed to delete site"), 500
