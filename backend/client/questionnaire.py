from flask import jsonify, request
from auth.decorators import client_required
from utils.db import get_db_connection
from .routes import client_bp



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
            conn.commit()
            return jsonify({"message": "No valid answers to update"}), 200

       
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