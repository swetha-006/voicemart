from app.extensions import db
from app.models.notification import Notification


def create_notification(user_id, type, message):
    notification = Notification(user_id=user_id, type=type, message=message)
    db.session.add(notification)
    return notification
