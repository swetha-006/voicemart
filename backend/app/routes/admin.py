from decimal import Decimal, InvalidOperation
import re

from flask import Blueprint, request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Alert, CartItem, Category, Order, Product
from app.services.email_service import send_admin_test_email
from app.services.order_service import OrderServiceError, update_order_status
from app.utils.auth_helpers import admin_required, get_current_user
from app.utils.response import error_response, success_response


admin_bp = Blueprint("admin", __name__, url_prefix="/admin")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def parse_decimal(value, field_name, errors):
    try:
        parsed_value = Decimal(str(value))
        if parsed_value < 0:
            errors[field_name] = f"{field_name} must be zero or greater."
        return parsed_value
    except (InvalidOperation, TypeError, ValueError):
        errors[field_name] = f"{field_name} must be a valid number."
        return None


def parse_boolean(value, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def get_or_json_404(model, entity_id, label):
    entity = db.session.get(model, entity_id)
    if not entity:
        return None, error_response(f"{label} was not found.", status_code=404)
    return entity, None


def validate_product_payload(data):
    errors = {}

    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    image_url = (data.get("image_url") or "").strip()
    category_id = data.get("category_id")
    price = parse_decimal(data.get("price"), "price", errors)
    mrp = parse_decimal(data.get("mrp"), "mrp", errors)

    try:
        discount = int(data.get("discount", 0))
        if discount < 0 or discount > 100:
            errors["discount"] = "discount must be between 0 and 100."
    except (TypeError, ValueError):
        discount = 0
        errors["discount"] = "discount must be a whole number."

    try:
        stock = int(data.get("stock", 0))
        if stock < 0:
            errors["stock"] = "stock must be zero or greater."
    except (TypeError, ValueError):
        stock = 0
        errors["stock"] = "stock must be a whole number."

    try:
        reorder_level = int(data.get("reorder_level", 0))
        if reorder_level < 0:
            errors["reorder_level"] = "reorder_level must be zero or greater."
    except (TypeError, ValueError):
        reorder_level = 0
        errors["reorder_level"] = "reorder_level must be a whole number."

    if not name:
        errors["name"] = "name is required."
    if not description:
        errors["description"] = "description is required."
    if not image_url:
        errors["image_url"] = "image_url is required."
    try:
        category_id = int(category_id)
    except (TypeError, ValueError):
        category_id = None

    if category_id is None:
        errors["category_id"] = "category_id is required."
    elif not db.session.get(Category, category_id):
        errors["category_id"] = "Selected category does not exist."

    if price is not None and mrp is not None and mrp < price:
        errors["mrp"] = "mrp must be greater than or equal to price."

    if errors:
        return None, errors

    return (
        {
            "name": name,
            "description": description,
            "category_id": category_id,
            "price": price,
            "mrp": mrp,
            "discount": discount,
            "stock": stock,
            "reorder_level": reorder_level,
            "image_url": image_url,
            "is_active": parse_boolean(data.get("is_active"), True),
        },
        None,
    )


@admin_bp.get("/products")
@admin_required
def get_products():
    products = Product.query.order_by(Product.created_at.desc()).all()
    return success_response(
        "Products fetched successfully.", {"products": [product.to_dict() for product in products]}
    )


@admin_bp.post("/products")
@admin_required
def create_product():
    data = request.get_json(silent=True) or {}
    product_payload, errors = validate_product_payload(data)
    if errors:
        return error_response("Product validation failed.", errors, 422)

    product = Product(**product_payload)
    db.session.add(product)
    db.session.commit()
    return success_response("Product created successfully.", {"product": product.to_dict()}, 201)


@admin_bp.put("/products/<int:product_id>")
@admin_required
def update_product(product_id):
    product, error = get_or_json_404(Product, product_id, "Product")
    if error:
        return error

    data = request.get_json(silent=True) or {}
    product_payload, errors = validate_product_payload(data)
    if errors:
        return error_response("Product validation failed.", errors, 422)

    for key, value in product_payload.items():
        setattr(product, key, value)

    db.session.commit()
    return success_response("Product updated successfully.", {"product": product.to_dict()})


@admin_bp.delete("/products/<int:product_id>")
@admin_required
def delete_product(product_id):
    product, error = get_or_json_404(Product, product_id, "Product")
    if error:
        return error

    CartItem.query.filter_by(product_id=product.id).delete(synchronize_session=False)

    try:
        db.session.delete(product)
        db.session.commit()
        return success_response("Product deleted successfully.")
    except IntegrityError:
        db.session.rollback()
        product.is_active = False
        db.session.commit()
        return success_response(
            "Product is referenced by historical data and was deactivated instead.",
            {"product": product.to_dict()},
        )


@admin_bp.get("/orders")
@admin_required
def get_orders():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return success_response("Orders fetched successfully.", {"orders": [order.to_dict() for order in orders]})


@admin_bp.put("/orders/<int:order_id>/status")
@admin_required
def update_status(order_id):
    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip()
    order, error = get_or_json_404(Order, order_id, "Order")
    if error:
        return error

    if not new_status:
        return error_response("status is required.", status_code=422)

    try:
        updated_order = update_order_status(order, new_status)
    except OrderServiceError as exc:
        return error_response(str(exc), status_code=422)

    return success_response("Order status updated successfully.", {"order": updated_order.to_dict()})


@admin_bp.get("/alerts")
@admin_required
def get_alerts():
    show_all = (request.args.get("all") or "false").lower() == "true"
    query = Alert.query.order_by(Alert.is_resolved.asc(), Alert.created_at.desc())
    if not show_all:
        query = query.filter_by(is_resolved=False)
    alerts = query.all()
    return success_response("Alerts fetched successfully.", {"alerts": [alert.to_dict() for alert in alerts]})


@admin_bp.put("/alerts/<int:alert_id>/resolve")
@admin_required
def resolve_alert(alert_id):
    alert, error = get_or_json_404(Alert, alert_id, "Alert")
    if error:
        return error

    alert.is_resolved = True
    db.session.commit()
    return success_response("Alert resolved successfully.", {"alert": alert.to_dict()})


@admin_bp.get("/categories")
@admin_required
def get_categories():
    categories = Category.query.order_by(Category.name.asc()).all()
    return success_response(
        "Categories fetched successfully.", {"categories": [category.to_dict() for category in categories]}
    )


@admin_bp.post("/categories")
@admin_required
def create_category():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()

    if not name:
        return error_response("Category name is required.", status_code=422)

    if Category.query.filter(func.lower(Category.name) == name.lower()).first():
        return error_response("A category with this name already exists.", status_code=409)

    category = Category(name=name, description=description)
    db.session.add(category)
    db.session.commit()
    return success_response("Category created successfully.", {"category": category.to_dict()}, 201)


@admin_bp.delete("/categories")
@admin_required
def delete_category():
    category_id = request.args.get("id")
    payload = request.get_json(silent=True) or {}
    category_id = category_id or payload.get("id")

    if not category_id:
        return error_response("Category id is required.", status_code=422)

    try:
        category_id = int(category_id)
    except (TypeError, ValueError):
        return error_response("Category id must be a valid integer.", status_code=422)

    category, error = get_or_json_404(Category, category_id, "Category")
    if error:
        return error

    if category.products:
        return error_response(
            "Category cannot be deleted while products are still assigned to it.", status_code=422
        )

    db.session.delete(category)
    db.session.commit()
    return success_response("Category deleted successfully.")


@admin_bp.get("/analytics")
@admin_required
def analytics():
    total_products = db.session.query(func.count(Product.id)).scalar() or 0
    active_products = (
        db.session.query(func.count(Product.id)).filter(Product.is_active.is_(True)).scalar() or 0
    )
    total_orders = db.session.query(func.count(Order.id)).scalar() or 0
    total_revenue = (
        db.session.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(Order.status == "Delivered")
        .scalar()
        or 0
    )
    category_count = db.session.query(func.count(Category.id)).scalar() or 0
    low_stock_alerts = (
        db.session.query(func.count(Alert.id))
        .filter(Alert.alert_type == "LOW_STOCK", Alert.is_resolved.is_(False))
        .scalar()
        or 0
    )
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()

    return success_response(
        "Analytics fetched successfully.",
        {
            "analytics": {
                "total_products": total_products,
                "active_products": active_products,
                "total_orders": total_orders,
                "revenue": float(total_revenue),
                "category_count": category_count,
                "low_stock_alerts": low_stock_alerts,
                "recent_orders": [order.to_dict() for order in recent_orders],
            }
        },
    )


@admin_bp.post("/test-email")
@admin_required
def send_test_email():
    data = request.get_json(silent=True) or {}
    recipient = (data.get("email") or data.get("recipient") or "").strip().lower()

    if not recipient:
        current_user = get_current_user()
        recipient = ((current_user.email if current_user else "") or "").strip().lower()

    if not recipient or not EMAIL_PATTERN.match(recipient):
        return error_response("A valid recipient email address is required.", status_code=422)

    result = send_admin_test_email(recipient, requested_by=get_current_user())
    status = result.get("status")
    if status in {"sent", "queued"}:
        return success_response(
            "Test email queued successfully." if status == "queued" else "Test email sent successfully.",
            {"email": recipient, "status": status},
            202 if status == "queued" else 200,
        )

    if status == "disabled":
        return error_response(
            "Email notifications are disabled in the backend configuration.",
            status_code=503,
        )

    if status == "misconfigured":
        return error_response(
            "SMTP configuration is incomplete. Check backend mail settings.",
            status_code=503,
        )

    return error_response(
        "The test email could not be sent.",
        {"detail": result.get("error", "Unknown mail delivery error.")},
        502,
    )
