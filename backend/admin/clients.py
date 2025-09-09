from flask import jsonify
from utils.db import get_db_connection
from auth.decorators import admin_required
from .routes import admin_bp

@admin_bp.route('/clients', methods=['GET'])
@admin_required
def get_all_clients():
    """
    Fetches a list of all clients and the advisor they are assigned to.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        
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

