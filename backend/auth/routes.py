import jwt
from werkzeug.security import check_password_hash
import datetime
import random
from flask import Blueprint, request, jsonify
from utils.db import get_db_connection
from utils.email_sender import send_2fa_code_email # Import the email utility
from config import Config

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({"message": "Invalid credentials"}), 401
        
        if not user.get('is_active', True):
            return jsonify({"message": "Account is deactivated"}), 403

        # --- THIS IS THE FIX ---
        # Always build the complete user object to send to the frontend
        user_payload_for_frontend = {
            "id": user['id'],
            "email": user['email'],
            "role": user['role'],
            "first_name": user['first_name'],
            "last_name": user['last_name'],
            "is_2fa_enabled": bool(user.get('is_2fa_enabled', False)), # Safely get the value
            "mobile_number":user['mobile_number']
        }

        if user.get('is_2fa_enabled'):
            code = str(random.randint(100000, 999999))
            expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
            cursor.execute(
                "INSERT INTO two_factor_codes (user_id, code, expires_at) VALUES (%s, %s, %s)",
                (user['id'], code, expires_at)
            )
            conn.commit()
            send_2fa_code_email(user['email'], code)
            
            temp_token = jwt.encode({
                'user_id': user['id'], 'type': '2fa_pending',
                'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
            }, Config.JWT_SECRET_KEY, algorithm='HS256')

            return jsonify({
                "message": "2FA required", "requires_2fa": True,
                "temp_token": temp_token, "email": user['email']
            }), 200
        else:
            final_token = jwt.encode({
                'user_id': user['id'], 'role': user['role'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, Config.JWT_SECRET_KEY, algorithm='HS256')
            
            return jsonify({
                "message": "Login successful", "requires_2fa": False,
                "token": final_token, "user": user_payload_for_frontend
            })
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@auth_bp.route('/verify-2fa', methods=['POST'])
def verify_2fa():
    data = request.get_json()
    temp_token = data.get('temp_token')
    code = data.get('code')

    if not temp_token or not code:
        return jsonify({"message": "Temporary token and code are required"}), 400

    try:
        payload = jwt.decode(temp_token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        if payload.get('type') != '2fa_pending':
            return jsonify({"message": "Invalid token type"}), 401
        user_id = payload['user_id']
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return jsonify({"message": "Token is invalid or has expired"}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        now = datetime.datetime.utcnow()
        cursor.execute(
            "SELECT code FROM two_factor_codes WHERE user_id = %s AND expires_at > %s ORDER BY created_at DESC LIMIT 1",
            (user_id, now)
        )
        db_code_record = cursor.fetchone()

        if not db_code_record or db_code_record['code'] != code:
            return jsonify({"message": "Invalid verification code"}), 401

        # --- THIS IS THE FIX ---
        # Fetch all necessary fields to build the complete user object
        cursor.execute("SELECT id, email, role, first_name, last_name, is_2fa_enabled , mobile_number FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        final_token = jwt.encode({
            'user_id': user['id'], 'role': user['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, Config.JWT_SECRET_KEY, algorithm='HS256')
        
        user_payload_for_frontend = {
            "id": user['id'], "email": user['email'], "role": user['role'],
            "first_name": user['first_name'],"last_name": user["last_name"],
            "is_2fa_enabled": bool(user.get('is_2fa_enabled', False)),
            "mobile_number":user['mobile_number']
        }

        cursor.execute("DELETE FROM two_factor_codes WHERE user_id = %s", (user_id,)); conn.commit()

        return jsonify({
            "message": "Login successful", "token": final_token,
            "user": user_payload_for_frontend
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()



# Add this new route to your auth/routes.py file

@auth_bp.route('/resend-2fa', methods=['POST'])
def resend_2fa():
    """
    Resends a new 2FA code to the user.
    Requires a valid '2fa_pending' temporary token.
    """
    data = request.get_json()
    temp_token = data.get('temp_token')

    if not temp_token:
        return jsonify({"message": "Temporary token is required"}), 400

    try:
        # 1. Decode the temporary token to identify the user
        payload = jwt.decode(temp_token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        if payload.get('type') != '2fa_pending':
            return jsonify({"message": "Invalid token type"}), 401
        user_id = payload['user_id']
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return jsonify({"message": "Temporary token is invalid or has expired"}), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        conn.start_transaction()
        
        # 2. Invalidate all old codes for this user
        cursor.execute("DELETE FROM two_factor_codes WHERE user_id = %s", (user_id,))
        
        # 3. Generate a new 6-digit code
        new_code = str(random.randint(100000, 999999))
        
        # 4. Store the new code in the database with a fresh 10-minute expiration
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        cursor.execute(
            "INSERT INTO two_factor_codes (user_id, code, expires_at) VALUES (%s, %s, %s)",
            (user_id, new_code, expires_at)
        )

        # 5. Fetch the user's email
        cursor.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()

        if not user:
            conn.rollback()
            return jsonify({"message": "User not found"}), 404
        
        # 6. Send the new code via email
        send_2fa_code_email(user['email'], new_code)
        
        conn.commit()

        return jsonify({"message": "A new verification code has been sent."}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()
