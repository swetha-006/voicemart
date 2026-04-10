from flask import current_app

from app.extensions import bcrypt, db
from app.models import Category, Product, User


SEED_CATEGORIES = [
    {
        "name": "Assistive Tech",
        "description": "Accessibility-focused electronics and supportive devices.",
    },
    {
        "name": "Smart Home",
        "description": "Voice-first devices that make day-to-day living easier.",
    },
]

SEED_PRODUCTS = [
    {
        "name": "EchoGuide Smart Speaker",
        "description": "A room-filling speaker with tactile controls and responsive voice playback.",
        "category": "Smart Home",
        "price": 129.99,
        "mrp": 159.99,
        "discount": 19,
        "stock": 24,
        "reorder_level": 8,
        "image_url": "https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "TouchSense Headphones",
        "description": "Noise-isolating headphones with extra-large tactile buttons and crisp speech clarity.",
        "category": "Assistive Tech",
        "price": 89.99,
        "mrp": 119.99,
        "discount": 25,
        "stock": 18,
        "reorder_level": 6,
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "VisionMate Magnifier",
        "description": "Portable digital magnifier with voice prompts and anti-glare display.",
        "category": "Assistive Tech",
        "price": 149.99,
        "mrp": 189.99,
        "discount": 21,
        "stock": 12,
        "reorder_level": 5,
        "image_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "PulseBand SOS Watch",
        "description": "Emergency-ready smart watch with voice dialing, medication reminders, and high-contrast display.",
        "category": "Assistive Tech",
        "price": 199.99,
        "mrp": 249.99,
        "discount": 20,
        "stock": 9,
        "reorder_level": 4,
        "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "CareLight Motion Lamp",
        "description": "Smart bedside lamp with voice brightness control and motion-triggered night guidance.",
        "category": "Smart Home",
        "price": 59.99,
        "mrp": 79.99,
        "discount": 25,
        "stock": 30,
        "reorder_level": 10,
        "image_url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "DoorAssist Smartbell",
        "description": "Doorbell with spoken visitor announcements, flash alerts, and mobile control.",
        "category": "Smart Home",
        "price": 109.99,
        "mrp": 139.99,
        "discount": 21,
        "stock": 15,
        "reorder_level": 5,
        "image_url": "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=900&q=80",
    },
]

DEFAULT_ADMIN = {
    "full_name": "VoiceMart Admin",
    "email": "admin@voicemart.com",
    "password": "Admin@123",
    "role": "admin",
}


def ensure_bootstrap_data(log=None):
    created = {"categories": 0, "products": 0, "admin_user": 0}

    category_map = {category.name: category for category in Category.query.all()}
    for category_payload in SEED_CATEGORIES:
        category = category_map.get(category_payload["name"])
        if category:
            continue

        category = Category(**category_payload)
        db.session.add(category)
        db.session.flush()
        category_map[category.name] = category
        created["categories"] += 1

    existing_products = {row[0] for row in Product.query.with_entities(Product.name).all()}
    for product_payload in SEED_PRODUCTS:
        if product_payload["name"] in existing_products:
            continue

        category = category_map.get(product_payload["category"])
        if not category:
            continue

        product = Product(
            name=product_payload["name"],
            description=product_payload["description"],
            category_id=category.id,
            price=product_payload["price"],
            mrp=product_payload["mrp"],
            discount=product_payload["discount"],
            stock=product_payload["stock"],
            reorder_level=product_payload["reorder_level"],
            image_url=product_payload["image_url"],
            is_active=True,
        )
        db.session.add(product)
        existing_products.add(product_payload["name"])
        created["products"] += 1

    admin_user = User.query.filter_by(email=DEFAULT_ADMIN["email"]).first()
    if not admin_user:
        admin_user = User(
            full_name=DEFAULT_ADMIN["full_name"],
            email=DEFAULT_ADMIN["email"],
            password_hash=bcrypt.generate_password_hash(
                DEFAULT_ADMIN["password"],
                rounds=current_app.config.get("BCRYPT_LOG_ROUNDS", 12),
            ).decode("utf-8"),
            role=DEFAULT_ADMIN["role"],
        )
        db.session.add(admin_user)
        created["admin_user"] = 1

    if any(created.values()):
        db.session.commit()
        if log:
            log.info(
                "Bootstrap seed applied. categories=%s products=%s admin_user=%s",
                created["categories"],
                created["products"],
                created["admin_user"],
            )
    else:
        db.session.rollback()
        if log:
            log.info("Bootstrap seed skipped. Existing data already present.")

    return created
