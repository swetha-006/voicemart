from datetime import datetime, timezone

from app.extensions import db


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True, index=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    products = db.relationship("Product", back_populates="category", lazy="selectin")

    def to_dict(self, include_products=False):
        payload = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
        }
        if include_products:
            payload["products"] = [product.to_dict(include_category=False) for product in self.products]
        return payload


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(180), nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    category_id = db.Column(
        db.Integer, db.ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    price = db.Column(db.Numeric(10, 2), nullable=False)
    mrp = db.Column(db.Numeric(10, 2), nullable=False)
    discount = db.Column(db.Integer, nullable=False, default=0)
    stock = db.Column(db.Integer, nullable=False, default=0)
    reorder_level = db.Column(db.Integer, nullable=False, default=5)
    image_url = db.Column(db.String(500), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    category = db.relationship("Category", back_populates="products", lazy="joined")
    order_items = db.relationship(
        "OrderItem", back_populates="product", passive_deletes=True, lazy="selectin"
    )
    cart_items = db.relationship(
        "CartItem", back_populates="product", cascade="all, delete-orphan", lazy="selectin"
    )
    alerts = db.relationship(
        "Alert", back_populates="product", cascade="all, delete-orphan", lazy="selectin"
    )

    def to_dict(self, include_category=True):
        payload = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category_id": self.category_id,
            "price": float(self.price),
            "mrp": float(self.mrp),
            "discount": self.discount,
            "stock": self.stock,
            "reorder_level": self.reorder_level,
            "image_url": self.image_url,
            "is_active": self.is_active,
            "isActive": self.is_active,
            "created_at": self.created_at.isoformat(),
        }
        if include_category and self.category:
            payload["category"] = self.category.to_dict()
        return payload
