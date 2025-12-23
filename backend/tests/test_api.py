import os
import requests
import random
import string
import pytest

BASE = os.getenv('TEST_BASE_URL', 'http://localhost:8000')

def rand_name(prefix='t'):
    return prefix + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

@pytest.fixture(scope='module')
def session():
    s = requests.Session()
    yield s
    s.close()

def test_accounts_crud(session):
    name = rand_name('acc_')
    # Create
    res = session.post(f"{BASE}/api/accounts", json={"name": name, "type": "ASSET", "currency": "USD", "balance": 100})
    assert res.status_code == 201
    j = res.json()
    acc_id = j.get('id')
    assert acc_id

    # Get accounts contain new
    res = session.get(f"{BASE}/api/accounts")
    assert res.status_code == 200
    accounts = res.json()
    assert any(a['id'] == acc_id for a in accounts)

    # Update
    res = session.put(f"{BASE}/api/accounts/{acc_id}", json={"name": name + '_u', "type": "ASSET", "currency": "USD", "balance": 200})
    assert res.status_code == 200

    # Delete
    res = session.delete(f"{BASE}/api/accounts/{acc_id}")
    assert res.status_code == 200

def test_buckets_and_transactions(session):
    bname = rand_name('buc_')
    # Create bucket
    res = session.post(f"{BASE}/api/buckets", json={"name": bname, "balance": 0})
    assert res.status_code == 201
    b_id = res.json().get('id')
    assert b_id

    # Create account to use in tx
    res = session.post(f"{BASE}/api/accounts", json={"name": rand_name('acc_'), "type": "ASSET", "currency": "USD", "balance": 500})
    assert res.status_code == 201
    a_id = res.json().get('id')

    # Create transaction
    tx_payload = {"amount": 12.5, "type": "expense", "account_id": a_id, "bucket_id": b_id, "description": "pytest tx"}
    res = session.post(f"{BASE}/api/transactions", json=tx_payload)
    assert res.status_code == 201
    tx_id = res.json().get('id')
    assert tx_id

    # Get transactions and check exists
    res = session.get(f"{BASE}/api/transactions")
    assert res.status_code == 200
    txs = res.json()
    assert any(t['id'] == tx_id for t in txs)

    # Cleanup: delete tx, bucket, account
    res = session.delete(f"{BASE}/api/transactions/{tx_id}")
    assert res.status_code == 200
    res = session.delete(f"{BASE}/api/buckets/{b_id}")
    assert res.status_code == 200
    res = session.delete(f"{BASE}/api/accounts/{a_id}")
    assert res.status_code == 200
