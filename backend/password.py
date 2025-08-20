import mysql.connector
from werkzeug.security import generate_password_hash

# Database connection config
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'root',
    'database': 'regal_wealth_db'
}

# Admin details
email = 'rmukesh2004svv@gmail.com'
plain_password = 'admin123'
first_name = 'Admin'
last_name = 'User'
phone_number = '9080003500'
profile_picture_url = 'https://example.com/profile.png'

# Hash the password
hashed_password = generate_password_hash(plain_password)

try:
    # Connect to the database
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()

    # SQL insert query
    insert_query = """
    INSERT INTO users (
        email, password_hash, role, first_name, last_name, phone_number,
        profile_picture_url, is_active, two_factor_secret, is_2fa_enabled
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    values = (
        email,
        hashed_password,
        'admin',
        first_name,
        last_name,
        phone_number,
        profile_picture_url,
        True,
        None,         # two_factor_secret
        True          # is_2fa_enabled
    )

    cursor.execute(insert_query, values)
    conn.commit()

    print("✅ Admin user inserted successfully!")

except mysql.connector.Error as err:
    print("❌ Error:", err)

finally:
    if conn.is_connected():
        cursor.close()
        conn.close()
