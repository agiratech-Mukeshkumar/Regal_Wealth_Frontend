from flask_mail import Message
from flask import current_app
import pytz

def send_2fa_code_email(user_email, code):
    """
    Sends the 2FA verification code to the user's email.
    """
    try:
        
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

        print(f"Error sending email: {e}")
        return False



def send_welcome_email_with_password(user_email, plain_password):
    """
    Sends a welcome email to a new client with their temporary password.
    """
    try:
    
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
    
def send_appointment_email(client_email, client_name, advisor_name, appointment_details):
    """
    Sends an email to the client notifying them of a new appointment,
    with correct timezone conversion for both start and end times.
    """
    try:
        mail = current_app.extensions.get('mail')
        msg = Message(
            subject="New Appointment Scheduled with Regal Wealth Advisors",
            sender=("Regal Wealth Advisors", current_app.config['MAIL_USERNAME']),
            recipients=[client_email]
        )

     
        start_time_utc = appointment_details['start_time']
        end_time_utc = appointment_details['end_time']

  
        ist_tz = pytz.timezone('Asia/Kolkata')

        start_time_ist = start_time_utc.astimezone(ist_tz)
        end_time_ist = end_time_utc.astimezone(ist_tz)


        formatted_start = start_time_ist.strftime('%I:%M %p')
        formatted_end = end_time_ist.strftime('%I:%M %p')
        formatted_date = start_time_ist.strftime('%A, %B %d, %Y')

        
        msg.html = f"""
        <p>Dear {client_name},</p>
        <p>This is a confirmation that a new appointment has been scheduled for you by your advisor, {advisor_name}.</p>
        <p><strong>Appointment Details:</strong></p>
        <ul>
            <li><strong>Title:</strong> {appointment_details['title']}</li>
            <li><strong>When:</strong> {formatted_date}</li>
            <li><strong>Time:</strong> {formatted_start} to {formatted_end} (IST)</li>
        </ul>
        """

        if appointment_details.get('notes'):
            msg.html += f"<p><strong>Notes from your advisor:</strong><br>{appointment_details['notes']}</p>"

        msg.html += """
        <p>If you have any questions, please contact your advisor directly.</p>
        <p>Sincerely,<br>The Regal Wealth Advisors Team</p>
        """

        mail.send(msg)
        return True

    except Exception as e:
        print(f"Failed to send appointment email to {client_email}: {e}")
        return False

  

