from flask import request, jsonify
from utils.db import get_db_connection
from auth.decorators import admin_required
from .routes import admin_bp
import json

@admin_bp.route('/forms/assets', methods=['GET'])
@admin_required
def get_assets_form_structure_admin(form_name='assets'):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM asset_form_categories WHERE form_name = %s ORDER BY category_order ASC", (form_name,))
        categories = cursor.fetchall()
        
        if not categories:
            return jsonify([]), 200

        category_ids = [cat['id'] for cat in categories]
        

        fields_sql = """
            SELECT id, field_label, field_type, asset_category_id 
            FROM form_fields 
            WHERE asset_category_id IN ({})
            ORDER BY field_order ASC
        """.format(','.join(['%s'] * len(category_ids)))
        cursor.execute(fields_sql, tuple(category_ids))
        all_sub_fields = cursor.fetchall()

        for category in categories:
           
            category['subFields'] = [
                {
                    "id": field["id"],
                    "label": field["field_label"],
                    "type": field["field_type"],
                    "asset_category_id": field["asset_category_id"]
                } for field in all_sub_fields if field['asset_category_id'] == category['id']
            ]

        return jsonify(categories), 200
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/forms/assets/categories', methods=['POST'])
@admin_required
def create_asset_category():
    """Creates a new asset category."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "INSERT INTO asset_form_categories (label, description) VALUES (%s, %s)"
        cursor.execute(sql, ('New Category', 'Description'))
        conn.commit()
        return jsonify({"message": "Category created successfully", "id": cursor.lastrowid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/forms/assets/categories/<int:category_id>', methods=['PUT'])
@admin_required
def update_asset_category(category_id):
    """Updates an asset category's label or description."""
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "UPDATE asset_form_categories SET label = %s, description = %s WHERE id = %s"
        cursor.execute(sql, (data.get('label'), data.get('description'), category_id))
        conn.commit()
        return jsonify({"message": "Category updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()
        
@admin_bp.route('/forms/assets/categories/<int:category_id>', methods=['DELETE'])
@admin_required
def delete_asset_category(category_id):
    """Deletes an asset category."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM asset_form_categories WHERE id = %s", (category_id,))
        conn.commit()
        return jsonify({"message": "Category deleted successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/forms/assets/categories/<int:category_id>/fields', methods=['POST'])
@admin_required
def create_asset_sub_field(category_id):
    """Creates a new sub-field within an asset category."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
    
        sql = "INSERT INTO form_fields (form_name, field_label, field_type, asset_category_id) VALUES (%s, %s, %s, %s)"
        cursor.execute(sql, ('assets', 'New Field', 'Text', category_id))
        conn.commit()
        return jsonify({"message": "Field created successfully", "id": cursor.lastrowid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/forms/<form_name>', methods=['GET'])
@admin_required
def get_form_fields(form_name):
    """
    Fetches all fields and their options for a form, organizing them into a
    hierarchical structure.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        
        field_sql = """
            SELECT id, field_label, field_type, is_active, parent_field_id, field_order
            FROM form_fields 
            WHERE form_name = %s
            ORDER BY field_order ASC
        """
        cursor.execute(field_sql, (form_name,))
        all_fields = cursor.fetchall()

        if not all_fields:
            return jsonify([]), 200

        field_ids = [field['id'] for field in all_fields]

        
        option_sql = """
            SELECT id, field_id, option_label, option_value, details_field_label
            FROM form_options
            WHERE field_id IN ({})
            ORDER BY option_order ASC
        """.format(','.join(['%s'] * len(field_ids)))
        
        if field_ids:
            cursor.execute(option_sql, tuple(field_ids))
            all_options = cursor.fetchall()
        else:
            all_options = []


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

        return jsonify(structured_fields), 200
        
    except Exception as e:
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/forms/<form_name>/fields', methods=['POST'])
@admin_required
def create_form_field(form_name):
    data = request.get_json()
    field_label = data.get('field_label')
    field_type = data.get('field_type')
    parent_field_id = data.get('parent_field_id')

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = """
            INSERT INTO form_fields (form_name, field_label, field_type, parent_field_id)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (form_name, field_label, field_type, parent_field_id))
        conn.commit()
        return jsonify({"message": "Form field created successfully", "field_id": cursor.lastrowid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/forms/fields/<int:field_id>/options', methods=['POST'])
@admin_required
def create_form_option(field_id):
    data = request.get_json()
    option_label = data.get('option_label', 'New Option')
    option_value = data.get('option_value', option_label.lower().replace(' ', '_'))
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = "INSERT INTO form_options (field_id, option_label, option_value) VALUES (%s, %s, %s)"
        cursor.execute(sql, (field_id, option_label, option_value))
        conn.commit()
        return jsonify({"message": "Option added successfully", "option_id": cursor.lastrowid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/forms/options/<int:option_id>', methods=['PUT'])
@admin_required
def update_form_option(option_id):
    """
    Dynamically updates properties of a form option based on the provided data.
    """
    data = request.get_json()
    if not data:
        return jsonify({"message": "No data provided in request."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        update_parts = []
        values = []

       
        if 'option_label' in data:
            update_parts.append("option_label = %s")
            values.append(data.get('option_label'))
        
        if 'details_field_label' in data:
            update_parts.append("details_field_label = %s")
            values.append(data.get('details_field_label'))

        if not update_parts:
            return jsonify({"message": "No valid fields to update."}), 400

        sql = f"UPDATE form_options SET {', '.join(update_parts)} WHERE id = %s"
        values.append(option_id)
        
        cursor.execute(sql, tuple(values))
        conn.commit()
        
        return jsonify({"message": "Option updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()
      
@admin_bp.route('/forms/options/<int:option_id>', methods=['DELETE'])
@admin_required
def delete_form_option(option_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM form_options WHERE id = %s", (option_id,))
        conn.commit()
        return jsonify({"message": "Option deleted successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/forms/fields/<int:field_id>', methods=['PUT'])
@admin_required
def update_form_field(field_id):
    """ Updates an existing form field's properties. """
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        update_parts = []
        values = []
        
        key_map = {
            'label': 'field_label',
            'type': 'field_type'
        }

        for key, value in data.items():
            if key in key_map:
                update_parts.append(f"{key_map[key]} = %s")
                values.append(value)
        
        if not update_parts:
            return jsonify({"message": "No updateable fields provided"}), 400

        values.append(field_id)
        sql = f"UPDATE form_fields SET {', '.join(update_parts)} WHERE id = %s"
        cursor.execute(sql, tuple(values))
        conn.commit()
        return jsonify({"message": "Field updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/forms/fields/<int:field_id>', methods=['DELETE'])
@admin_required
def delete_form_field(field_id):
    """ Deletes a form field. Cascade delete will handle children. """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM form_fields WHERE id = %s", (field_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"message": "Field not found"}), 404
        return jsonify({"message": "Field deleted successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"message": f"An error occurred: {e}"}), 500
    finally:
        cursor.close()
        conn.close()