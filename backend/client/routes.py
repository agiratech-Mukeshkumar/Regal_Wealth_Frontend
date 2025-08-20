from flask import Blueprint, request, jsonify
from utils.db import get_db_connection
from auth.decorators import client_required
from werkzeug.security import check_password_hash, generate_password_hash


client_bp = Blueprint('client_bp', __name__)

@client_bp.route('/profile/personal', methods=['PUT'])
@client_required
def update_personal_info(current_user):
    """ 
    Allows a logged-in client to update their personal profile information.
    """
    client_id = current_user['user_id']
    data = request.get_json()

    # Fields to update in the client_profiles table
    fields = [
        'date_of_birth', 'marital_status', 'preferred_contact_method',
        'address_line_1', 'address_line_2', 'city', 'state', 'country',
        'zip_code', 'occupation', 'employer_name'
    ]
    
    # Construct the SQL query dynamically and safely
    update_parts = []
    values = []
    for field in fields:
        if field in data:
            update_parts.append(f"{field} = %s")
            values.append(data[field])

    if not update_parts:
        return jsonify({"message": "No valid fields provided for update"}), 400

    values.append(client_id)
    sql = f"UPDATE client_profiles SET {', '.join(update_parts)} WHERE client_user_id = %s"

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, tuple(values))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"message": "Client profile not found or no changes made"}), 404

        return jsonify({"message": "Personal information updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


# Add this new route to your client/routes.py file

@client_bp.route('/profile/spouse', methods=['PUT'])
@client_required
def update_spouse_info(current_user):
    """
    Creates or updates the spouse information for the logged-in client.
    This is an "upsert" operation.
    """
    client_id = current_user['user_id']
    data = request.get_json()

    # Fields to update in the spouses table
    fields = [
        'first_name', 'last_name', 'date_of_birth', 'email',
        'phone_number', 'occupation', 'employer_name'
    ]
    
    # Prepare lists for the SQL query
    columns = ['client_user_id']
    values = [client_id]
    update_assignments = []

    for field in fields:
        if field in data:
            columns.append(field)
            values.append(data[field])
            update_assignments.append(f"{field} = VALUES({field})")

    if len(columns) <= 1:
        return jsonify({"message": "No valid fields provided for update"}), 400

    # Construct the UPSERT SQL query
    column_str = ', '.join(columns)
    placeholders = ', '.join(['%s'] * len(columns))
    update_str = ', '.join(update_assignments)
    
    sql = f"""
        INSERT INTO spouses ({column_str}) 
        VALUES ({placeholders})
        ON DUPLICATE KEY UPDATE {update_str}
    """

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, tuple(values))
        conn.commit()
        return jsonify({"message": "Spouse information updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add this new route to your client/routes.py file

@client_bp.route('/profile/family', methods=['POST'])
@client_required
def update_family_info(current_user):
    """
    Replaces all family members for a client with the provided list.
    Expects a JSON body like: { "family_members": [{"relationship": "Child", "full_name": "...", ...}] }
    """
    client_id = current_user['user_id']
    data = request.get_json()
    family_members = data.get('family_members')

    if family_members is None or not isinstance(family_members, list):
        return jsonify({"message": "Request must include a 'family_members' list."}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor()
    try:
        # Start a transaction
        conn.start_transaction()

        # 1. Delete all existing family members for this client
        cursor.execute("DELETE FROM family_members WHERE client_user_id = %s", (client_id,))

        # 2. Insert all the new family members from the request
        if family_members: # Only insert if the list is not empty
            sql = """
                INSERT INTO family_members (client_user_id, relationship, full_name, date_of_birth, resident_state)
                VALUES (%s, %s, %s, %s, %s)
            """
            
            # Prepare a list of tuples for bulk insertion
            new_members_data = [
                (client_id, member.get('relationship'), member.get('full_name'), member.get('date_of_birth'), member.get('resident_state'))
                for member in family_members
            ]
            
            cursor.executemany(sql, new_members_data)

        # Commit the transaction
        conn.commit()
        return jsonify({"message": "Family information updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()
# Add this new route to your client/routes.py file

@client_bp.route('/forms/investor-profile', methods=['GET'])
@client_required
def get_investor_profile_form(current_user):
    """
    Fetches the dynamic form structure for the investor profile questionnaire.
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch all active fields for the 'investor_profile' form, ordered correctly
        sql = """
            SELECT id, field_label, field_type, options_json 
            FROM form_fields 
            WHERE form_name = 'investor_profile' AND is_active = TRUE 
            ORDER BY field_order
        """
        cursor.execute(sql)
        form_fields = cursor.fetchall()
        
        return jsonify(form_fields), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add this new route to your client/routes.py file

@client_bp.route('/profile/questionnaire', methods=['PUT'])
@client_required
def update_questionnaire_answers(current_user):
    """
    Saves or updates the client's answers to the questionnaire.
    Expects a JSON body like: { "answers": [{ "form_field_id": 1, "answer": "Yes" }] }  
    """
    client_id = current_user['user_id']
    data = request.get_json()
    answers = data.get('answers')

    if answers is None or not isinstance(answers, list):
        return jsonify({"message": "Request must include an 'answers' list."}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor()
    try:
        conn.start_transaction()

        # Prepare data for bulk upsert
        upsert_data = [
            (client_id, ans.get('form_field_id'), ans.get('answer'))
            for ans in answers if 'form_field_id' in ans and 'answer' in ans
        ]

        if not upsert_data:
            return jsonify({"message": "No valid answers provided"}), 400

        # Use ON DUPLICATE KEY UPDATE for an efficient upsert
        sql = """
            INSERT INTO client_questionnaire_answers (client_user_id, form_field_id, answer)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE answer = VALUES(answer)
        """
        cursor.executemany(sql, upsert_data)

        conn.commit()
        return jsonify({"message": "Investor profile updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add these three new routes to your client/routes.py file

@client_bp.route('/profile/income', methods=['POST'])
@client_required
def update_income(current_user):
    """Replaces all income sources for a client with the provided list."""
    client_id = current_user['user_id']
    data = request.get_json()
    income_sources = data.get('income_sources', [])

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conn.start_transaction()
        cursor.execute("DELETE FROM financials_income WHERE client_user_id = %s", (client_id,))
        if income_sources:
            sql = "INSERT INTO financials_income (client_user_id, source, owner, monthly_amount) VALUES (%s, %s, %s, %s)"
            values = [(client_id, item.get('source'), item.get('owner'), item.get('monthly_amount')) for item in income_sources]
            cursor.executemany(sql, values)
        conn.commit()
        return jsonify({"message": "Income updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@client_bp.route('/profile/assets', methods=['POST'])
@client_required
def update_assets(current_user):
    """Replaces all assets for a client with the provided list."""
    client_id = current_user['user_id']
    data = request.get_json()
    assets = data.get('assets', [])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conn.start_transaction()
        cursor.execute("DELETE FROM financials_assets WHERE client_user_id = %s", (client_id,))
        if assets:
            sql = "INSERT INTO financials_assets (client_user_id, asset_type, description, owner, balance) VALUES (%s, %s, %s, %s, %s)"
            values = [(client_id, item.get('asset_type'), item.get('description'), item.get('owner'), item.get('balance')) for item in assets]
            cursor.executemany(sql, values)
        conn.commit()
        return jsonify({"message": "Assets updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@client_bp.route('/profile/liabilities', methods=['POST'])
@client_required
def update_liabilities(current_user):
    """Replaces all liabilities for a client with the provided list."""
    client_id = current_user['user_id']
    data = request.get_json()
    liabilities = data.get('liabilities', [])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conn.start_transaction()
        cursor.execute("DELETE FROM financials_liabilities WHERE client_user_id = %s", (client_id,))
        if liabilities:
            sql = "INSERT INTO financials_liabilities (client_user_id, liability_type, description, balance) VALUES (%s, %s, %s, %s)"
            values = [(client_id, item.get('liability_type'), item.get('description'), item.get('balance')) for item in liabilities]
            cursor.executemany(sql, values)
        conn.commit()
        return jsonify({"message": "Liabilities updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add these imports at the top of client/routes.py
import os
from werkzeug.utils import secure_filename
from flask import current_app
import datetime
# ... (existing blueprint and routes) ...

# Add this new route to your client_bp Blueprint
@client_bp.route('/documents/upload', methods=['POST'])
@client_required
def upload_document(current_user):
    """
    Handles file uploads for a client.
    """
    client_id = current_user['user_id']
    
    if 'file' not in request.files:
        return jsonify({"message": "No file part in the request"}), 400
    
    file = request.files['file']
    document_name = request.form.get('document_name', file.filename)

    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    if file:
        # Sanitize the filename
        filename = secure_filename(file.filename)
        # Create a unique path to avoid overwriting files
        unique_filename = f"{client_id}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Save the file to the server
        file.save(file_path)

        # Save the record to the database
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            sql = "INSERT INTO documents (client_user_id, document_name, file_path) VALUES (%s, %s, %s)"
            cursor.execute(sql, (client_id, document_name, file_path))
            conn.commit()
            
            new_document_id = cursor.lastrowid
            
            return jsonify({
                "message": "File uploaded successfully",
                "document": {
                    "id": new_document_id,
                    "document_name": document_name,
                    "file_path": file_path 
                }
            }), 201

        except Exception as e:
            conn.rollback()
            # Clean up the saved file if DB insert fails
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({"message": f"Database error: {e}"}), 500
        finally:
            cursor.close()
            conn.close()

    return jsonify({"message": "File upload failed"}), 500

# Add these two new routes to your client/routes.py file

# Replace the existing get_own_profile function with this one

@client_bp.route('/profile', methods=['GET'])
@client_required
def get_own_profile(current_user):
    """
    Fetches all profile details for the currently logged-in client to build the summary page.
    """
    client_id = current_user['user_id']
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
        
    cursor = conn.cursor(dictionary=True)
    try:
        # --- Personal & Profile Info ---
        cursor.execute(
            "SELECT u.first_name, u.last_name, u.email, u.phone_number, cp.* FROM users u JOIN client_profiles cp ON u.id = cp.client_user_id WHERE u.id = %s", 
            (client_id,)
        )
        personal_info = cursor.fetchone()

        # --- Spouse Info ---
        cursor.execute("SELECT * FROM spouses WHERE client_user_id = %s", (client_id,))
        spouse_info = cursor.fetchone()

        # --- Family Members ---
        cursor.execute("SELECT * FROM family_members WHERE client_user_id = %s", (client_id,))
        family_info = cursor.fetchall()
        
        # --- Financials ---
        cursor.execute("SELECT * FROM financials_income WHERE client_user_id = %s", (client_id,))
        income = cursor.fetchall()
        
        # --- Questionnaire Answers ---
        cursor.execute("""
            SELECT ff.field_label as question, cqa.answer 
            FROM client_questionnaire_answers cqa
            JOIN form_fields ff ON cqa.form_field_id = ff.id
            WHERE cqa.client_user_id = %s
        """, (client_id,))
        investor_profile = cursor.fetchall()

        # Assemble the final JSON response
        client_summary = {
            "personal_info": personal_info,
            "spouse_info": spouse_info,
            "family_info": family_info,
            "investor_profile": investor_profile,
            "income": income
            # Add assets, liabilities, and documents as needed
        }
        
        return jsonify(client_summary), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@client_bp.route('/profile/submit', methods=['POST'])
@client_required
def submit_fact_finder(current_user):
    """
    Finalizes the Fact Finder submission.
    Updates the client's status and notifies the advisor.
    """
    client_id = current_user['user_id']
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # 1. Update the client's onboarding status to 'Completed'
        cursor.execute(
            "UPDATE client_profiles SET onboarding_status = 'Completed' WHERE client_user_id = %s",
            (client_id,)
        )

        # 2. Find the client's advisor
        cursor.execute("SELECT advisor_user_id FROM advisor_client_map WHERE client_user_id = %s", (client_id,))
        advisor_map = cursor.fetchone()
        
        if advisor_map:
            advisor_id = advisor_map['advisor_user_id']
            # 3. Create a notification for the advisor
            cursor.execute("SELECT first_name, last_name FROM users WHERE id = %s", (client_id,))
            client_user = cursor.fetchone()
            client_name = f"{client_user['first_name']} {client_user['last_name']}"
            
            message = f"Client {client_name} has completed their Fact Finder."
            link_url = f"/clients/{client_id}"
            
            cursor.execute(
                "INSERT INTO notifications (recipient_user_id, message, link_url) VALUES (%s, %s, %s)",
                (advisor_id, message, link_url)
            )

        conn.commit()
        return jsonify({"message": "Fact Finder submitted successfully! Your advisor has been notified."}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


# Add these imports at the top


@client_bp.route('/settings/security', methods=['PUT'])
@client_required
def update_security_settings(current_user):
    """
    Updates the client's password or 2FA setting.
    """
    client_id = current_user['user_id']
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # --- Handle Password Change ---
        if 'current_password' in data and 'new_password' in data:
            cursor.execute("SELECT password_hash FROM users WHERE id = %s", (client_id,))
            user = cursor.fetchone()
            
            if not user or not check_password_hash(user['password_hash'], data['current_password']):
                return jsonify({"message": "Current password is incorrect"}), 403
            
            new_hashed_password = generate_password_hash(data['new_password'])
            cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hashed_password, client_id))
        
        # --- Handle 2FA Toggle ---
        if 'is_2fa_enabled' in data:
            is_2fa_enabled = bool(data['is_2fa_enabled'])
            cursor.execute("UPDATE users SET is_2fa_enabled = %s WHERE id = %s", (is_2fa_enabled, client_id))

        conn.commit()
        return jsonify({"message": "Settings updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add this new route to your client/routes.py file

@client_bp.route('/documents', methods=['GET'])
@client_required
def get_documents(current_user):
    """Fetches a list of documents for the logged-in client."""
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Select only the necessary fields to send to the frontend
        cursor.execute(
            "SELECT id, document_name, file_path FROM documents WHERE client_user_id = %s ORDER BY uploaded_at DESC",
            (client_id,)
        )
        documents = cursor.fetchall()
        return jsonify(documents), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()