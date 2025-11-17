import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///dev.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)

    AMAZON_SITE_API_URL = os.getenv("AMAZON_SITE_API_URL", "https://example.com/api")

    # Token location & cookie options
    JWT_TOKEN_LOCATION = os.getenv("JWT_TOKEN_LOCATION", "cookies").split(",")
    JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "False").lower() == "true"
    JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "Lax")
    JWT_COOKIE_CSRF_PROTECT = os.getenv("JWT_COOKIE_CSRF_PROTECT", "False").lower() == "true"

    # CORS
    _origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    CORS_ORIGINS = [o.strip() for o in _origins.split(",") if o.strip()]
