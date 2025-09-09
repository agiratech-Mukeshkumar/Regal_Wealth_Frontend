from flask import jsonify
from auth.decorators import client_required
from utils.db import get_db_connection
from .routes import client_bp


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
        #  Personal & Profile Info 
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

        
        cursor.execute("SELECT * FROM financials_assets WHERE client_user_id = %s", (client_id,))
        assets = cursor.fetchall()

        cursor.execute("SELECT * FROM financials_liabilities WHERE client_user_id = %s", (client_id,))
        liabilities = cursor.fetchall()


        
        client_summary = {
            "personal_info": personal_info,
            "spouse_info": spouse_info,
            "family_info": family_info,
            "investor_profile": investor_profile,
            "income": income,
            "documents": documents,
            "assets": assets, 
            "liabilities": liabilities
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
