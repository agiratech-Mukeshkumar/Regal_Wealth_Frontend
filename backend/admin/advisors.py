from flask import request, jsonify
from werkzeug.security import generate_password_hash
import uuid, mysql.connector
from utils.db import get_db_connection
from utils.email_sender import send_welcome_email_with_password
from auth.decorators import admin_required
from .routes import admin_bp

@admin_bp.route('/advisors', methods=['GET'])
@admin_required
def get_all_advisors():
    """Fetches a list of all users with the 'advisor' role."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, first_name, last_name, email, role, is_active FROM users WHERE role = 'advisor'")
        advisors = cursor.fetchall()
        return jsonify(advisors), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/advisors', methods=['POST'])
@admin_required
def add_new_advisor():
    """Creates a new advisor and emails them their temporary password."""
    data = request.get_json()

    if not data or not data.get('email') or not data.get('first_name') or not data.get('last_name'):
        return jsonify({"message": "Email, first name, and last name are required"}), 400

    email = data.get('email')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    
    initial_password = str(uuid.uuid4())[:8]
    hashed_password = generate_password_hash(initial_password)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES (%s, %s, 'advisor', %s, %s)",
            (email, hashed_password, first_name, last_name)
        )
        new_advisor_id = cursor.lastrowid
        conn.commit()

        send_welcome_email_with_password(email, initial_password)
        
        cursor.execute("SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = %s", (new_advisor_id,))
        new_advisor = cursor.fetchone()

        return jsonify({
            "message": "Advisor added and welcome email sent.",
            "advisor": new_advisor
        }), 201

    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno == 1062:
            return jsonify({"message": "An advisor with this email already exists."}), 409
        return jsonify({"message": f"A database error occurred: {err}"}), 500
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An unexpected error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/clients/<int:client_id>/assign', methods=['POST'])
@admin_required
def assign_client_to_advisor(client_id):
    """
    Assigns a client to an advisor.
    Expects a JSON body with {"advisor_id": X}
    """
    data = request.get_json()
    advisor_id = data.get('advisor_id')

    if not advisor_id:
        return jsonify({"message": "Advisor ID is required"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor()
    try:
        
        cursor.execute("DELETE FROM advisor_client_map WHERE client_user_id = %s", (client_id,))

        sql = "INSERT INTO advisor_client_map (advisor_user_id, client_user_id) VALUES (%s, %s)"
        cursor.execute(sql, (advisor_id, client_id))
        conn.commit()

        return jsonify({"message": f"Client {client_id} successfully assigned to advisor {advisor_id}"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()