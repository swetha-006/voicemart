import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from flask import current_app

from app.extensions import db
from app.models import RegistrationOtp


def now_utc():
    return datetime.now(timezone.utc)


def ensure_utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def generate_otp_code():
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(email, otp_code):
    secret = current_app.config.get("JWT_SECRET_KEY") or current_app.config.get("SECRET_KEY")
    payload = f"{(email or '').strip().lower()}:{otp_code}:{secret}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get_registration_otp_expiry_minutes():
    return current_app.config.get("REGISTRATION_OTP_EXPIRY_MINUTES", 10)


def clear_expired_registration_otps(email=None):
    query = RegistrationOtp.query
    if email:
        query = query.filter_by(email=(email or "").strip().lower())
    expired_records = query.filter(RegistrationOtp.expires_at <= now_utc()).all()
    for record in expired_records:
        db.session.delete(record)
    return len(expired_records)


def create_or_refresh_registration_otp(email, full_name, password_hash):
    normalized_email = (email or "").strip().lower()
    clear_expired_registration_otps(normalized_email)

    otp_code = generate_otp_code()
    expires_at = now_utc() + timedelta(minutes=get_registration_otp_expiry_minutes())
    attempts_left = current_app.config.get("REGISTRATION_OTP_MAX_ATTEMPTS", 5)

    registration_otp = RegistrationOtp.query.filter_by(email=normalized_email).first()
    if not registration_otp:
        registration_otp = RegistrationOtp(email=normalized_email)

    registration_otp.full_name = full_name
    registration_otp.password_hash = password_hash
    registration_otp.otp_hash = hash_otp(normalized_email, otp_code)
    registration_otp.expires_at = expires_at
    registration_otp.attempts_left = attempts_left

    db.session.add(registration_otp)
    db.session.flush()
    return registration_otp, otp_code


def verify_registration_otp(email, otp_code):
    normalized_email = (email or "").strip().lower()
    registration_otp = RegistrationOtp.query.filter_by(email=normalized_email).first()
    if not registration_otp:
        return None, "No pending registration was found for this email. Request a new verification code.", 404

    if ensure_utc(registration_otp.expires_at) <= now_utc():
        db.session.delete(registration_otp)
        db.session.commit()
        return None, "The verification code has expired. Request a new code.", 410

    if registration_otp.attempts_left <= 0:
        db.session.delete(registration_otp)
        db.session.commit()
        return None, "Too many invalid verification attempts. Request a new code.", 429

    if registration_otp.otp_hash != hash_otp(normalized_email, otp_code):
        registration_otp.attempts_left -= 1
        remaining_attempts = max(registration_otp.attempts_left, 0)
        if remaining_attempts <= 0:
            db.session.delete(registration_otp)
            db.session.commit()
            return None, "Too many invalid verification attempts. Request a new code.", 429

        db.session.commit()
        return None, f"Invalid verification code. {remaining_attempts} attempt(s) remaining.", 422

    return registration_otp, None, None
