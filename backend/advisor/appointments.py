from flask import jsonify, request
from utils.email_sender import send_appointment_email
from utils.db import get_db_connection
from auth.decorators import advisor_required
from .routes import advisor_bp
from datetime import datetime, timedelta



@advisor_bp.route('/appointments', methods=['POST'])
@advisor_required
def schedule_appointment(current_user):
    """
    Schedules a new appointment for a client, creates a notification, and sends an email.
    """
    advisor_id = current_user['user_id']
    data = request.get_json()

    required_fields = ['client_user_id', 'title', 'start_time', 'end_time']
    if not all(field in data for field in required_fields):
        return jsonify({"message": "Missing required appointment fields"}), 400

    client_id = data.get('client_user_id')
    title = data.get('title')
    start_time_str = data.get('start_time')
    end_time_str = data.get('end_time')
    notes = data.get('notes')


    if start_time_str and start_time_str.endswith('Z'):
        start_time_str = start_time_str[:-1] + '+00:00'
    if end_time_str and end_time_str.endswith('Z'):
        end_time_str = end_time_str[:-1] + '+00:00'
        
    try:
        start_time = datetime.fromisoformat(start_time_str)
        end_time = datetime.fromisoformat(end_time_str)
    except ValueError:
        return jsonify({"message": "Invalid datetime format. Please use ISO 8601 format."}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        cursor.execute(
            "INSERT INTO appointments (advisor_user_id, client_user_id, title, start_time, end_time, notes) VALUES (%s, %s, %s, %s, %s, %s)",
            (advisor_id, client_id, title, start_time, end_time, notes)
        )

        cursor.execute("SELECT first_name, last_name FROM users WHERE id = %s", (advisor_id,))
        advisor = cursor.fetchone()
        advisor_name = f"{advisor['first_name']} {advisor['last_name']}"
        
        message = f"{advisor_name} has scheduled a new appointment '{title}' for you."
        link_url = f"/my-plan"
        
        cursor.execute(
            "INSERT INTO notifications (recipient_user_id, message, link_url) VALUES (%s, %s, %s)",
            (client_id, message, link_url)
        )
        
        cursor.execute("SELECT email, first_name, last_name FROM users WHERE id = %s", (client_id,))
        client = cursor.fetchone()
        
        appointment_details = {
            "title": title,
            "start_time": start_time,
            "notes": notes,
            "end_time": end_time
        }
        
        send_appointment_email(
            client_email=client['email'],
            client_name=f"{client['first_name']} {client['last_name']}",
            advisor_name=advisor_name,
            appointment_details=appointment_details
        )

        conn.commit()
        
        return jsonify({"message": "Appointment scheduled, and client has been notified."}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An unexpected error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()



@advisor_bp.route('/appointments', methods=['GET'])
@advisor_required
def get_advisor_appointments(current_user):
    """
    Fetches all upcoming appointments for the logged-in advisor to check for conflicts.
    """
    advisor_id = current_user['user_id']
    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
       
        sql = "SELECT start_time, end_time FROM appointments WHERE advisor_user_id = %s AND start_time >= NOW()"
        cursor.execute(sql, (advisor_id,))
        appointments = cursor.fetchall()
        
        for appt in appointments:
            if appt.get('start_time'): appt['start_time'] = appt['start_time'].isoformat()
            if appt.get('end_time'): appt['end_time'] = appt['end_time'].isoformat()
            
        return jsonify(appointments), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()
