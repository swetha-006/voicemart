import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def normalize_database_url(database_url):
    if database_url and database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql://", 1)
    return database_url


def env_first(*names, default=""):
    for name in names:
        value = os.getenv(name)
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return default


class BaseConfig:
    MAIL_USERNAME = env_first("MAIL_USERNAME", default="")
    MAIL_PASSWORD = env_first("MAIL_PASSWORD", default="")
    MAIL_DEFAULT_SENDER = env_first("MAIL_DEFAULT_SENDER", default="")
    SECRET_KEY = os.getenv("SECRET_KEY", "voicemart-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "voicemart-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    USE_SQLITE = os.getenv("USE_SQLITE", "true").lower() == "true"
    SQLITE_PATH = BASE_DIR / os.getenv("SQLITE_PATH", "voicemart.db")
    SQLALCHEMY_DATABASE_URI = (
        normalize_database_url(os.getenv("DATABASE_URL"))
        if not USE_SQLITE and os.getenv("DATABASE_URL")
        else f"sqlite:///{SQLITE_PATH.as_posix()}"
    )

    FRONTEND_ORIGIN = [
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGIN", "http://localhost:3000,http://localhost:5000"
        ).split(",")
        if origin.strip()
    ]
    BCRYPT_LOG_ROUNDS = int(os.getenv("BCRYPT_LOG_ROUNDS", "12"))
    LOW_STOCK_SCAN_INTERVAL_MINUTES = int(
        os.getenv("LOW_STOCK_SCAN_INTERVAL_MINUTES", "30")
    )
    SCHEDULER_TIMEZONE = os.getenv("SCHEDULER_TIMEZONE", "UTC")
    PUBLIC_APP_URL = os.getenv(
        "PUBLIC_APP_URL",
        os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",")[0].strip(),
    )
    EMAIL_NOTIFICATIONS_ENABLED = (
        os.getenv("EMAIL_NOTIFICATIONS_ENABLED", "false").strip().lower() == "true"
    )
    SMTP_HOST = env_first("SMTP_HOST", default="")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = env_first(
        "SMTP_USERNAME",
        default=MAIL_USERNAME if "@" in MAIL_USERNAME else MAIL_DEFAULT_SENDER,
    )
    SMTP_PASSWORD = env_first("SMTP_PASSWORD", default=MAIL_PASSWORD)
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").strip().lower() == "true"
    SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").strip().lower() == "true"
    MAIL_FROM_ADDRESS = env_first("MAIL_FROM_ADDRESS", default=MAIL_DEFAULT_SENDER)
    MAIL_FROM_NAME = env_first("MAIL_FROM_NAME", default=MAIL_USERNAME or "VoiceMart") or "VoiceMart"
    EMAIL_SEND_TIMEOUT = int(os.getenv("EMAIL_SEND_TIMEOUT", "15"))
    REGISTRATION_OTP_EXPIRY_MINUTES = int(os.getenv("REGISTRATION_OTP_EXPIRY_MINUTES", "10"))
    REGISTRATION_OTP_MAX_ATTEMPTS = int(os.getenv("REGISTRATION_OTP_MAX_ATTEMPTS", "5"))


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False


class TestingConfig(BaseConfig):
    DEBUG = True
    TESTING = True
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)


CONFIG_MAP = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
