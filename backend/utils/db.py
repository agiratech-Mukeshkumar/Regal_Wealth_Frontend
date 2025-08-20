import mysql.connector
from mysql.connector import pooling
from config import Config

try:
    # Create a connection pool
    db_pool = pooling.MySQLConnectionPool(
        pool_name="regal_pool",
        pool_size=32,
        **Config.DB_CONFIG
    )
    print("Database connection pool created successfully.")
except mysql.connector.Error as err:
    print(f"Error creating connection pool: {err}")
    db_pool = None

def get_db_connection():
    """Get a connection from the pool."""
    if db_pool:
        return db_pool.get_connection()
    return None