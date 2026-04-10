import re

from flask import Blueprint, current_app, request
from flask_jwt_extended import create_access_token, jwt_required
from sqlalchemy.exc import IntegrityError

from app.extensions import bcrypt, db
from app.models import RegistrationOtp, User
from app.services.email_service import send_lifecycle_email, send_registration_otp_email
from app.services.notification_service import create_notification
from app.services.otp_service import create_or_refresh_registration_otp, verify_registration_otp
from app.utils.auth_helpers import get_current_user
from app.utils.response import error_response, success_response


auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def build_auth_payload(user):
    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
    )
    return {"token": token, "user": user.to_dict()}


def validate_registration_payload(data, require_otp=False):
    errors = {}

    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "customer").strip().lower()
    otp_code = (data.get("otp_code") or data.get("otp") or "").strip()

    if not full_name or len(full_name) < 2:
        errors["full_name"] = "Full name must be at least 2 characters."
    if not EMAIL_PATTERN.match(email):
        errors["email"] = "A valid email address is required."
    if len(password) < 8:
        errors["password"] = "Password must be at least 8 characters long."
    if role != "customer":
        errors["role"] = "Only customer self-registration is allowed."
    if require_otp and (not otp_code or not otp_code.isdigit() or len(otp_code) != 6):
        errors["otp_code"] = "Enter the 6-digit verification code sent to your email."

    return {
        "full_name": full_name,
        "email": email,
        "password": password,
        "role": role,
        "otp_code": otp_code,
    }, errors


def build_otp_response(email, otp_code):
    payload = {
        "requires_otp": True,
        "email": email,
        "expires_in_minutes": current_app.config["REGISTRATION_OTP_EXPIRY_MINUTES"],
    }
    if current_app.testing:
        payload["debug_otp_code"] = otp_code
    return payload


def send_registration_otp(data):
    payload, errors = validate_registration_payload(data, require_otp=False)
    if User.query.filter_by(email=payload["email"]).first():
        errors["email"] = "An account with this email already exists."

    if errors:
        return error_response("Registration validation failed.", errors, 422)

    password_hash = bcrypt.generate_password_hash(
        payload["password"], rounds=current_app.config["BCRYPT_LOG_ROUNDS"]
    ).decode("utf-8")

    registration_otp, otp_code = create_or_refresh_registration_otp(
        payload["email"], payload["full_name"], password_hash
    )
    db.session.commit()

    email_result = send_registration_otp_email(payload["email"], payload["full_name"], otp_code)
    if email_result.get("status") not in {"sent", "queued", "disabled"}:
        if current_app.testing:
            return success_response(
                "Verification code generated for test mode.",
                build_otp_response(payload["email"], otp_code),
                202,
            )
        return error_response(
            "We could not send the verification code email. Please try again later.",
            status_code=503,
        )

    if email_result.get("status") == "disabled" and not current_app.testing:
        return error_response(
            "Email delivery is disabled. Enable SMTP settings to complete registration.",
            status_code=503,
        )

    return success_response(
        "Verification code sent successfully.",
        build_otp_response(registration_otp.email, otp_code),
        202,
    )


def complete_registration(data):
    payload, errors = validate_registration_payload(data, require_otp=True)
    if errors:
        return error_response("Registration validation failed.", errors, 422)

    if User.query.filter_by(email=payload["email"]).first():
        RegistrationOtp.query.filter_by(email=payload["email"]).delete()
        db.session.commit()
        return error_response("An account with this email already exists.", status_code=409)

    registration_otp, error_message, status_code = verify_registration_otp(
        payload["email"], payload["otp_code"]
    )
    if error_message:
        return error_response(error_message, status_code=status_code)

    try:
        user = User(
            full_name=registration_otp.full_name,
            email=registration_otp.email,
            password_hash=registration_otp.password_hash,
            role="customer",
        )
        db.session.add(user)
        db.session.flush()
        create_notification(
            user.id,
            "WELCOME",
            f"Welcome to VoiceMart, {user.full_name}! Start exploring our accessible product catalog.",
        )
        db.session.delete(registration_otp)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response("An account with this email already exists.", status_code=409)

    send_lifecycle_email(user, "WELCOME")
    return success_response("Registration successful.", build_auth_payload(user), 201)


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    if data.get("otp_code") or data.get("otp"):
        return complete_registration(data)
    return send_registration_otp(data)


@auth_bp.post("/register/request-otp")
def request_registration_otp():
    data = request.get_json(silent=True) or {}
    return send_registration_otp(data)


@auth_bp.post("/register/verify-otp")
def verify_registration_otp_route():
    data = request.get_json(silent=True) or {}
    return complete_registration(data)


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return error_response("Email and password are required.", status_code=422)

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return error_response("Invalid email or password.", status_code=401)

    return success_response("Login successful.", build_auth_payload(user))


@auth_bp.get("/profile")
@jwt_required()
def profile():
    user = get_current_user()
    if not user:
        return error_response("User not found.", status_code=404)

    return success_response("Profile fetched successfully.", {"user": user.to_dict()})
