#!/usr/bin/env python3
from pathlib import Path
import os
import sys
# Ensure backend package root is on the path so `db` module can be imported when running from tools/
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from db import get_db_connection
from dotenv import load_dotenv

load_dotenv()

SQL_FILE = Path(__file__).resolve().parent.parent / 'migrations.sql'
if not SQL_FILE.exists():
    print('migrations.sql not found at', SQL_FILE)
    raise SystemExit(2)

sql = SQL_FILE.read_text(encoding='utf-8')
# Remove DELIMITER lines used in MySQL client and convert END$$ to END;
sql = sql.replace('DELIMITER $$', '')
sql = sql.replace('DELIMITER ;', '')
sql = sql.replace('END$$', 'END;')

conn = get_db_connection()
if not conn:
    print('Could not connect to DB; aborting')
    raise SystemExit(3)

cursor = conn.cursor()
try:
    print('Applying migrations...')
    for result in cursor.execute(sql, multi=True):
        # iterate to ensure execution
        pass
    conn.commit()
    print('Migrations applied successfully')
except Exception as e:
    conn.rollback()
    print('Error applying migrations:', e)
    raise
finally:
    cursor.close()
    conn.close()
