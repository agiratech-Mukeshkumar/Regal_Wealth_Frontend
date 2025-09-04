from flask import Blueprint, request, jsonify, send_from_directory
from utils.db import get_db_connection
from auth.decorators import client_required, document_token_required
from werkzeug.security import check_password_hash, generate_password_hash
import os
from werkzeug.utils import secure_filename
from flask import current_app
import datetime


client_bp = Blueprint('client_bp', __name__)

@client_bp.route('/profile/personal', methods=['GET'])
@client_required
def get_personal_profile(current_user):
    """
    Fetches the client's saved personal and user information.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Join users and client_profiles to get all data in one go
        sql = """
            SELECT 
                u.mobile_country, u.mobile_code, u.mobile_number,
                cp.*
            FROM users u
            LEFT JOIN client_profiles cp ON u.id = cp.client_user_id
            WHERE u.id = %s
        """
        cursor.execute(sql, (client_id,))
        profile_data = cursor.fetchone()

        if profile_data:
            if profile_data.get('date_of_birth'):
                profile_data['date_of_birth'] = profile_data['date_of_birth'].strftime('%Y-%m-%d')
            return jsonify(profile_data), 200
        else:
            return jsonify({"message": "No profile information found."}), 404

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@client_bp.route('/profile/personal', methods=['PUT'])
@client_required
def update_personal_info(current_user):
    """ 
    Allows a client to create/update their profile and user mobile info.
    """
    client_id = current_user['user_id']
    data = request.get_json()

    # --- FIX: Separated fields for each table ---
    profile_fields = [
        'date_of_birth', 'marital_status', 'preferred_contact_method',
        'address_line_1', 'address_line_2', 'city', 'state', 'country',
        'zip_code', 'occupation', 'employer_name'
    ]
    user_fields = ['mobile_country', 'mobile_code', 'mobile_number']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conn.start_transaction()

        # --- Step 1: Update the users table with mobile info ---
        user_update_parts = []
        user_values = []
        for field in user_fields:
            if field in data:
                user_update_parts.append(f"{field} = %s")
                user_values.append(data.get(field))
        
        if user_update_parts:
            user_values.append(client_id)
            user_sql = f"UPDATE users SET {', '.join(user_update_parts)} WHERE id = %s"
            cursor.execute(user_sql, tuple(user_values))

        # --- Step 2: Upsert the client_profiles table ---
        cursor.execute("SELECT id FROM client_profiles WHERE client_user_id = %s", (client_id,))
        profile_exists = cursor.fetchone()

        if profile_exists:
            # UPDATE logic for client_profiles
            profile_update_parts = []
            profile_values = []
            for field in profile_fields:
                if field in data:
                    profile_update_parts.append(f"{field} = %s")
                    profile_values.append(data.get(field))
            
            if profile_update_parts:
                profile_values.append(client_id)
                profile_sql = f"UPDATE client_profiles SET {', '.join(profile_update_parts)} WHERE client_user_id = %s"
                cursor.execute(profile_sql, tuple(profile_values))

        else:
            # INSERT logic for client_profiles
            columns = ['client_user_id']
            values = [client_id]
            for field in profile_fields:
                if field in data and data[field]:
                    columns.append(field)
                    values.append(data[field])

            if len(columns) > 1:
                placeholders = ', '.join(['%s'] * len(columns))
                profile_sql = f"INSERT INTO client_profiles ({', '.join(columns)}) VALUES ({placeholders})"
                cursor.execute(profile_sql, tuple(values))

        conn.commit()
        return jsonify({"message": "Personal information updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()    


@client_bp.route('/profile/spouse', methods=['GET'])
@client_required
def get_spouse_profile(current_user):
    """
    Fetches the client's saved spouse profile information.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM spouses WHERE client_user_id = %s", (client_id,))
        spouse_data = cursor.fetchone()

        if spouse_data:
            if spouse_data.get('date_of_birth'):
                spouse_data['date_of_birth'] = spouse_data['date_of_birth'].strftime('%Y-%m-%d')
            return jsonify(spouse_data), 200
        else:
            return jsonify({"message": "No spouse information found."}), 404

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()
@client_bp.route('/profile/spouse', methods=['PUT'])
@client_required
def update_spouse_info(current_user):
    """
    Creates or updates the spouse information for the logged-in client.
    Explicit INSERT/UPDATE logic, modeled after update_personal_info.
    """
    client_id = current_user['user_id']
    data = request.get_json()

    spouse_fields = [
        'first_name', 'last_name', 'date_of_birth', 'email',
        'occupation', 'employer_name',
        'mobile_country', 'mobile_code', 'mobile_number'
    ]

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conn.start_transaction()

        # --- Step 1: Check if spouse already exists for this client ---
        cursor.execute("SELECT id FROM spouses WHERE client_user_id = %s", (client_id,))
        spouse_exists = cursor.fetchone()

        if spouse_exists:
            # --- Step 2a: UPDATE spouse record ---
            update_parts = []
            values = []
            for field in spouse_fields:
                if field in data:
                    update_parts.append(f"{field} = %s")
                    values.append(data.get(field))

            if update_parts:
                values.append(client_id)
                sql = f"UPDATE spouses SET {', '.join(update_parts)} WHERE client_user_id = %s"
                cursor.execute(sql, tuple(values))

        else:
            # --- Step 2b: INSERT new spouse record ---
            columns = ['client_user_id']
            values = [client_id]
            for field in spouse_fields:
                if field in data and data[field]:
                    columns.append(field)
                    values.append(data[field])

            if len(columns) > 1:
                placeholders = ', '.join(['%s'] * len(columns))
                sql = f"INSERT INTO spouses ({', '.join(columns)}) VALUES ({placeholders})"
                cursor.execute(sql, tuple(values))

        conn.commit()
        return jsonify({"message": "Spouse information updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()



@client_bp.route('/profile/family', methods=['POST'])
@client_required
def update_family_info(current_user):
    """
    Replaces all family members for a client with the provided list.
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
        conn.start_transaction()
        cursor.execute("DELETE FROM family_members WHERE client_user_id = %s", (client_id,))

        if family_members:
            sql = """
                INSERT INTO family_members (client_user_id, relationship, full_name, date_of_birth, resident_state)
                VALUES (%s, %s, %s, %s, %s)
            """
            new_members_data = [
                (client_id, member.get('relationship'), member.get('full_name'), member.get('date_of_birth'), member.get('resident_state'))
                for member in family_members
            ]
            cursor.executemany(sql, new_members_data)

        conn.commit()
        return jsonify({"message": "Family information updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


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


@client_bp.route('/profile/questionnaire', methods=['PUT'])
@client_required
def update_questionnaire_answers(current_user):
    """
    Saves or updates the client's answers to the questionnaire.
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
        upsert_data = [
            (client_id, ans.get('form_field_id'), ans.get('answer'))
            for ans in answers if 'form_field_id' in ans and 'answer' in ans
        ]

        if not upsert_data:
            return jsonify({"message": "No valid answers provided"}), 400

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
        filename = secure_filename(file.filename)
        unique_filename = f"{client_id}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        
        file.save(file_path)

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
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({"message": f"Database error: {e}"}), 500
        finally:
            cursor.close()
            conn.close()

    return jsonify({"message": "File upload failed"}), 500


# ... (other routes) ...

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
            """
            SELECT 
                u.first_name, u.last_name, u.email, 
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
        
        cursor.execute("""
            SELECT ff.field_label as question, cqa.answer 
            FROM client_questionnaire_answers cqa
            JOIN form_fields ff ON cqa.form_field_id = ff.id
            WHERE cqa.client_user_id = %s
        """, (client_id,))
        investor_profile = cursor.fetchall()

        cursor.execute("SELECT id, document_name FROM documents WHERE client_user_id = %s", (client_id,))
        documents = cursor.fetchall()

        # --- FIX: Added queries to fetch assets and liabilities ---
        cursor.execute("SELECT * FROM financials_assets WHERE client_user_id = %s", (client_id,))
        assets = cursor.fetchall()

        cursor.execute("SELECT * FROM financials_liabilities WHERE client_user_id = %s", (client_id,))
        liabilities = cursor.fetchall()


        # Assemble the final JSON response
        client_summary = {
            "personal_info": personal_info,
            "spouse_info": spouse_info,
            "family_info": family_info,
            "investor_profile": investor_profile,
            "income": income,
            "documents": documents,
            "assets": assets, # <-- Added assets to the response
            "liabilities": liabilities # <-- Added liabilities to the response
        }
        
        return jsonify(client_summary), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()# ... (other routes) ...

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

        cursor.execute(
            "UPDATE client_profiles SET onboarding_status = 'Pending' WHERE client_user_id = %s",
            (client_id,)
        )

        cursor.execute("SELECT advisor_user_id FROM advisor_client_map WHERE client_user_id = %s", (client_id,))
        advisor_map = cursor.fetchone()
        
        if advisor_map:
            advisor_id = advisor_map['advisor_user_id']
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
        if 'current_password' in data and 'new_password' in data:
            cursor.execute("SELECT password_hash FROM users WHERE id = %s", (client_id,))
            user = cursor.fetchone()
            
            if not user or not check_password_hash(user['password_hash'], data['current_password']):
                return jsonify({"message": "Current password is incorrect"}), 403
            
            new_hashed_password = generate_password_hash(data['new_password'])
            cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hashed_password, client_id))
        
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


@client_bp.route('/documents', methods=['GET'])
@client_required
def get_documents(current_user):
    """Fetches a list of documents for the logged-in client."""
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
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

# Add this new route to your client/routes.py file

@client_bp.route('/profile/family', methods=['GET'])
@client_required
def get_family_info(current_user):
    """
    Fetches the client's saved list of family members.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch all family members associated with the client
        cursor.execute("SELECT * FROM family_members WHERE client_user_id = %s", (client_id,))
        family_data = cursor.fetchall()

        # Format date to YYYY-MM-DD for each member
        for member in family_data:
            if member.get('date_of_birth'):
                member['date_of_birth'] = member['date_of_birth'].strftime('%Y-%m-%d')
        
        return jsonify(family_data), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add this new route to your client/routes.py file

@client_bp.route('/profile/questionnaire', methods=['GET'])
@client_required
def get_questionnaire_answers(current_user):
    """
    Fetches the client's saved answers for the investor profile questionnaire.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch all answers for the given client
        sql = """
            SELECT form_field_id, answer 
            FROM client_questionnaire_answers 
            WHERE client_user_id = %s
        """
        cursor.execute(sql, (client_id,))
        answers = cursor.fetchall()
        
        return jsonify(answers), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


# Add this new route to your client/routes.py file

@client_bp.route('/profile/income', methods=['GET'])
@client_required
def get_income_info(current_user):
    """
    Fetches the client's saved list of income sources.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch all income sources associated with the client
        cursor.execute("SELECT * FROM financials_income WHERE client_user_id = %s", (client_id,))
        income_data = cursor.fetchall()
        
        return jsonify(income_data), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add this new route to your client/routes.py file

@client_bp.route('/profile/assets', methods=['GET'])
@client_required
def get_assets_info(current_user):
    """
    Fetches the client's saved list of financial assets.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch all assets associated with the client
        cursor.execute("SELECT * FROM financials_assets WHERE client_user_id = %s", (client_id,))
        assets_data = cursor.fetchall()
        
        return jsonify(assets_data), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@client_bp.route('/documents/<int:document_id>', methods=['GET'])
@document_token_required
def get_document_file(current_user, document_id):
    """
    Serves a specific document file for viewing.
    Verifies that the document belongs to the logged-in client.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Verify the client owns this document before serving it
        cursor.execute(
            "SELECT file_path FROM documents WHERE id = %s AND client_user_id = %s",
            (document_id, client_id)
        )
        document = cursor.fetchone()

        if document and document['file_path']:
            # UPLOAD_FOLDER should be an absolute path in your config
            upload_folder = current_app.config['UPLOAD_FOLDER']
            # Extract just the filename from the full path stored in the DB
            filename = os.path.basename(document['file_path'])
            
            # Send the file to be displayed inline in the browser
            return send_from_directory(upload_folder, filename, as_attachment=False)
        else:
            return jsonify({"message": "Document not found or access denied"}), 404

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@client_bp.route('/forms/liabilities', methods=['GET'])
@client_required
def get_liabilities_form(current_user):
    """
    Fetches the dynamic form structure for the liabilities questionnaire.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
            SELECT id, field_label, field_type 
            FROM form_fields 
            WHERE form_name = 'liabilities' AND is_active = TRUE 
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

@client_bp.route('/profile/liabilities', methods=['GET'])
@client_required
def get_liabilities_info(current_user):
    """
    Fetches the client's saved list of liabilities.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM financials_liabilities WHERE client_user_id = %s", (client_id,))
        liabilities_data = cursor.fetchall()
        return jsonify(liabilities_data), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


