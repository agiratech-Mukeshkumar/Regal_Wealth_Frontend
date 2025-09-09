from flask import request, jsonify
from werkzeug.security import generate_password_hash
from utils.db import get_db_connection
from auth.decorators import admin_required
from .routes import admin_bp

@admin_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """
    Creates a new user. Accessible only by admins.
    """
    data = request.get_json()

    if not all(k in data for k in ['email', 'password', 'role', 'first_name', 'last_name']):
        return jsonify({"message": "Missing required fields"}), 400

    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    first_name = data.get('first_name')
    last_name = data.get('last_name')

    hashed_password = generate_password_hash(password)

    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"message": "User with this email already exists"}), 409

        
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
