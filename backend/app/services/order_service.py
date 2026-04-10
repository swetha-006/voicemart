from decimal import Decimal

from app.extensions import db
from app.models import ALLOWED_ORDER_STATUSES, CartItem, Order, OrderItem, Product
from app.services.email_service import send_lifecycle_email
from app.services.inventory_service import scan_low_stock_products
from app.services.notification_service import create_notification


STATUS_FLOW = ["New", "Processing", "Shipped", "Delivered"]


class OrderServiceError(ValueError):
    pass


def normalize_decimal(value):
    return Decimal(str(value)).quantize(Decimal("0.01"))


def place_order(user, items_payload=None):
    normalized_lines = []

    if items_payload:
        for item in items_payload:
            try:
                product_id = int(item.get("product_id"))
                quantity = int(item.get("quantity", 1))
            except (TypeError, ValueError):
                raise OrderServiceError("Each order item must include a valid product_id and quantity.")
            product = Product.query.filter_by(id=product_id, is_active=True).first()
            if not product:
                raise OrderServiceError("One or more products are unavailable.")
            normalized_lines.append({"product": product, "quantity": quantity})
    else:
        cart_items = CartItem.query.filter_by(user_id=user.id).all()
        if not cart_items:
            raise OrderServiceError("Your cart is empty.")

        for cart_item in cart_items:
            normalized_lines.append({"product": cart_item.product, "quantity": cart_item.quantity})

    if not normalized_lines:
        raise OrderServiceError("No order items were provided.")

    total_amount = Decimal("0.00")
    order = Order(user_id=user.id, status="New", total_amount=0)
    db.session.add(order)
    db.session.flush()

    for line in normalized_lines:
        product = line["product"]
        quantity = line["quantity"]

        if quantity < 1:
            raise OrderServiceError("Quantity must be at least 1.")
        if not product or not product.is_active:
            raise OrderServiceError("One or more selected products are inactive.")
        if product.stock < quantity:
            raise OrderServiceError(f"Insufficient stock for {product.name}.")

        unit_price = normalize_decimal(product.price)
        product.stock -= quantity
        total_amount += unit_price * quantity

        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name=product.name,
            quantity=quantity,
            unit_price=unit_price,
        )
        db.session.add(order_item)

    order.total_amount = normalize_decimal(total_amount)

    if not items_payload:
        CartItem.query.filter_by(user_id=user.id).delete(synchronize_session=False)

    create_notification(
        user.id,
        "ORDER_PLACED",
        f"Your order #{order.id} has been placed successfully. Total: ${order.total_amount}.",
    )
    db.session.commit()
    send_lifecycle_email(user, "ORDER_PLACED", order=order)
    scan_low_stock_products()
    return order


def update_order_status(order, new_status):
    if new_status not in ALLOWED_ORDER_STATUSES:
        raise OrderServiceError("Unsupported order status.")

    if order.status == "Cancelled":
        raise OrderServiceError("Cancelled orders cannot be updated.")

    if new_status == "Cancelled":
        raise OrderServiceError("Use the customer cancellation flow for order cancellation.")

    if order.status == "Delivered":
        raise OrderServiceError("Delivered orders cannot be updated.")

    current_index = STATUS_FLOW.index(order.status)
    next_index = STATUS_FLOW.index(new_status)

    if next_index < current_index:
        raise OrderServiceError("Order status cannot move backwards.")

    order.status = new_status
    notification_type = {
        "Processing": "ORDER_PROCESSING",
        "Shipped": "ORDER_SHIPPED",
        "Delivered": "ORDER_DELIVERED",
    }.get(new_status, "ORDER_STATUS")
    create_notification(
        order.user_id,
        notification_type,
        f"Your order #{order.id} status has been updated to {new_status}.",
    )
    db.session.commit()
    send_lifecycle_email(order.user, notification_type, order=order)
    return order


def cancel_order(order, user):
    if order.user_id != user.id:
        raise OrderServiceError("You can only cancel your own orders.")

    if order.status != "New":
        raise OrderServiceError("Only new orders can be cancelled.")

    for item in order.items:
        product = Product.query.get(item.product_id) if item.product_id else None
        if product:
            product.stock += item.quantity

    order.status = "Cancelled"
    create_notification(
        user.id,
        "ORDER_CANCELLED",
        f"Your order #{order.id} has been cancelled and stock has been restored.",
    )
    db.session.commit()
    send_lifecycle_email(user, "ORDER_CANCELLED", order=order)
    scan_low_stock_products()
    return order
