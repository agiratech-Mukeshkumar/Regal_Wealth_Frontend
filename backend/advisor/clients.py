from flask import jsonify, request
from utils.db import get_db_connection
from auth.decorators import advisor_required, advisor_document_required
from werkzeug.security import generate_password_hash
import uuid
import mysql.connector
from utils.email_sender import send_welcome_email_with_password
from .routes import advisor_bp


@advisor_bp.route('/clients', methods=['GET'])
@advisor_required
def get_my_clients(current_user):
    """
    Fetches a list of clients, now including advisor name and next appointment date.
    """
    advisor_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
            SELECT 
                c.id, c.email, c.first_name, c.last_name, c.is_active,
                cp.onboarding_status, cp.tier,
                CONCAT(a.first_name, ' ', a.last_name) as advisor_name,
                (SELECT MIN(start_time) FROM appointments app 
                 WHERE app.client_user_id = c.id AND app.start_time >= CURDATE()) as next_appointment
            FROM users c
            JOIN client_profiles cp ON c.id = cp.client_user_id
            JOIN advisor_client_map acm ON c.id = acm.client_user_id
            JOIN users a ON acm.advisor_user_id = a.id
            WHERE acm.advisor_user_id = %s
        """
        cursor.execute(sql, (advisor_id,))
        clients = cursor.fetchall()
        
        for client in clients:
            if client['next_appointment']:
                client['next_appointment'] = client['next_appointment'].strftime('%d-%b-%Y')
        
        return jsonify(clients), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@advisor_bp.route('/clients/<int:client_id>', methods=['GET'])
@advisor_required
def get_client_details(current_user, client_id):
    """
    Fetches all profile details for a single client assigned to the advisor.
    """
    advisor_id = current_user['user_id']
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
        
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Verify this client belongs to the advisor
        cursor.execute(
            "SELECT 1 FROM advisor_client_map WHERE advisor_user_id = %s AND client_user_id = %s",
            (advisor_id, client_id)
        )
        if not cursor.fetchone():
            return jsonify({"message": "Client not found or not assigned to this advisor"}), 404

        # 2. Fetch all related data in separate queries
        
        # --- Personal & Profile Info ---
        cursor.execute(
            """
            SELECT u.first_name, u.last_name, u.email, 
                   u.mobile_country, u.mobile_code, u.mobile_number, 
                   cp.* FROM users u 
            LEFT JOIN client_profiles cp ON u.id = cp.client_user_id 
            WHERE u.id = %s
            """, 
            (client_id,)
        )
        personal_info = cursor.fetchone()

        # --- Other Info Sections ---
        cursor.execute("SELECT * FROM spouses WHERE client_user_id = %s", (client_id,))
        spouse_info = cursor.fetchone()

        cursor.execute("SELECT * FROM family_members WHERE client_user_id = %s", (client_id,))
        family_info = cursor.fetchall()
        
        cursor.execute("SELECT * FROM financials_income WHERE client_user_id = %s", (client_id,))
        income = cursor.fetchall()
        
        cursor.execute("SELECT * FROM financials_assets WHERE client_user_id = %s", (client_id,))
        assets = cursor.fetchall()

        cursor.execute("SELECT * FROM financials_liabilities WHERE client_user_id = %s", (client_id,))
        liabilities = cursor.fetchall()

        cursor.execute("SELECT id, document_name, file_path, uploaded_at FROM documents WHERE client_user_id = %s", (client_id,))
        documents = cursor.fetchall()

        cursor.execute("""
            SELECT ff.field_label as question, cqa.answer 
            FROM client_questionnaire_answers cqa
            JOIN form_fields ff ON cqa.form_field_id = ff.id
            WHERE cqa.client_user_id = %s
        """, (client_id,))
        investor_profile = cursor.fetchall()

        # --- FIX: Added query to fetch appointments ---
        cursor.execute("SELECT id, title, start_time, end_time, status FROM appointments WHERE client_user_id = %s ORDER BY start_time DESC", (client_id,))
        appointments = cursor.fetchall()

        # Convert datetime objects to ISO strings for JSON compatibility
        for appt in appointments:
            if appt.get('start_time'): appt['start_time'] = appt['start_time'].isoformat()
            if appt.get('end_time'): appt['end_time'] = appt['end_time'].isoformat()

        # 3. Assemble the final JSON response
        client_summary = {
            "personal_info": personal_info,
            "spouse_info": spouse_info,
            "family_info": family_info,
            "investor_profile": investor_profile,
            "financials": {
                "income": income,
                "assets": assets,
                "liabilities": liabilities
            },
            "documents": documents,
            "appointments": appointments # <-- Added appointments to the response
        }
        
        return jsonify(client_summary), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@advisor_bp.route('/clients', methods=['POST'])
@advisor_required
def add_new_client(current_user):
    """
    Creates a new client, assigns them, and emails them their temporary password.
    """
    advisor_id = current_user['user_id']
    data = request.get_json()

    if not data or not data.get('email') or not data.get('first_name') or not data.get('last_name'):
        return jsonify({"message": "Email, first name, and last name are required"}), 400

    email = data.get('email')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    
    # Generate a secure, random initial password for the client
    initial_password = str(uuid.uuid4())[:8]
    hashed_password = generate_password_hash(initial_password)

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # Step 1: Create the new user
        cursor.execute(
            "INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES (%s, %s, 'client', %s, %s)",
            (email, hashed_password, first_name, last_name)
        )
        client_user_id = cursor.lastrowid

        # Step 2: Create their client profile
        cursor.execute(
            "INSERT INTO client_profiles (client_user_id, onboarding_status) VALUES (%s, 'In-Progress')",
            (client_user_id,)
        )

        # Step 3: Assign the new client to the current advisor
        cursor.execute(
            "INSERT INTO advisor_client_map (advisor_user_id, client_user_id) VALUES (%s, %s)",
            (advisor_id, client_user_id)
        )

        # --- THIS IS THE NEW STEP ---
        # Step 4: Email the plain-text password to the client
        send_welcome_email_with_password(email, initial_password)

        conn.commit()
        
        # Fetch the newly created client's data to return to the frontend
        cursor.execute("SELECT id, email, first_name, last_name, is_active FROM users WHERE id = %s", (client_user_id,))
        new_client_user = cursor.fetchone()
        
        cursor.execute("SELECT tier, onboarding_status FROM client_profiles WHERE client_user_id = %s", (client_user_id,))
        new_client_profile = cursor.fetchone()

        new_client_full_data = {**new_client_user, **new_client_profile}

        return jsonify({
            "message": "Client added and welcome email sent.",
            "client": new_client_full_data
        }), 201

    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno == 1062:
            return jsonify({"message": "A user with this email already exists."}), 409
        return jsonify({"message": f"A database error occurred: {err}"}), 500
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An unexpected error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@advisor_bp.route('/clients/<int:client_id>', methods=['PUT'])
@advisor_required
def update_client_details(current_user, client_id):
    """Updates a client's tier, active status, or onboarding status."""
    advisor_id = current_user['user_id']
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Verify client belongs to advisor
        cursor.execute("SELECT client_user_id FROM advisor_client_map WHERE advisor_user_id = %s AND client_user_id = %s", (advisor_id, client_id))
        if not cursor.fetchone():
            return jsonify({"message": "Client not found or not assigned to this advisor"}), 404

        if 'tier' in data:
            cursor.execute("UPDATE client_profiles SET tier = %s WHERE client_user_id = %s", (data['tier'], client_id))
        
        if 'is_active' in data:
            cursor.execute("UPDATE users SET is_active = %s WHERE id = %s", (data['is_active'], client_id))

        # --- THIS IS THE FIX ---
        # Add this block to handle the onboarding status update
        if 'onboarding_status' in data:
            cursor.execute("UPDATE client_profiles SET onboarding_status = %s WHERE client_user_id = %s", (data['onboarding_status'], client_id))
        # --- END OF FIX ---

        conn.commit()
        return jsonify({"message": "Client updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()
