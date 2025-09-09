import os
from flask import current_app, jsonify, send_from_directory
from .routes import advisor_bp
from auth.decorators import  advisor_document_required
from utils.db import get_db_connection


@advisor_bp.route('/clients/<int:client_id>/documents/<int:document_id>', methods=['GET'])
@advisor_document_required
def get_client_document_file(current_user, client_id, document_id):
    """
    Serves a specific document file for viewing by an advisor.
    Verifies that the document belongs to a client managed by the advisor.
    """
    advisor_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
       
        cursor.execute(
            "SELECT 1 FROM advisor_client_map WHERE advisor_user_id = %s AND client_user_id = %s",
            (advisor_id, client_id)
        )
        if not cursor.fetchone():
            return jsonify({"message": "Access denied: You are not assigned to this client."}), 403

        
        cursor.execute(
            "SELECT file_path FROM documents WHERE id = %s AND client_user_id = %s",
            (document_id, client_id)
        )
        document = cursor.fetchone()

        if document and document['file_path']:
            upload_folder = current_app.config['UPLOAD_FOLDER']
            filename = os.path.basename(document['file_path'])
            return send_from_directory(upload_folder, filename, as_attachment=False)
        else:
            return jsonify({"message": "Document not found for this client."}), 404

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()
