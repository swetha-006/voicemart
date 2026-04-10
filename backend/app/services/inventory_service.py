from app.extensions import db
from app.models import Alert, Product


def scan_low_stock_products():
    created_alerts = []

    low_stock_products = Product.query.filter(
        Product.is_active.is_(True), Product.stock <= Product.reorder_level
    ).all()

    for product in low_stock_products:
        existing_alert = Alert.query.filter_by(
            product_id=product.id, alert_type="LOW_STOCK", is_resolved=False
        ).first()
        if existing_alert:
            continue

        alert = Alert(
            product_id=product.id,
            alert_type="LOW_STOCK",
            message=(
                f"{product.name} stock is low. Remaining quantity is "
                f"{product.stock}, below reorder level {product.reorder_level}."
            ),
        )
        db.session.add(alert)
        created_alerts.append(alert)

    stale_alerts = (
        Alert.query.join(Product, Alert.product_id == Product.id)
        .filter(
            Alert.alert_type == "LOW_STOCK",
            Alert.is_resolved.is_(False),
            Product.stock > Product.reorder_level,
        )
        .all()
    )

    resolved_count = 0
    for alert in stale_alerts:
        alert.is_resolved = True
        resolved_count += 1

    if created_alerts or resolved_count:
        db.session.commit()

    return {
        "alerts_created": [alert.to_dict() for alert in created_alerts],
        "resolved_count": resolved_count,
    }


def register_inventory_jobs(app, scheduler_instance):
    interval_minutes = app.config["LOW_STOCK_SCAN_INTERVAL_MINUTES"]

    if scheduler_instance.get_job("low-stock-scan"):
        return

    scheduler_instance.add_job(
        id="low-stock-scan",
        func=lambda: run_inventory_scan(app),
        trigger="interval",
        minutes=interval_minutes,
        replace_existing=True,
        max_instances=1,
    )


def run_inventory_scan(app):
    with app.app_context():
        scan_low_stock_products()
