# backend/app/routes/user_sites.py
from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User, UserSite  # adjust only if your models live elsewhere
from datetime import datetime

bp = Blueprint("user_sites", __name__)

@bp.get("/sites")
@jwt_required()
def list_user_sites():
    """
    GET /api/user/sites
    Returns list of user_sites rows for the current JWT-authenticated user.
    """
    ident = get_jwt_identity()
    try:
        user_id = int(ident)
    except (TypeError, ValueError):
        return jsonify(message="Invalid token identity"), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify(message="User not found"), 404

    try:
        # Prefer relationship ordering; fallback to direct query if needed
        try:
            rows = user.sites.order_by(UserSite.id.asc()).all()
        except Exception:
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
                "address": getattr(r, "address", None),
                "is_default": bool(r.is_default),
                "created_at": created,
            })

        return jsonify(result), 200

    except Exception as e:
        current_app.logger.exception("Error fetching user sites")
        return jsonify(message="internal_server_error", detail=str(e)), 500
