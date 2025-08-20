from flask_mail import Message
from flask import current_app

def send_2fa_code_email(user_email, code):
    """
    Sends the 2FA verification code to the user's email.
    """
    try:
        # Get the mail instance from the current app context
        mail = current_app.extensions.get('mail')
        
        msg = Message(
            subject="Your Regal Wealth Advisors Verification Code",
            sender=("Regal Wealth Advisors", current_app.config['MAIL_USERNAME']),
            recipients=[user_email],
            body=f"Your two-factor authentication code is: {code}\n\nThis code will expire in 10 minutes."
        )
        mail.send(msg)
        return True
    except Exception as e:
        # Log the error in a real application
        print(f"Error sending email: {e}")
        return False


# Add this new function to your email_sender.py file

def send_welcome_email_with_password(user_email, plain_password):
    """
    Sends a welcome email to a new client with their temporary password.
    """
    try:
        # Get the mail instance from the current app context
        mail = current_app.extensions.get('mail')
        
        msg = Message(
            subject="Welcome to Regal Wealth Advisors",
            sender=("Regal Wealth Advisors", current_app.config['MAIL_USERNAME']),
            recipients=[user_email],
            body=f"""
Hello,

Welcome to Regal Wealth Advisors! Your account has been created.

You can log in using your email address and the following temporary password:
Password: {plain_password}

We recommend you change your password after your first login.

Thank you,
The Regal Wealth Advisors Team
            """
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending welcome email: {e}")
        return False