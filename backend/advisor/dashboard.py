from datetime import date, timedelta
from flask import jsonify
from utils.db import get_db_connection
from auth.decorators import advisor_required
from .routes import advisor_bp


@advisor_bp.route('/dashboard/stats', methods=['GET'])
@advisor_required
def get_dashboard_stats(current_user):
    """
    Fetches aggregated statistics, now including appointment data for the charts.
    """
    advisor_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        #  Client Counts by Tier
        cursor.execute("SELECT cp.tier, COUNT(cp.client_user_id) AS count FROM client_profiles cp JOIN advisor_client_map acm ON cp.client_user_id = acm.client_user_id WHERE acm.advisor_user_id = %s GROUP BY cp.tier", (advisor_id,))
        tier_stats = cursor.fetchall()

        #  Client Counts by Onboarding Status
        cursor.execute("SELECT cp.onboarding_status, COUNT(cp.client_user_id) AS count FROM client_profiles cp JOIN advisor_client_map acm ON cp.client_user_id = acm.client_user_id WHERE acm.advisor_user_id = %s GROUP BY cp.onboarding_status", (advisor_id,))
        onboarding_stats = cursor.fetchall()
        
        #  appointment counts for the week
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        days = [(week_start + timedelta(days=i)) for i in range(7)]
        day_names = [d.strftime('%a') for d in days]
        
        cursor.execute("""
            SELECT DATE(start_time) as app_date, COUNT(id) as count
            FROM appointments
            WHERE advisor_user_id = %s AND start_time BETWEEN %s AND %s + INTERVAL 1 DAY
            GROUP BY DATE(start_time)
        """, (advisor_id, week_start, days[-1]))
        app_counts = {r['app_date'].strftime('%a'): r['count'] for r in cursor.fetchall()}
        appointment_stats = [{"day": day, "count": app_counts.get(day, 0)} for day in day_names]

        #  upcoming meetings count for today
        cursor.execute("SELECT COUNT(id) as count FROM appointments WHERE advisor_user_id = %s AND DATE(start_time) = CURDATE()", (advisor_id,))
        today_meetings = cursor.fetchone()

        response = {
            "clients_by_tier": tier_stats,
            "clients_by_onboarding_status": onboarding_stats,
            "appointments_weekly": appointment_stats,
            "meetings_today": today_meetings['count'] if today_meetings else 0
        }
        
        return jsonify(response)
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@advisor_bp.route('/dashboard/next-appointment', methods=['GET'])
@advisor_required
def get_next_appointment(current_user):
    """
    Fetches the details of the very next upcoming appointment for the advisor.
    """
    advisor_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
            SELECT 
                a.title,
                a.start_time,
                CONCAT(u.first_name, ' ', u.last_name) as client_name
            FROM appointments a
            JOIN users u ON a.client_user_id = u.id
            WHERE a.advisor_user_id = %s AND a.start_time >= NOW()
            ORDER BY a.start_time ASC
            LIMIT 1
        """
        cursor.execute(sql, (advisor_id,))
        next_appointment = cursor.fetchone()
        
       
        if next_appointment and next_appointment['start_time']:
            next_appointment['start_time'] = next_appointment['start_time'].isoformat()

        return jsonify(next_appointment), 200 
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()
