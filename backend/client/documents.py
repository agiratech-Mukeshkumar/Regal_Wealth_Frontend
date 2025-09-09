import datetime
import os
from flask import current_app, jsonify, request, send_from_directory
from auth.decorators import client_required, document_token_required
from utils.db import get_db_connection
from .routes import client_bp
from werkzeug.utils import secure_filename


@client_bp.route('/documents', methods=['GET'])
@client_required
def get_documents(current_user):
    """Fetches a list of documents for the logged-in client."""
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, document_name, file_path FROM documents WHERE client_user_id = %s ORDER BY uploaded_at DESC",
            (client_id,)
        )
        documents = cursor.fetchall()
        return jsonify(documents), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@client_bp.route('/documents/<int:document_id>', methods=['GET'])
@document_token_required
def get_document_file(current_user, document_id):
    """
    Serves a specific document file for viewing.
    Verifies that the document belongs to the logged-in client.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
       
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
            return jsonify({"message": "Document not found or access denied"}), 404

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@client_bp.route('/documents/upload', methods=['POST'])
@client_required
def upload_document(current_user):
    """
    Handles file uploads for a client.
    """
    client_id = current_user['user_id']
    
    if 'file' not in request.files:
        return jsonify({"message": "No file part in the request"}), 400
    
    file = request.files['file']
    document_name = request.form.get('document_name', file.filename)

    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400

    if file:
        filename = secure_filename(file.filename)
        unique_filename = f"{client_id}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        
        file.save(file_path)

        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            sql = "INSERT INTO documents (client_user_id, document_name, file_path) VALUES (%s, %s, %s)"
            cursor.execute(sql, (client_id, document_name, file_path))
            conn.commit()
            
            new_document_id = cursor.lastrowid
            
            return jsonify({
                "message": "File uploaded successfully",
                "document": {
                    "id": new_document_id,
                    "document_name": document_name,
                    "file_path": file_path 
                }
            }), 201

        except Exception as e:
            conn.rollback()
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({"message": f"Database error: {e}"}), 500
        finally:
            cursor.close()
            conn.close()

    return jsonify({"message": "File upload failed"}), 500

@client_bp.route('/documents/<int:document_id>', methods=['DELETE'])
@client_required
def delete_document(current_user, document_id):
    """
    Deletes a specific document for the logged-in client.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Database connection error"}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

     
        cursor.execute(
            "SELECT file_path FROM documents WHERE id = %s AND client_user_id = %s",
            (document_id, client_id)
        )
        document = cursor.fetchone()

        if not document:
            conn.rollback()
            return jsonify({"message": "Document not found or you do not have permission to delete it."}), 404

       
        cursor.execute("DELETE FROM documents WHERE id = %s", (document_id,))

        
        file_path = document.get('file_path')
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

        conn.commit()
        return jsonify({"message": "Document deleted successfully."}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()