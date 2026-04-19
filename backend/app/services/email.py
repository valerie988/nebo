# app/services/email.py

def send_verification_email(email: str, name: str, token: str):
    print(f"[EMAIL] Verify {email} with token: {token}")


def send_password_reset_email(email: str, name: str, token: str):
    print(f"[EMAIL] Reset password for {email} with token: {token}")


def send_order_notification_email(email: str, order_id: str):
    print(f"[EMAIL] Order {order_id} sent to {email}")