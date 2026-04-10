import re

from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_

from app.extensions import db
from app.models import CartItem, Category, Order, Product, User
from app.models.notification import Notification
from app.services.order_service import OrderServiceError, cancel_order, place_order
from app.utils.auth_helpers import customer_required, get_current_user
from app.utils.response import error_response, success_response


customer_bp = Blueprint("customer", __name__, url_prefix="/customer")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def serialize_cart(user_id):
    cart_items = CartItem.query.filter_by(user_id=user_id).order_by(CartItem.created_at.desc()).all()
    serialized_items = [cart_item.to_dict() for cart_item in cart_items]
    subtotal = sum(item["line_total"] for item in serialized_items)
    total_items = sum(cart_item.quantity for cart_item in cart_items)
    return {
        "items": serialized_items,
        "subtotal": round(subtotal, 2),
        "total_items": total_items,
    }


def get_user_cart_item(user_id, item_id):
    cart_item = CartItem.query.filter_by(id=item_id, user_id=user_id).first()
    if not cart_item:
        return None, error_response("Cart item was not found.", status_code=404)
    return cart_item, None


def get_user_order(user_id, order_id):
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        return None, error_response("Order was not found.", status_code=404)
    return order, None


@customer_bp.get("/products")
@jwt_required(optional=True)
def get_products():
    category = (request.args.get("category") or "").strip()
    search = (request.args.get("search") or "").strip()

    query = Product.query.filter(Product.is_active.is_(True))
    joined_category = False

    if category:
        if category.isdigit():
            query = query.filter(Product.category_id == int(category))
        else:
            query = query.join(Category).filter(Category.name.ilike(f"%{category}%"))
            joined_category = True

    if search:
        search_term = f"%{search}%"
        if not joined_category:
            query = query.join(Category)
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Category.name.ilike(search_term),
            )
        )

    products = query.order_by(Product.created_at.desc()).all()
    return success_response("Products fetched successfully.", {"products": [product.to_dict() for product in products]})


@customer_bp.post("/cart")
@customer_required
def add_to_cart():
    user = get_current_user()
    data = request.get_json(silent=True) or {}

    try:
        product_id = int(data.get("product_id"))
        quantity = int(data.get("quantity", 1))
    except (TypeError, ValueError):
        return error_response("product_id and quantity must be valid integers.", status_code=422)

    if quantity < 1:
        return error_response("quantity must be at least 1.", status_code=422)

    product = Product.query.filter_by(id=product_id, is_active=True).first()
    if not product:
        return error_response("Selected product was not found.", status_code=404)

    cart_item = CartItem.query.filter_by(user_id=user.id, product_id=product_id).first()
    existing_quantity = cart_item.quantity if cart_item else 0
    if existing_quantity + quantity > product.stock:
        return error_response("Requested quantity exceeds available stock.", status_code=422)

    if cart_item:
        cart_item.quantity += quantity
    else:
        cart_item = CartItem(user_id=user.id, product_id=product_id, quantity=quantity)
        db.session.add(cart_item)

    db.session.commit()
    return success_response("Item added to cart successfully.", {"cart": serialize_cart(user.id)})


@customer_bp.get("/cart")
@customer_required
def get_cart():
    user = get_current_user()
    return success_response("Cart fetched successfully.", {"cart": serialize_cart(user.id)})


@customer_bp.put("/cart/<int:item_id>")
@customer_required
def update_cart_item(item_id):
    user = get_current_user()
    data = request.get_json(silent=True) or {}

    try:
        quantity = int(data.get("quantity"))
    except (TypeError, ValueError):
        return error_response("quantity must be a valid integer.", status_code=422)

    cart_item, error = get_user_cart_item(user.id, item_id)
    if error:
        return error

    if quantity < 1:
        db.session.delete(cart_item)
        db.session.commit()
        return success_response("Cart item removed successfully.", {"cart": serialize_cart(user.id)})

    if quantity > cart_item.product.stock:
        return error_response("Requested quantity exceeds available stock.", status_code=422)

    cart_item.quantity = quantity
    db.session.commit()
    return success_response("Cart updated successfully.", {"cart": serialize_cart(user.id)})


@customer_bp.delete("/cart/<int:item_id>")
@customer_required
def delete_cart_item(item_id):
    user = get_current_user()
    cart_item, error = get_user_cart_item(user.id, item_id)
    if error:
        return error

    db.session.delete(cart_item)
    db.session.commit()
    return success_response("Cart item removed successfully.", {"cart": serialize_cart(user.id)})


@customer_bp.delete("/cart")
@customer_required
def clear_cart():
    user = get_current_user()
    CartItem.query.filter_by(user_id=user.id).delete(synchronize_session=False)
    db.session.commit()
    return success_response("Cart cleared successfully.", {"cart": serialize_cart(user.id)})


@customer_bp.post("/orders")
@customer_required
def create_order():
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    items = data.get("items")

    try:
        order = place_order(user, items_payload=items)
    except OrderServiceError as exc:
        return error_response(str(exc), status_code=422)

    return success_response("Order placed successfully.", {"order": order.to_dict()}, 201)


@customer_bp.get("/orders")
@customer_required
def get_orders():
    user = get_current_user()
    orders = Order.query.filter_by(user_id=user.id).order_by(Order.created_at.desc()).all()
    return success_response("Orders fetched successfully.", {"orders": [order.to_dict() for order in orders]})


@customer_bp.delete("/orders/<int:order_id>")
@customer_required
def cancel_customer_order(order_id):
    user = get_current_user()
    order, error = get_user_order(user.id, order_id)
    if error:
        return error

    try:
        cancelled_order = cancel_order(order, user)
    except OrderServiceError as exc:
        return error_response(str(exc), status_code=422)

    return success_response("Order cancelled successfully.", {"order": cancelled_order.to_dict()})


@customer_bp.get("/profile")
@customer_required
def get_profile():
    user = get_current_user()
    return success_response("Profile fetched successfully.", {"user": user.to_dict()})


@customer_bp.put("/profile")
@customer_required
def update_profile():
    user = get_current_user()
    data = request.get_json(silent=True) or {}

    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    errors = {}

    if not full_name or len(full_name) < 2:
        errors["full_name"] = "Full name must be at least 2 characters."
    if not EMAIL_PATTERN.match(email):
        errors["email"] = "A valid email address is required."

    existing_user = User.query.filter(User.email == email, User.id != user.id).first()
    if existing_user:
        errors["email"] = "Another account already uses this email address."

    if errors:
        return error_response("Profile validation failed.", errors, 422)

    user.full_name = full_name
    user.email = email
    db.session.commit()
    return success_response("Profile updated successfully.", {"user": user.to_dict()})


@customer_bp.get("/notifications")
@customer_required
def get_notifications():
    user = get_current_user()
    notifications = (
        Notification.query.filter_by(user_id=user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return success_response(
        "Notifications fetched.",
        {"notifications": [n.to_dict() for n in notifications], "unread_count": unread_count},
    )


@customer_bp.put("/notifications/read")
@customer_required
def mark_notifications_read():
    user = get_current_user()
    Notification.query.filter_by(user_id=user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return success_response("All notifications marked as read.", {"unread_count": 0})
