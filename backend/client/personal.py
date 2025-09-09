from flask import jsonify, request
from auth.decorators import client_required
from utils.db import get_db_connection
from .routes import client_bp


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

      
        cursor.execute("SELECT id FROM client_profiles WHERE client_user_id = %s", (client_id,))
        profile_exists = cursor.fetchone()

        if profile_exists:
            
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
