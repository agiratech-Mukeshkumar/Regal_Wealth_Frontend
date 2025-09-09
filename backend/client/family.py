from flask import jsonify, request
from auth.decorators import client_required
from utils.db import get_db_connection
from .routes import client_bp


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
        
        cursor.execute("SELECT * FROM family_members WHERE client_user_id = %s", (client_id,))
        family_data = cursor.fetchall()

        for member in family_data:
            if member.get('date_of_birth'):
                member['date_of_birth'] = member['date_of_birth'].strftime('%Y-%m-%d')
        
        return jsonify(family_data), 200

    except Exception as e:
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
