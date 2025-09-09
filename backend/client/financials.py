from flask import jsonify, request
from auth.decorators import client_required
from utils.db import get_db_connection
from .routes import client_bp
import json 


@client_bp.route('/profile/income', methods=['GET'])
@client_required
def get_income_info(current_user):
    """
    Fetches the client's saved list of income sources.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
      
        cursor.execute("SELECT * FROM financials_income WHERE client_user_id = %s", (client_id,))
        income_data = cursor.fetchall()
        
        return jsonify(income_data), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@client_bp.route('/profile/income', methods=['POST'])
@client_required
def update_income(current_user):
    """Replaces all income sources for a client with the provided list."""
    client_id = current_user['user_id']
    data = request.get_json()
    income_sources = data.get('income_sources', [])

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conn.start_transaction()
        cursor.execute("DELETE FROM financials_income WHERE client_user_id = %s", (client_id,))
        if income_sources:
            sql = "INSERT INTO financials_income (client_user_id, source, owner, monthly_amount) VALUES (%s, %s, %s, %s)"
            values = [(client_id, item.get('source'), item.get('owner'), item.get('monthly_amount')) for item in income_sources]
            cursor.executemany(sql, values)
        conn.commit()
        return jsonify({"message": "Income updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@client_bp.route('/profile/assets', methods=['GET'])
@client_required
def get_assets_info(current_user):
    """
    Fetches the client's saved list of financial assets.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
   
        cursor.execute("SELECT * FROM financials_assets WHERE client_user_id = %s", (client_id,))
        assets_data = cursor.fetchall()
        
        return jsonify(assets_data), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@client_bp.route('/profile/assets', methods=['POST'])
@client_required
def update_assets(current_user):
    """Replaces all assets for a client with the provided list."""
    client_id = current_user['user_id']
    data = request.get_json()
    assets = data.get('assets', [])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conn.start_transaction()
        cursor.execute("DELETE FROM financials_assets WHERE client_user_id = %s", (client_id,))
        if assets:
            sql = "INSERT INTO financials_assets (client_user_id, asset_type, description, owner, balance) VALUES (%s, %s, %s, %s, %s)"
            
    
            values = [
                (
                    client_id, 
                    item.get('asset_type'), 
                    item.get('description'), 
                    item.get('owner'), 
                    item.get('balance')
                ) for item in assets
            ]
            cursor.executemany(sql, values)
        conn.commit()
        return jsonify({"message": "Assets updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@client_bp.route('/profile/liabilities', methods=['GET'])
@client_required
def get_liabilities_info(current_user):
    """
    Fetches the client's saved list of liabilities from the financials_liabilities table.
    """
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM financials_liabilities WHERE client_user_id = %s", (client_id,))
        liabilities_data = cursor.fetchall()
        return jsonify(liabilities_data), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@client_bp.route('/profile/liabilities', methods=['POST'])
@client_required
def update_liabilities(current_user):
    """
    Replaces all liabilities for a client in the financials_liabilities table.
    """
    client_id = current_user['user_id']
    data = request.get_json()
    liabilities = data.get('liabilities', [])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conn.start_transaction()
        cursor.execute("DELETE FROM financials_liabilities WHERE client_user_id = %s", (client_id,))
        if liabilities:
            sql = "INSERT INTO financials_liabilities (client_user_id, liability_type, description, balance) VALUES (%s, %s, %s, %s)"
            values = [(client_id, item.get('liability_type'), item.get('description'), item.get('balance')) for item in liabilities]
            cursor.executemany(sql, values)
        conn.commit()
        return jsonify({"message": "Liabilities updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@client_bp.route('/profile/assets', methods=['GET'])
@client_required
def get_assets_data(current_user):
    """Fetches saved assets from the financials_assets table."""
    client_id = current_user['user_id']
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM financials_assets WHERE client_user_id = %s", (client_id,))
        asset_data = cursor.fetchall()
        return jsonify(asset_data), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@client_bp.route('/profile/assets', methods=['POST'])
@client_required
def update_assets_data(current_user):
    """Replaces all assets for a client in the financials_assets table."""
    client_id = current_user['user_id']
    data = request.get_json()
    assets = data.get('assets', [])

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conn.start_transaction()
        cursor.execute("DELETE FROM financials_assets WHERE client_user_id = %s", (client_id,))
        
        if assets:
            sql = """
                INSERT INTO financials_assets (client_user_id, asset_type, description, owner, balance) 
                VALUES (%s, %s, %s, %s, %s)
            """
            values = [
                (
                    client_id, 
                    item.get('asset_type'), 
                    item.get('description'), 
                    item.get('owner'), 
                    item.get('balance')
                ) for item in assets
            ]
            cursor.executemany(sql, values)
        
        conn.commit()
        return jsonify({"message": "Assets updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()