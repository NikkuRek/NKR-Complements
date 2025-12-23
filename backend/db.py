import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()


def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("MYSQL_ADDON_HOST", os.getenv("DB_HOST", "localhost")),
            user=os.getenv("MYSQL_ADDON_USER", os.getenv("DB_USER", "root")),
            password=os.getenv("MYSQL_ADDON_PASSWORD", os.getenv("DB_PASSWORD", "")),
            database=os.getenv("MYSQL_ADDON_DB", os.getenv("DB_NAME", "finanzas_personales")),
            port=int(os.getenv("MYSQL_ADDON_PORT", os.getenv("DB_PORT", "3306")))
        )
        return connection
    except mysql.connector.Error as err:
        print(f"Error conectando a BD: {err}")
        return None
