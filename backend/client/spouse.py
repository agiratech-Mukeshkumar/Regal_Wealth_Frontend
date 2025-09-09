from flask import jsonify, request
from auth.decorators import client_required
from utils.db import get_db_connection
from .routes import client_bp


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

        cursor.execute("SELECT id FROM spouses WHERE client_user_id = %s", (client_id,))
        spouse_exists = cursor.fetchone()

        if spouse_exists:
           
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
