from functools import wraps

from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from app.extensions import db
from app.models import User
from app.utils.response import error_response


def get_current_user():
    identity = get_jwt_identity()
    if not identity:
        return None
    try:
        return db.session.get(User, int(identity))
    except (TypeError, ValueError):
        return None


def role_required(role_name):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user = get_current_user()

            if not user:
                return error_response("Authenticated user could not be found.", status_code=404)

            if claims.get("role") != role_name or user.role != role_name:
                return error_response(
                    "You do not have permission to access this resource.", status_code=403
                )

            return fn(*args, **kwargs)

        return wrapper

    return decorator


def admin_required(fn):
    return role_required("admin")(fn)


def customer_required(fn):
    return role_required("customer")(fn)
