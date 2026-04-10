import os

from app import create_app
from app.services.bootstrap_service import DEFAULT_ADMIN, ensure_bootstrap_data


def seed_database():
    app = create_app(os.getenv("FLASK_ENV", "development"))
    with app.app_context():
        created = ensure_bootstrap_data(log=app.logger)
        print("VoiceMart seed completed successfully.")
        print(
            f"Created categories={created['categories']}, products={created['products']}, admin_user={created['admin_user']}"
        )
        print(f"Admin login -> {DEFAULT_ADMIN['email']} / {DEFAULT_ADMIN['password']}")


if __name__ == "__main__":
    seed_database()
