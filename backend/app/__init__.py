import atexit
import os
import sqlite3
from pathlib import Path

from flask import Flask, current_app, request
from sqlalchemy import event
from sqlalchemy.engine import Engine
from werkzeug.exceptions import HTTPException

from app.extensions import bcrypt, cors, db, jwt, migrate, scheduler
from app.routes.admin import admin_bp
from app.routes.auth import auth_bp
from app.routes.customer import customer_bp
from app.routes.voice import voice_bp
from app.services.inventory_service import register_inventory_jobs, scan_low_stock_products
from app.utils.response import error_response, success_response
from config import CONFIG_MAP


@event.listens_for(Engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()


def create_app(config_name=None):
    app = Flask(__name__)
    active_config = config_name or os.getenv("FLASK_ENV", "development")
    app.config.from_object(CONFIG_MAP.get(active_config, CONFIG_MAP["development"]))

    ensure_database_path(app)
    initialize_extensions(app)
    register_blueprints(app)
    register_core_routes(app)
    register_jwt_handlers()
    register_error_handlers(app)

    with app.app_context():
        from app.models import Alert, CartItem, Category, Notification, Order, OrderItem, Product, User  # noqa: F401

        db.create_all()
        scan_low_stock_products()

    configure_scheduler(app)
    return app


def ensure_database_path(app):
    database_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if not database_uri.startswith("sqlite:///"):
        return

    sqlite_target = database_uri.replace("sqlite:///", "", 1)
    if not sqlite_target or sqlite_target == ":memory:":
        return

    Path(sqlite_target).parent.mkdir(parents=True, exist_ok=True)


def initialize_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(
        app,
        resources={r"/*": {"origins": app.config["FRONTEND_ORIGIN"]}},
        supports_credentials=False,
    )


def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(customer_bp)
    app.register_blueprint(voice_bp)


def register_core_routes(app):
    @app.get("/")
    def index():
        return success_response(
            "VoiceMart API is running.",
            {
                "service": "VoiceMart API",
                "version": "1.0.0",
                "health": "/health",
            },
        )

    @app.get("/health")
    def health():
        return success_response("VoiceMart API is healthy.", {"status": "ok"})


def register_error_handlers(app):
    @app.errorhandler(404)
    def handle_not_found(error):
        return error_response("Resource not found.", {"path": request.path}, 404)

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        return error_response("Method not allowed.", {"path": request.path}, 405)

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        if isinstance(error, HTTPException):
            return error_response(error.description, {"path": request.path}, error.code or 500)

        db.session.rollback()
        current_app.logger.exception("Unhandled VoiceMart API error")
        return error_response("Internal server error.", {"path": request.path}, 500)


def register_jwt_handlers():
    @jwt.unauthorized_loader
    def handle_missing_token(reason):
        return error_response("Authorization token is required.", {"reason": reason}, 401)

    @jwt.invalid_token_loader
    def handle_invalid_token(reason):
        return error_response("The provided token is invalid.", {"reason": reason}, 401)

    @jwt.expired_token_loader
    def handle_expired_token(jwt_header, jwt_payload):
        return error_response("Your session has expired. Please log in again.", status_code=401)


def configure_scheduler(app):
    if scheduler.running:
        return

    scheduler.configure(timezone=app.config["SCHEDULER_TIMEZONE"])
    register_inventory_jobs(app, scheduler)

    should_start = not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true"
    if not app.testing and should_start:
        scheduler.start()
        atexit.register(lambda: scheduler.shutdown(wait=False) if scheduler.running else None)
