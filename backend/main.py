import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from db import get_db_connection

# --- App ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class AccountCreate(BaseModel):
    name: str
    type: str
    currency: Optional[str] = 'USD'
    balance: Optional[float] = 0
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class BucketCreate(BaseModel):
    name: str
    balance: Optional[float] = 0

class TransactionCreate(BaseModel):
    date: Optional[datetime] = None
    amount: float
    type: str
    account_id: Optional[int] = None
    bucket_id: Optional[int] = None
    source_bucket_id: Optional[int] = None
    description: Optional[str] = None

# --- Accounts endpoints ---
@app.get("/api/accounts")
def get_accounts():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM accounts ORDER BY id ASC")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

@app.post("/api/accounts", status_code=201)
def create_account(acc: AccountCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "INSERT INTO accounts (name, type, currency, balance, start_date, due_date) VALUES (%s, %s, %s, %s, %s, %s)"
    values = (acc.name, acc.type, acc.currency, acc.balance or 0, acc.start_date, acc.due_date)
    try:
        cursor.execute(query, values)
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return {"id": new_id}
    except Exception as err:
        conn.rollback()
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=str(err))

@app.put("/api/accounts/{acc_id}")
def update_account(acc_id: int, acc: AccountCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE accounts SET name=%s, type=%s, currency=%s, balance=%s, start_date=%s, due_date=%s WHERE id=%s",
                       (acc.name, acc.type, acc.currency, acc.balance, acc.start_date, acc.due_date, acc_id))
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"updated": True}

@app.delete("/api/accounts/{acc_id}")
def delete_account(acc_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM accounts WHERE id=%s", (acc_id,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"deleted": True}

# --- Buckets endpoints ---
@app.get("/api/buckets")
def get_buckets():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM buckets ORDER BY id ASC")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return data

@app.post("/api/buckets", status_code=201)
def create_bucket(b: BucketCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO buckets (name, balance) VALUES (%s, %s)", (b.name, b.balance or 0))
        conn.commit()
        new_id = cursor.lastrowid
        return {"id": new_id}
    finally:
        cursor.close()
        conn.close()

@app.put("/api/buckets/{b_id}")
def update_bucket(b_id: int, b: BucketCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE buckets SET name=%s, balance=%s WHERE id=%s", (b.name, b.balance, b_id))
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"updated": True}

@app.delete("/api/buckets/{b_id}")
def delete_bucket(b_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM buckets WHERE id=%s", (b_id,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"deleted": True}

# --- Transactions endpoints ---
@app.get("/api/transactions")
def get_transactions():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM transactions ORDER BY date DESC")
    txs = cursor.fetchall()
    cursor.close()
    conn.close()
    return txs

@app.post("/api/transactions", status_code=201)
def create_transaction(tx: TransactionCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    tx_date = tx.date if tx.date else datetime.now()
    query = """
    INSERT INTO transactions (date, amount, type, account_id, bucket_id, source_bucket_id, description)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    values = (tx_date, tx.amount, tx.type, tx.account_id, tx.bucket_id, tx.source_bucket_id, tx.description)
    try:
        cursor.execute(query, values)
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return {"message": "Transacción guardada", "id": new_id}
    except Exception as err:
        conn.rollback()
        cursor.close()
        conn.close()
        raise HTTPException(status_code=500, detail=str(err))

@app.put("/api/transactions/{tx_id}")
def update_transaction(tx_id: int, tx: TransactionCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE transactions SET date=%s, amount=%s, type=%s, account_id=%s, bucket_id=%s, source_bucket_id=%s, description=%s WHERE id=%s",
                       (tx.date or datetime.now(), tx.amount, tx.type, tx.account_id, tx.bucket_id, tx.source_bucket_id, tx.description, tx_id))
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"updated": True}

@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM transactions WHERE id=%s", (tx_id,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"deleted": True}

# --- Sync endpoint: reemplaza tablas con payload (útil para importar desde frontend) ---
@app.post("/api/sync")
def sync_all(payload: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Desactivar FK checks
        cursor.execute("SET FOREIGN_KEY_CHECKS=0")
        cursor.execute("DELETE FROM transactions")
        cursor.execute("DELETE FROM buckets")
        cursor.execute("DELETE FROM accounts")

        # Insert accounts
        for a in payload.get('accounts', []):
            cursor.execute("INSERT INTO accounts (id, name, type, currency, balance, start_date, due_date) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                           (int(a.get('id')) if a.get('id') and str(a.get('id')).isdigit() else None, a.get('name'), a.get('type'), a.get('currency'), a.get('balance') or 0, a.get('startDate') or None, a.get('dueDate') or None))
        # Insert buckets
        for b in payload.get('buckets', []):
            cursor.execute("INSERT INTO buckets (id, name, balance) VALUES (%s,%s,%s)", (int(b.get('id')) if b.get('id') and str(b.get('id')).isdigit() else None, b.get('name'), b.get('balance') or 0))
        # Insert transactions
        for t in payload.get('transactions', []):
            cursor.execute("INSERT INTO transactions (id, date, amount, type, account_id, bucket_id, source_bucket_id, description) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                           (int(t.get('id')) if t.get('id') and str(t.get('id')).isdigit() else None, t.get('date') or datetime.now(), t.get('amount'), t.get('type'), int(t.get('accountId')) if t.get('accountId') and str(t.get('accountId')).isdigit() else None, int(t.get('bucketId')) if t.get('bucketId') and str(t.get('bucketId')).isdigit() else None, int(t.get('sourceBucketId')) if t.get('sourceBucketId') and str(t.get('sourceBucketId')).isdigit() else None, t.get('description')))

        cursor.execute("SET FOREIGN_KEY_CHECKS=1")
        conn.commit()
        return {"synced": True}
    except Exception as err:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# --- Servir frontend (carpeta complements/denarius) ---
static_dir = os.path.join(os.getcwd(), 'complements', 'denarius')
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="public")
else:
    print(f"Warning: static dir not found: {static_dir}")
