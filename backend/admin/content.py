from flask import request, jsonify
from utils.db import get_db_connection
from auth.decorators import admin_required
from .routes import admin_bp

@admin_bp.route('/content/<page_slug>', methods=['GET'])
@admin_required
def get_content_page(page_slug):
    """Fetches the HTML content for a specific governance page."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT content_html FROM content_governance WHERE page_slug = %s", (page_slug,))
        result = cursor.fetchone()
        if result:
            return jsonify(result), 200
        return jsonify({"content_html": ""}), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/content/<page_slug>', methods=['PUT'])
@admin_required
def update_content_page(current_user, page_slug):
    """Saves or updates the HTML content for a specific governance page."""
    data = request.get_json()
    content_html = data.get('content_html')
    admin_user_id = current_user['user_id']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        
        sql = """
            INSERT INTO content_governance (page_slug, content_html, last_updated_by)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE content_html = VALUES(content_html), last_updated_by = VALUES(last_updated_by)
        """
        cursor.execute(sql, (page_slug, content_html, admin_user_id))
        conn.commit()
        return jsonify({"message": "Content updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()