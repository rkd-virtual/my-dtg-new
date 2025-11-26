# app/models.py

# --------------------------------------------------------------
# Standard libs and helpers for timestamps and password hashing
# --------------------------------------------------------------
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash

# -----------------------------------------------------------
# SQLAlchemy base (db) provided by your app's extensions
# -----------------------------------------------------------
from .extensions import db

# -----------------------------------------------------------
# Postgres-specific column type for text arrays (ARRAY)
# -----------------------------------------------------------
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import text, func

# -------------------------------------------------------------------
# User: stores login credentials and verification status
# -------------------------------------------------------------------
class User(db.Model):
    __tablename__ = "users"
    id                   = db.Column(db.Integer, primary_key=True)
    email                = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash        = db.Column(db.String(255), nullable=False)
    is_verified          = db.Column(db.Boolean, nullable=False, server_default="false")
    email_verified_at    = db.Column(db.DateTime)
    profile_completed_at = db.Column(db.DateTime)
    password_reset_code       = db.Column(db.String(32), nullable=True)
    password_reset_expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at           = db.Column(
                                db.DateTime, 
                                default=lambda: datetime.now(timezone.utc), 
                                nullable=False
                            )
    updated_at           = db.Column(
                                db.DateTime, 
                                default=lambda: datetime.now(timezone.utc), 
                                onupdate=lambda: datetime.now(timezone.utc)
                            )

    # 1:1 relationship to profile (cascade ensures profile is deleted with user)
    profile = db.relationship(
                    "UserProfile", 
                    back_populates="user", 
                    uselist=False, 
                    cascade="all, delete-orphan"
                )

    # 1:n relationship to UserSite (normalized sites)
    sites = db.relationship("UserSite", back_populates="user", cascade="all, delete-orphan", lazy="dynamic")
    
    # Helper to hash and set the user's password
    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    # Helper to validate a raw password against the stored hash
    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

# -------------------------------------------------------------------------
# UserProfile: stores extended profile fields for a user (1:1)
# -------------------------------------------------------------------------
class UserProfile(db.Model):
    __tablename__ = "user_profiles"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)

    # NEW FIELDS
    first_name   = db.Column(db.String(255))
    last_name    = db.Column(db.String(255))
    job_title    = db.Column(db.String(255))

    # Keep other_accounts as a Postgres text[] with safe defaults
    other_accounts = db.Column(
        ARRAY(db.String),
        server_default=text("'{}'"),
        nullable=False,
        default=list
    )

    # Back-reference to User (completes the 1:1 link)
    user = db.relationship("User", back_populates="profile")


# -------------------------------------------------------------------------
# UserSite: normalized table for user's sites (one row per site)
# - site_slug: short code (e.g. "DEN2")
# - label: human friendly label (e.g. "Amazon DEN2")
# - is_default: boolean flag indicating which site is the active/default
# -------------------------------------------------------------------------
class UserSite(db.Model):
    __tablename__ = "user_sites"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # canonical short code for the site (no spaces ideally)
    site_slug = db.Column(db.String(100), nullable=False)

    # human friendly label shown in UI
    label = db.Column(db.String(255), nullable=True)

    # single boolean to mark default/active site for the user
    is_default = db.Column(db.Boolean, nullable=False, server_default="false", default=False)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    # relationship back to user
    user = db.relationship("User", back_populates="sites")

    def to_dict(self):
        return {
            "id": self.id,
            "site_slug": self.site_slug,
            "label": self.label,
            "is_default": bool(self.is_default),
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
    
# -------------------------------------------------------------------------
# ShippingInformation: stores user's default shipping address (1:1)
# -------------------------------------------------------------------------
class ShippingInformation(db.Model):
    __tablename__ = "shipping_information"

    id = db.Column(db.Integer, primary_key=True)

    # 1:1 relation with users table
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )

    # Shipping fields
    address1 = db.Column(db.String(255))
    address2 = db.Column(db.String(255))
    city     = db.Column(db.String(100))
    state    = db.Column(db.String(100))
    zip      = db.Column(db.String(20))
    country  = db.Column(db.String(50))
    shipto   = db.Column(db.String(255))

    # Timestamps
    created_at = db.Column(
        db.DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # relationship back to User (1:1)
    user = db.relationship(
        "User",
        backref=db.backref(
            "shipping_information",
            uselist=False,
            cascade="all, delete-orphan"
        )
    )


