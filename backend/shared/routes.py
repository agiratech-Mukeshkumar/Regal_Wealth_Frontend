# shared/routes.py
from flask import Blueprint, jsonify
from utils.db import get_db_connection
from auth.decorators import token_required

shared_bp = Blueprint('shared_bp', __name__)

@shared_bp.route('/notifications', methods=['GET'])
@token_required
def get_notifications(current_user):
    """Fetches both read and unread notifications for the logged-in user."""
    user_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch unread notifications
        cursor.execute(
            "SELECT id, message, link_url, created_at FROM notifications WHERE recipient_user_id = %s AND is_read = FALSE ORDER BY created_at DESC",
            (user_id,)
        )
        unread_notifications = cursor.fetchall()

        # Fetch read notifications (e.g., the 10 most recent)
        cursor.execute(
            "SELECT id, message, link_url, created_at FROM notifications WHERE recipient_user_id = %s AND is_read = TRUE ORDER BY created_at DESC LIMIT 10",
            (user_id,)
        )
        read_notifications = cursor.fetchall()
        
        return jsonify({
            "unread": unread_notifications,
            "read": read_notifications
        })
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@shared_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
@token_required
def mark_notification_as_read(current_user, notification_id):
    """Marks a specific notification as read."""
    user_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Ensure the user can only mark their own notifications as read
        cursor.execute(
            "UPDATE notifications SET is_read = TRUE WHERE id = %s AND recipient_user_id = %s",
            (notification_id, user_id)
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"message": "Notification not found or you're not authorized to update it."}), 404
        return jsonify({"message": "Notification marked as read."}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


