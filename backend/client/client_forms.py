from flask import jsonify
from auth.decorators import client_required
from utils.db import get_db_connection
from .routes import client_bp


def get_form_structure(form_name):
    """
    A reusable helper function to fetch and build the hierarchical form structure
    for the client view (only fetching active fields and options).
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    field_sql = """
        SELECT id, field_label, field_type, parent_field_id, is_active
        FROM form_fields 
        WHERE form_name = %s AND is_active = TRUE
        ORDER BY field_order ASC
    """
    cursor.execute(field_sql, (form_name,))
    all_fields = cursor.fetchall()

    if not all_fields:
        cursor.close()
        conn.close()
        return []

    field_ids = [field['id'] for field in all_fields]
    all_options = []
    if field_ids:
        option_sql = """
        SELECT id, field_id, option_label, option_value, details_field_label
        FROM form_options
        WHERE field_id IN ({})
        ORDER BY option_order ASC
    """.format(','.join(['%s'] * len(field_ids)))
        cursor.execute(option_sql, tuple(field_ids))
        all_options = cursor.fetchall()

    for field in all_fields:
        field['options'] = [opt for opt in all_options if opt['field_id'] == field['id']]
        field['sub_fields'] = []

    fields_map = {field['id']: field for field in all_fields}
    structured_fields = []
    for field in all_fields:
        if field['parent_field_id'] is None:
            structured_fields.append(field)
        else:
            parent_id = field['parent_field_id']
            if parent_id in fields_map:
                fields_map[parent_id]['sub_fields'].append(field)
    
    cursor.close()
    conn.close()
    return structured_fields


@client_bp.route('/forms/assets', methods=['GET'])
@client_required
def get_assets_form_client(current_user, form_name='assets'):
    """
    Fetches the ACTIVE asset form structure for the client view,
    ensuring sub-fields are correctly nested.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, label, description 
            FROM asset_form_categories 
            WHERE form_name = %s AND is_active = TRUE 
            ORDER BY category_order ASC
        """, (form_name,))
        categories = cursor.fetchall()
        
        if not categories:
            return jsonify([]), 200

        category_ids = [cat['id'] for cat in categories]
        
        fields_sql = """
            SELECT id, field_label, field_type, asset_category_id 
            FROM form_fields 
            WHERE asset_category_id IN ({}) AND is_active = TRUE
            ORDER BY field_order ASC
        """.format(','.join(['%s'] * len(category_ids)))
        cursor.execute(fields_sql, tuple(category_ids))
        all_sub_fields = cursor.fetchall()

        for category in categories:
            category['subFields'] = [
                {
                    "id": field["id"],
                    "label": field["field_label"],
                    "type": field["field_type"]
                } for field in all_sub_fields if field['asset_category_id'] == category['id']
            ]

        return jsonify(categories), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close() 

@client_bp.route('/forms/liabilities', methods=['GET'])
@client_required
def get_liabilities_form(current_user):
    try:
        structure = get_form_structure('liabilities')
        return jsonify(structure), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500

@client_bp.route('/forms/investor-profile', methods=['GET'])
@client_required
def get_investor_profile_form(current_user):
    try:
        structure = get_form_structure('investor_profile')
        return jsonify(structure), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500