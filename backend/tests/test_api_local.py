from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_accounts_local():
    res = client.get('/api/accounts')
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_create_and_delete_bucket_local():
    # create bucket
    res = client.post('/api/buckets', json={'name': 'test_buc_local', 'balance': 0})
    assert res.status_code == 201
    b_id = res.json().get('id')
    assert b_id
    # delete
    res = client.delete(f'/api/buckets/{b_id}')
    assert res.status_code == 200
