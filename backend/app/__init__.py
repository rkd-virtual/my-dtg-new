# -----------------------------------------------------------
# app/__init__.py
# -----------------------------------------------------------
# This file defines the Flask application factory and sets up
# configuration, extensions, and route blueprints.
# -----------------------------------------------------------

from flask import Flask, jsonify
from .config import Config
from .extensions import db, migrate, jwt, cors
from .routes.auth import auth_bp,profile_bp
from .routes.settings import settings_bp

def create_app():
    """
    Flask application factory function.
    Creates and configures an instance of the Flask app.
    """
    # -----------------------------------------------------------
    # Create the Flask app instance
    # -----------------------------------------------------------
    app = Flask(__name__)

    # -----------------------------------------------------------
    # Load configuration settings from Config class
    # (contains database URI, JWT secret, etc.)
    # -----------------------------------------------------------
    app.config.from_object(Config())

    # -----------------------------------------------------------
    # Initialize extensions (DB, Migrations, JWT, CORS)
    # -----------------------------------------------------------
    
    # Initialize SQLAlchemy ORM
    db.init_app(app)

    # Enable database migrations
    migrate.init_app(app, db)

    # Set up JWT authentication
    jwt.init_app(app)

    cors_origins = app.config.get("CORS_ORIGINS", "")
    if isinstance(cors_origins, str):
        # allow comma-separated values in env variable
        cors_origins = [o.strip() for o in cors_origins.split(",") if o.strip()]

    cors.init_app(
        app,
        resources={r"/api/*": {"origins": cors_origins or "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )

    # -----------------------------------------------------------
    # Register Blueprints (modular route handlers)
    # -----------------------------------------------------------
    # Auth routes (login, register, etc.)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    # App settings routes
    app.register_blueprint(settings_bp, url_prefix="/api")

    # User profile routes
    app.register_blueprint(profile_bp, url_prefix="/api")

    # -----------------------------------------------------------
    # Root route for quick health check / info
    # -----------------------------------------------------------
    @app.get("/")
    def index():
        """
        Root endpoint returning a simple JSON response.
        Useful for verifying that the API is reachable.
        """
        return jsonify(service="DTG API", docs="/api/health")

    #-----------------------------------------------------------
    # Health check endpoint (used by monitoring tools)
    # -----------------------------------------------------------
    @app.get("/api/health")
    def health():
        """
        Returns a simple OK status.
        Can be used for uptime monitoring or load balancer checks.
        """
        return {"status": "ok"}
    # -----------------------------------------------------------
    # Return the fully configured app instance
    # -----------------------------------------------------------
    return app
