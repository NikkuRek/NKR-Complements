# Windows PowerShell example using curl (built-in) to test API
$base = 'http://localhost:8000'

# List accounts
curl "$base/api/accounts"

# Create an account
curl -X POST "$base/api/accounts" -H 'Content-Type: application/json' -d '{"name":"ps_acc","type":"ASSET","currency":"USD","balance":100}'

# Create a bucket
curl -X POST "$base/api/buckets" -H 'Content-Type: application/json' -d '{"name":"ps_buc","balance":0}'

# Create transaction
curl -X POST "$base/api/transactions" -H 'Content-Type: application/json' -d '{"amount":10.5,"type":"expense","account_id":1,"description":"ps test"}'

# Sync from file (import sample payload)
$payload = Get-Content -Raw -Path "sample_sync_payload.json"
curl -X POST "$base/api/sync" -H 'Content-Type: application/json' -d $payload
