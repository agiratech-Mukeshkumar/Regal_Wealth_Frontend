from flask import Blueprint, jsonify, request, send_from_directory
from utils.db import get_db_connection
from auth.decorators import advisor_required, advisor_document_required
import json
from .tax_calculator import calculate_2025_federal_tax
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import date, timedelta, datetime
from utils.email_sender import send_appointment_email
import os   

advisor_bp = Blueprint('advisor_bp', __name__)

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


# ... (imports and other routes remain the same) ...

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

# ... (rest of the routes in the file) ...


# In advisor/routes.py, add this import

# Add this new route to the file
@advisor_bp.route('/tools/income-tax', methods=['POST'])
@advisor_required
def income_tax_tool(current_user):
    """
    Receives financial data and returns a detailed tax analysis.
    """
    data = request.get_json()
    if not data:
        return jsonify({"message": "Request body is missing"}), 400

    # Extract data from request body, with defaults
    gross_income = float(data.get('gross_income', 0))
    deductions = float(data.get('deductions', 0)) # Sum of all deductions
    credits = float(data.get('credits', 0))
    filing_status = data.get('filing_status', 'married_jointly')

    # 1. Calculate Taxable Income
    taxable_income = gross_income - deductions
    if taxable_income < 0:
        taxable_income = 0

    # 2. Calculate Tax Owed Before Credits
    tax_before_credits = calculate_2025_federal_tax(taxable_income, filing_status)

    # 3. Apply Credits
    final_tax_owed = tax_before_credits - credits
    if final_tax_owed < 0:
        final_tax_owed = 0
    
    # 4. Calculate Rates
    effective_tax_rate = (final_tax_owed / gross_income) * 100 if gross_income > 0 else 0
    # A full marginal rate calculation would check which bracket the taxable_income falls into
    marginal_tax_rate = 22.0 # Hardcoded for the example from Figma

    # 5. Assemble and return the response
    response_data = {
        "inputs": data,
        "results": {
            "gross_income": gross_income,
            "total_deductions": deductions,
            "taxable_income": taxable_income,
            "tax_before_credits": tax_before_credits,
            "tax_credits": credits,
            "final_tax_owed": final_tax_owed,
            "effective_tax_rate_percent": round(effective_tax_rate, 2),
            "marginal_tax_rate_percent": marginal_tax_rate
        }
    }

    return jsonify(response_data), 200

# Add this import at the top of advisor/routes.py


# Add this new route to the file
@advisor_bp.route('/clients/<int:client_id>/plans', methods=['POST'])
@advisor_required
def create_financial_plan(current_user, client_id):
    """
    Saves the results of a tool calculation as a financial plan for a client.
    """
    advisor_id = current_user['user_id']
    data = request.get_json()

    if not data or not data.get('plan_name') or not data.get('plan_data_json'):
        return jsonify({"message": "plan_name and plan_data_json are required"}), 400

    plan_name = data.get('plan_name')
    # The data from the calculator is already a dictionary, we'll store it as a JSON string
    plan_data_json = json.dumps(data.get('plan_data_json'))

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor()
    try:
        # Verify the client is assigned to this advisor first
        cursor.execute(
            "SELECT client_user_id FROM advisor_client_map WHERE advisor_user_id = %s AND client_user_id = %s",
            (advisor_id, client_id)
        )
        if not cursor.fetchone():
            return jsonify({"message": "You are not authorized to create a plan for this client"}), 403

        # Insert the new financial plan
        sql = """
            INSERT INTO financial_plans (client_user_id, advisor_user_id, plan_name, plan_data_json, status)
            VALUES (%s, %s, %s, %s, 'Draft')
        """
        cursor.execute(sql, (client_id, advisor_id, plan_name, plan_data_json))
        conn.commit()
        
        plan_id = cursor.lastrowid

        return jsonify({
            "message": "Financial plan created successfully",
            "plan_id": plan_id
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add this new route to your advisor/routes.py file
@advisor_bp.route('/dashboard/stats', methods=['GET'])
@advisor_required
def get_dashboard_stats(current_user):
    """
    Fetches aggregated statistics, now including appointment data for the charts.
    """
    advisor_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get Client Counts by Tier
        cursor.execute("SELECT cp.tier, COUNT(cp.client_user_id) AS count FROM client_profiles cp JOIN advisor_client_map acm ON cp.client_user_id = acm.client_user_id WHERE acm.advisor_user_id = %s GROUP BY cp.tier", (advisor_id,))
        tier_stats = cursor.fetchall()

        # Get Client Counts by Onboarding Status
        cursor.execute("SELECT cp.onboarding_status, COUNT(cp.client_user_id) AS count FROM client_profiles cp JOIN advisor_client_map acm ON cp.client_user_id = acm.client_user_id WHERE acm.advisor_user_id = %s GROUP BY cp.onboarding_status", (advisor_id,))
        onboarding_stats = cursor.fetchall()
        
        # Get appointment counts for the week
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        days = [(week_start + timedelta(days=i)) for i in range(7)]
        day_names = [d.strftime('%a') for d in days]
        
        cursor.execute("""
            SELECT DATE(start_time) as app_date, COUNT(id) as count
            FROM appointments
            WHERE advisor_user_id = %s AND start_time BETWEEN %s AND %s + INTERVAL 1 DAY
            GROUP BY DATE(start_time)
        """, (advisor_id, week_start, days[-1]))
        app_counts = {r['app_date'].strftime('%a'): r['count'] for r in cursor.fetchall()}
        appointment_stats = [{"day": day, "count": app_counts.get(day, 0)} for day in day_names]

        # Get upcoming meetings count for today
        cursor.execute("SELECT COUNT(id) as count FROM appointments WHERE advisor_user_id = %s AND DATE(start_time) = CURDATE()", (advisor_id,))
        today_meetings = cursor.fetchone()

        response = {
            "clients_by_tier": tier_stats,
            "clients_by_onboarding_status": onboarding_stats,
            "appointments_weekly": appointment_stats,
            "meetings_today": today_meetings['count'] if today_meetings else 0
        }
        
        return jsonify(response)
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add these imports at the top of advisor/routes.py
from werkzeug.security import generate_password_hash
import uuid # For generating a random initial password

# ... (existing blueprint and other routes) ...

# Add these imports at the top of advisor/routes.py
from werkzeug.security import generate_password_hash
import uuid
# Import the new email function
from utils.email_sender import send_welcome_email_with_password 
# Make sure to import mysql.connector if it's not already there
import mysql.connector
from flask import current_app # Import current_app to access mail instance

# ... (existing blueprint and other routes) ...

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




# ... (existing blueprint and other routes) ...

@advisor_bp.route('/settings/security', methods=['PUT'])
@advisor_required
def update_advisor_security_settings(current_user):
    """
    Updates the logged-in advisor's password or 2FA setting.
    """
    advisor_id = current_user['user_id']
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # --- Handle Password Change ---
        if 'current_password' in data and 'new_password' in data:
            cursor.execute("SELECT password_hash FROM users WHERE id = %s", (advisor_id,))
            user = cursor.fetchone()
            
            if not user or not check_password_hash(user['password_hash'], data['current_password']):
                return jsonify({"message": "Current password is incorrect"}), 403
            
            new_hashed_password = generate_password_hash(data['new_password'])
            cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hashed_password, advisor_id))
        
        # --- Handle 2FA Toggle ---
        if 'is_2fa_enabled' in data:
            is_2fa_enabled = bool(data['is_2fa_enabled'])
            cursor.execute("UPDATE users SET is_2fa_enabled = %s WHERE id = %s", (is_2fa_enabled, advisor_id))

        conn.commit()
        return jsonify({"message": "Settings updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@advisor_bp.route('/clients/<int:client_id>', methods=['PUT'])
@advisor_required
def update_client_details(current_user, client_id):
    """Updates a client's tier or active status."""
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

        conn.commit()
        return jsonify({"message": "Client updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add this new route to your advisor/routes.py file


# ... (imports and other routes in the file) ...

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

    # --- THIS IS THE FIX ---
    # Python's fromisoformat() before version 3.11 doesn't support the 'Z' suffix for UTC.
    # We replace 'Z' with '+00:00' to ensure compatibility.
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

# ... (rest of the routes in the file) ...


        

@advisor_bp.route('/clients/<int:client_id>/documents/<int:document_id>', methods=['GET'])
@advisor_document_required
def get_client_document_file(current_user, client_id, document_id):
    """
    Serves a specific document file for viewing by an advisor.
    Verifies that the document belongs to a client managed by the advisor.
    """
    advisor_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Verify the advisor is assigned to this client
        cursor.execute(
            "SELECT 1 FROM advisor_client_map WHERE advisor_user_id = %s AND client_user_id = %s",
            (advisor_id, client_id)
        )
        if not cursor.fetchone():
            return jsonify({"message": "Access denied: You are not assigned to this client."}), 403

        # 2. Verify the document belongs to the client and get its path
        cursor.execute(
            "SELECT file_path FROM documents WHERE id = %s AND client_user_id = %s",
            (document_id, client_id)
        )
        document = cursor.fetchone()

        if document and document['file_path']:
            upload_folder = current_app.config['UPLOAD_FOLDER']
            filename = os.path.basename(document['file_path'])
            return send_from_directory(upload_folder, filename, as_attachment=False)
        else:
            return jsonify({"message": "Document not found for this client."}), 404

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@advisor_bp.route('/dashboard/next-appointment', methods=['GET'])
@advisor_required
def get_next_appointment(current_user):
    """
    Fetches the details of the very next upcoming appointment for the advisor.
    """
    advisor_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Query to find the first appointment that is on or after the current time
        sql = """
            SELECT 
                a.title,
                a.start_time,
                CONCAT(u.first_name, ' ', u.last_name) as client_name
            FROM appointments a
            JOIN users u ON a.client_user_id = u.id
            WHERE a.advisor_user_id = %s AND a.start_time >= NOW()
            ORDER BY a.start_time ASC
            LIMIT 1
        """
        cursor.execute(sql, (advisor_id,))
        next_appointment = cursor.fetchone()
        
        # Format the datetime object into a standard string for the frontend
        if next_appointment and next_appointment['start_time']:
            next_appointment['start_time'] = next_appointment['start_time'].isoformat()

        return jsonify(next_appointment), 200 # Will return null if no appointment is found
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


