import html
import smtplib
import ssl
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from email.message import EmailMessage
from email.utils import formataddr

from flask import current_app


EMAIL_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="voicemart-email")


def format_currency(value):
    return f"${Decimal(str(value)).quantize(Decimal('0.01'))}"


def first_name_for(user):
    full_name = (getattr(user, "full_name", "") or "").strip()
    return full_name.split(" ")[0] if full_name else "there"


def get_public_app_url():
    return (current_app.config.get("PUBLIC_APP_URL") or "").rstrip("/")


def build_app_link(path):
    base_url = get_public_app_url()
    if not base_url:
        return path or "/"
    return f"{base_url}/{(path or '').lstrip('/')}" if path else base_url


def build_order_summary(order):
    if not order:
        return {"text": "", "html": "", "items_text": "", "items_html": ""}

    item_lines = []
    item_rows = []
    for item in order.items:
        line_total = format_currency(item.unit_price * item.quantity)
        item_lines.append(f"- {item.product_name} x{item.quantity} ({line_total})")
        item_rows.append(
            "<li style=\"margin:0 0 8px;\">"
            f"{html.escape(item.product_name)} x{item.quantity} "
            f"(<strong>{html.escape(line_total)}</strong>)"
            "</li>"
        )

    items_text = "\n".join(item_lines)
    items_html = "<ul style=\"padding-left:20px; margin:12px 0;\">" + "".join(item_rows) + "</ul>"
    text = (
        f"Order #{order.id}\n"
        f"Status: {order.status}\n"
        f"Total: {format_currency(order.total_amount)}\n"
        f"{items_text}"
    )
    html_body = (
        f"<p style=\"margin:0 0 8px;\"><strong>Order #{order.id}</strong></p>"
        f"<p style=\"margin:0 0 8px;\">Status: <strong>{html.escape(order.status)}</strong></p>"
        f"<p style=\"margin:0 0 8px;\">Total: <strong>{html.escape(format_currency(order.total_amount))}</strong></p>"
        f"{items_html}"
    )
    return {
        "text": text,
        "html": html_body,
        "items_text": items_text,
        "items_html": items_html,
    }


def build_notification_email(user, notification_type, order=None):
    name = first_name_for(user)
    home_url = build_app_link("")
    orders_url = build_app_link("/orders")
    profile_url = build_app_link("/profile")
    order_summary = build_order_summary(order)

    templates = {
        "WELCOME": {
            "subject": f"Welcome to VoiceMart, {name}",
            "headline": f"Welcome to VoiceMart, {name}",
            "text": (
                f"Hi {name},\n\n"
                "Your VoiceMart account is ready.\n"
                "You can now explore accessible shopping with voice guidance, quick cart actions, and order tracking.\n\n"
                f"Start here: {home_url}\n"
                f"Manage your profile: {profile_url}\n\n"
                "We are glad to have you with us."
            ),
            "html": (
                f"<p>Hi {html.escape(name)},</p>"
                "<p>Your <strong>VoiceMart</strong> account is ready.</p>"
                "<p>You can now explore accessible shopping with voice guidance, quick cart actions, and order tracking.</p>"
                f"<p><a href=\"{html.escape(home_url)}\">Start shopping</a><br />"
                f"<a href=\"{html.escape(profile_url)}\">Manage your profile</a></p>"
                "<p>We are glad to have you with us.</p>"
            ),
        },
        "ORDER_PLACED": {
            "subject": f"VoiceMart order #{order.id} confirmed" if order else "VoiceMart order confirmed",
            "headline": "Your order is confirmed",
            "text": (
                f"Hi {name},\n\n"
                "Your order has been placed successfully.\n\n"
                f"{order_summary['text']}\n\n"
                f"Track your order: {orders_url}\n"
                "Thank you for shopping with VoiceMart."
            ),
            "html": (
                f"<p>Hi {html.escape(name)},</p>"
                "<p>Your order has been placed successfully.</p>"
                f"{order_summary['html']}"
                f"<p><a href=\"{html.escape(orders_url)}\">Track your order</a></p>"
                "<p>Thank you for shopping with VoiceMart.</p>"
            ),
        },
        "ORDER_PROCESSING": {
            "subject": f"VoiceMart order #{order.id} is being prepared" if order else "Your VoiceMart order is being prepared",
            "headline": "Your order is being prepared",
            "text": (
                f"Hi {name},\n\n"
                "Good news. Your order is now being prepared by our fulfillment team.\n\n"
                f"{order_summary['text']}\n\n"
                f"Track status updates: {orders_url}"
            ),
            "html": (
                f"<p>Hi {html.escape(name)},</p>"
                "<p>Good news. Your order is now being prepared by our fulfillment team.</p>"
                f"{order_summary['html']}"
                f"<p><a href=\"{html.escape(orders_url)}\">Track status updates</a></p>"
            ),
        },
        "ORDER_SHIPPED": {
            "subject": f"VoiceMart order #{order.id} is on the way" if order else "Your VoiceMart order is on the way",
            "headline": "Your order has shipped",
            "text": (
                f"Hi {name},\n\n"
                "Your order is on the way.\n\n"
                f"{order_summary['text']}\n\n"
                f"Open your orders page for the latest update: {orders_url}"
            ),
            "html": (
                f"<p>Hi {html.escape(name)},</p>"
                "<p>Your order is on the way.</p>"
                f"{order_summary['html']}"
                f"<p><a href=\"{html.escape(orders_url)}\">Open your orders page</a> for the latest update.</p>"
            ),
        },
        "ORDER_DELIVERED": {
            "subject": f"VoiceMart order #{order.id} delivered" if order else "Your VoiceMart order has been delivered",
            "headline": "Your order has been delivered",
            "text": (
                f"Hi {name},\n\n"
                "Your order has been marked as delivered.\n"
                "We hope it makes your day easier and more accessible.\n\n"
                f"{order_summary['text']}\n\n"
                f"See your order history: {orders_url}\n"
                f"Continue shopping: {home_url}"
            ),
            "html": (
                f"<p>Hi {html.escape(name)},</p>"
                "<p>Your order has been marked as delivered.</p>"
                "<p>We hope it makes your day easier and more accessible.</p>"
                f"{order_summary['html']}"
                f"<p><a href=\"{html.escape(orders_url)}\">See your order history</a><br />"
                f"<a href=\"{html.escape(home_url)}\">Continue shopping</a></p>"
            ),
        },
        "ORDER_CANCELLED": {
            "subject": f"VoiceMart order #{order.id} cancelled" if order else "Your VoiceMart order has been cancelled",
            "headline": "Your order has been cancelled",
            "text": (
                f"Hi {name},\n\n"
                "Your order cancellation has been completed successfully.\n\n"
                f"{order_summary['text']}\n\n"
                f"You can browse again anytime: {home_url}"
            ),
            "html": (
                f"<p>Hi {html.escape(name)},</p>"
                "<p>Your order cancellation has been completed successfully.</p>"
                f"{order_summary['html']}"
                f"<p><a href=\"{html.escape(home_url)}\">Browse products again</a></p>"
            ),
        },
    }

    fallback_subject = "VoiceMart notification"
    fallback_text = (
        f"Hi {name},\n\n"
        "There is an update on your VoiceMart account.\n"
        f"Open VoiceMart: {home_url}"
    )
    fallback_html = (
        f"<p>Hi {html.escape(name)},</p>"
        "<p>There is an update on your VoiceMart account.</p>"
        f"<p><a href=\"{html.escape(home_url)}\">Open VoiceMart</a></p>"
    )

    template = templates.get(notification_type, None)
    if not template:
        return {"subject": fallback_subject, "text": fallback_text, "html": fallback_html}
    return template


def build_registration_otp_email(full_name, otp_code):
    recipient_name = (full_name or "").strip().split(" ")[0] or "there"
    home_url = build_app_link("")
    otp_text = (
        f"Hi {recipient_name},\n\n"
        "Welcome to VoiceMart.\n"
        "Use the verification code below to complete your registration:\n\n"
        f"{otp_code}\n\n"
        f"This code expires in {current_app.config.get('REGISTRATION_OTP_EXPIRY_MINUTES', 10)} minutes.\n"
        "If you did not start this registration, you can ignore this email.\n\n"
        f"VoiceMart: {home_url}"
    )
    otp_html = (
        f"<p>Hi {html.escape(recipient_name)},</p>"
        "<p>Welcome to <strong>VoiceMart</strong>.</p>"
        "<p>Use the verification code below to complete your registration:</p>"
        f"<p style=\"font-size:28px; font-weight:700; letter-spacing:6px; margin:20px 0;\">{html.escape(otp_code)}</p>"
        f"<p>This code expires in {current_app.config.get('REGISTRATION_OTP_EXPIRY_MINUTES', 10)} minutes.</p>"
        "<p>If you did not start this registration, you can ignore this email.</p>"
        f"<p><a href=\"{html.escape(home_url)}\">Open VoiceMart</a></p>"
    )
    return {
        "subject": "Your VoiceMart verification code",
        "text": otp_text,
        "html": otp_html,
    }


def _deliver_email_now(app, config, recipient, subject, text_body, html_body=None):
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((config["mail_from_name"], config["mail_from_address"]))
    message["To"] = recipient
    message.set_content(text_body)

    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        if config["smtp_use_ssl"]:
            with smtplib.SMTP_SSL(
                config["smtp_host"],
                config["smtp_port"],
                timeout=config["timeout"],
                context=ssl.create_default_context(),
            ) as server:
                if config["smtp_username"]:
                    server.login(config["smtp_username"], config["smtp_password"])
                server.send_message(message)
        else:
            with smtplib.SMTP(
                config["smtp_host"],
                config["smtp_port"],
                timeout=config["timeout"],
            ) as server:
                server.ehlo()
                if config["smtp_use_tls"]:
                    server.starttls(context=ssl.create_default_context())
                    server.ehlo()
                if config["smtp_username"]:
                    server.login(config["smtp_username"], config["smtp_password"])
                server.send_message(message)

        with app.app_context():
            app.logger.info("Email sent to %s with subject '%s'.", recipient, subject)
        return {"status": "sent"}
    except Exception as exc:
        with app.app_context():
            app.logger.exception("Failed to send email to %s.", recipient)
        return {"status": "failed", "error": str(exc)}


def send_email(recipient, subject, text_body, html_body=None):
    if not current_app.config.get("EMAIL_NOTIFICATIONS_ENABLED", False):
        current_app.logger.info("Email notifications disabled. Skipping email for %s.", recipient)
        return {"status": "disabled"}

    smtp_host = current_app.config.get("SMTP_HOST")
    smtp_username = current_app.config.get("SMTP_USERNAME")
    mail_from_address = current_app.config.get("MAIL_FROM_ADDRESS") or smtp_username
    if not smtp_host or not mail_from_address:
        current_app.logger.warning(
            "Email notifications are enabled but SMTP_HOST or MAIL_FROM_ADDRESS is missing."
        )
        return {"status": "misconfigured"}

    app = current_app._get_current_object()
    config = {
        "smtp_host": smtp_host,
        "smtp_port": current_app.config.get("SMTP_PORT", 587),
        "smtp_username": smtp_username,
        "smtp_password": current_app.config.get("SMTP_PASSWORD"),
        "smtp_use_tls": current_app.config.get("SMTP_USE_TLS", True),
        "smtp_use_ssl": current_app.config.get("SMTP_USE_SSL", False),
        "mail_from_address": mail_from_address,
        "mail_from_name": current_app.config.get("MAIL_FROM_NAME", "VoiceMart"),
        "timeout": current_app.config.get("EMAIL_SEND_TIMEOUT", 15),
    }

    EMAIL_EXECUTOR.submit(
        _deliver_email_now,
        app,
        config,
        recipient,
        subject,
        text_body,
        html_body,
    )
    current_app.logger.info("Email queued for %s with subject '%s'.", recipient, subject)
    return {"status": "queued"}


def send_lifecycle_email(user, notification_type, order=None):
    if not user or not getattr(user, "email", None):
        return {"status": "skipped"}

    template = build_notification_email(user, notification_type, order=order)
    return send_email(user.email, template["subject"], template["text"], template["html"])


def send_registration_otp_email(email, full_name, otp_code):
    if not email:
        return {"status": "skipped"}

    template = build_registration_otp_email(full_name, otp_code)
    return send_email(email, template["subject"], template["text"], template["html"])


def send_admin_test_email(recipient, requested_by=None):
    sender_name = (
        getattr(requested_by, "full_name", None)
        or getattr(requested_by, "email", None)
        or "VoiceMart Admin"
    )
    dashboard_url = build_app_link("/admin")
    orders_url = build_app_link("/admin/orders")

    subject = "VoiceMart test email"
    text_body = (
        f"Hello,\n\n"
        f"This is a test email from VoiceMart.\n"
        f"It was triggered by {sender_name} to verify SMTP delivery from the admin dashboard.\n\n"
        f"Admin dashboard: {dashboard_url}\n"
        f"Orders: {orders_url}\n\n"
        "If you received this message, the mail integration is working."
    )
    html_body = (
        "<p>Hello,</p>"
        "<p>This is a <strong>test email</strong> from VoiceMart.</p>"
        f"<p>It was triggered by <strong>{html.escape(str(sender_name))}</strong> "
        "to verify SMTP delivery from the admin dashboard.</p>"
        f"<p><a href=\"{html.escape(dashboard_url)}\">Admin dashboard</a><br />"
        f"<a href=\"{html.escape(orders_url)}\">Orders</a></p>"
        "<p>If you received this message, the mail integration is working.</p>"
    )
    return send_email(recipient, subject, text_body, html_body)
