from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from utils.db import get_db_connection

from auth.decorators import admin_required 

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """
    Creates a new user. Accessible only by admins.
    """
    data = request.get_json()
    # Basic validation
    if not all(k in data for k in ['email', 'password', 'role', 'first_name', 'last_name']):
        return jsonify({"message": "Missing required fields"}), 400

    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    first_name = data.get('first_name')
    last_name = data.get('last_name')

    # Hash the password before storing
    hashed_password = generate_password_hash(password)

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"message": "User with this email already exists"}), 409

        # Insert the new user into the database
        sql = """
            INSERT INTO users (email, password_hash, role, first_name, last_name) 
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (email, hashed_password, role, first_name, last_name))
        conn.commit()
        
        user_id = cursor.lastrowid
        
        return jsonify({
            "message": "User created successfully",
            "user": {
                "id": user_id,
                "email": email,
                "role": role
            }
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


# Add this route to your admin/routes.py file

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
        # First, remove any existing assignment for this client to ensure uniqueness
        cursor.execute("DELETE FROM advisor_client_map WHERE client_user_id = %s", (client_id,))

        # Create the new assignment
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


# Add these new routes to your admin/routes.py file

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    """Fetches a list of all users in the system."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, email, first_name, last_name, role, is_active FROM users ORDER BY created_at DESC")
        users = cursor.fetchall()
        return jsonify(users), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Updates a user's role or active status."""
    data = request.get_json()
    
    # For this MVP, we'll allow updating role and is_active status
    role = data.get('role')
    is_active = data.get('is_active')

    if role is None and is_active is None:
        return jsonify({"message": "No valid fields (role, is_active) provided for update"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if role is not None:
            cursor.execute("UPDATE users SET role = %s WHERE id = %s", (role, user_id))
        if is_active is not None:
            cursor.execute("UPDATE users SET is_active = %s WHERE id = %s", (is_active, user_id))
        
        conn.commit()
        return jsonify({"message": "User updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Deletes a user from the system."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"message": "User not found"}), 404
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


# Add this new route to your admin/routes.py file

@admin_bp.route('/forms/<form_name>', methods=['GET'])
@admin_required
def get_form_fields(form_name):
    """
    Fetches all fields for a specific dynamic form (e.g., 'investor-profile').
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
            SELECT id, field_label, field_type, options_json 
            FROM form_fields 
            WHERE form_name = %s AND is_active = TRUE 
            ORDER BY field_order
        """
        cursor.execute(sql, (form_name,))
        form_fields = cursor.fetchall()
        
        return jsonify(form_fields), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add these new routes to your admin/routes.py file

@admin_bp.route('/content/<page_slug>', methods=['GET'])
@admin_required
def get_content(page_slug):
    """Fetches the HTML content for a specific governance page."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT content_html FROM content_governance WHERE page_slug = %s", (page_slug,))
        content = cursor.fetchone()
        if content:
            return jsonify(content)
        else:
            # Return empty content if the page hasn't been created yet
            return jsonify({"content_html": ""})
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/content/<page_slug>', methods=['PUT'])
@admin_required
def update_content(current_user, page_slug):
    """Creates or updates the HTML content for a specific governance page."""
    data = request.get_json()
    content_html = data.get('content_html')
    admin_id = current_user['user_id']

    if content_html is None:
        return jsonify({"message": "content_html is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Use INSERT ... ON DUPLICATE KEY UPDATE for an "upsert"
        sql = """
            INSERT INTO content_governance (page_slug, content_html, last_updated_by)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE content_html = VALUES(content_html), last_updated_by = VALUES(last_updated_by)
        """
        cursor.execute(sql, (page_slug, content_html, admin_id))
        conn.commit()
        return jsonify({"message": "Content updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

# Add this new route to your admin/routes.py file

@admin_bp.route('/forms/<form_name>/fields', methods=['POST'])
@admin_required
def create_form_field(form_name):
    """
    Creates a new field for a specific dynamic form.
    """
    data = request.get_json()
    if not data or not data.get('field_label') or not data.get('field_type'):
        return jsonify({"message": "field_label and field_type are required"}), 400

    field_label = data.get('field_label')
    field_type = data.get('field_type')
    options_json = data.get('options_json') # Can be None

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor()
    try:
        sql = """
            INSERT INTO form_fields (form_name, field_label, field_type, options_json)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (form_name, field_label, field_type, options_json))
        conn.commit()
        
        return jsonify({"message": "Form field created successfully"}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

from flask import Blueprint, jsonify, request
from utils.db import get_db_connection
# Make sure to import these at the top of your file
from werkzeug.security import generate_password_hash
import uuid
from utils.email_sender import send_welcome_email_with_password
import mysql.connector



@admin_bp.route('/advisors', methods=['GET'])
@admin_required # <-- FIX: This decorator was missing. Add this line.
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

# Add this new route to your admin/routes.py file

@admin_bp.route('/clients', methods=['GET'])
@admin_required
def get_all_clients():
    """
    Fetches a list of all clients and the advisor they are assigned to.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # This SQL query joins the users table with itself through the mapping table
        # to get both client and advisor names in a single query.
        # COALESCE is used to handle clients who might not have an advisor assigned yet.
        sql = """
            SELECT 
                c.id, 
                c.first_name, 
                c.last_name, 
                c.email, 
                c.is_active,
                COALESCE(CONCAT(a.first_name, ' ', a.last_name), 'Not Assigned') as advisor_name
            FROM users c
            LEFT JOIN advisor_client_map acm ON c.id = acm.client_user_id
            LEFT JOIN users a ON acm.advisor_user_id = a.id
            WHERE c.role = 'client'
            ORDER BY c.created_at DESC
        """
        cursor.execute(sql)
        clients = cursor.fetchall()
        return jsonify(clients), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

