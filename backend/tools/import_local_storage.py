#!/usr/bin/env python3
"""
Import a localStorage export for Denarius and POST it to the backend /api/sync endpoint.

Usage:
  python import_local_storage.py --file path/to/export.json --url http://localhost:8000 --dry-run

The script accepts either:
 - a file containing the raw value of localStorage['denarius_db'] (an object with accounts,buckets,transactions), or
 - a file containing a JSON object with top-level keys accounts/buckets/transactions

It normalizes common field names and posts to /api/sync.
"""

import argparse
import json
import sys
from pathlib import Path
import requests


def normalize_payload(obj: dict) -> dict:
    # If obj wraps the actual payload (e.g., { KEY: {...}}), try to find accounts/buckets/transactions
    if not isinstance(obj, dict):
        raise ValueError("Input JSON must be an object")

    payload = None
    if 'accounts' in obj and 'buckets' in obj and 'transactions' in obj:
        payload = obj
    else:
        # Try to find nested value which contains the collections
        for v in obj.values():
            if isinstance(v, dict) and 'accounts' in v and 'buckets' in v and 'transactions' in v:
                payload = v
                break

    if payload is None:
        raise ValueError('Could not find accounts/buckets/transactions in provided JSON')

    # Ensure field names match backend expectations (camelCase)
    def norm_account(a):
        return {
            'id': a.get('id'),
            'name': a.get('name'),
            'type': a.get('type'),
            'currency': a.get('currency'),
            'balance': float(a.get('balance') or 0),
            'startDate': a.get('startDate') or a.get('start_date') or None,
            'dueDate': a.get('dueDate') or a.get('due_date') or None
        }

    def norm_bucket(b):
        return {
            'id': b.get('id'),
            'name': b.get('name'),
            'balance': float(b.get('balance') or 0)
        }

    def norm_tx(t):
        return {
            'id': t.get('id'),
            'date': t.get('date') or t.get('createdAt') or t.get('created_at') or None,
            'amount': float(t.get('amount') or 0),
            'type': (t.get('type') or '').lower(),
            'accountId': t.get('accountId') or t.get('account_id') or t.get('accountId'),
            'bucketId': t.get('bucketId') or t.get('bucket_id') or None,
            'sourceBucketId': t.get('sourceBucketId') or t.get('source_bucket_id') or t.get('sourceBucketId') or None,
            'description': t.get('description') or t.get('desc') or None
        }

    out = {
        'accounts': [norm_account(x) for x in payload.get('accounts', [])],
        'buckets': [norm_bucket(x) for x in payload.get('buckets', [])],
        'transactions': [norm_tx(x) for x in payload.get('transactions', [])]
    }
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--file', '-f', required=True, help='Path to exported localStorage JSON file')
    p.add_argument('--url', '-u', default='http://localhost:8000', help='Base URL of backend (default: http://localhost:8000)')
    p.add_argument('--dry-run', action='store_true', help='Only print normalized payload, do not POST')
    p.add_argument('--pretty', action='store_true', help='Pretty-print normalized payload')
    args = p.parse_args()

    path = Path(args.file)
    if not path.exists():
        print('File not found:', path, file=sys.stderr)
        sys.exit(2)

    raw = json.loads(path.read_text(encoding='utf-8'))

    try:
        payload = normalize_payload(raw)
    except Exception as err:
        print('Error normalizing payload:', err, file=sys.stderr)
        sys.exit(3)

    if args.pretty:
        print(json.dumps(payload, indent=2, ensure_ascii=False))

    if args.dry_run:
        print('Dry run: not sending to server')
        return

    endpoint = args.url.rstrip('/') + '/api/sync'
    print('Posting normalized payload to', endpoint)
    try:
        r = requests.post(endpoint, json=payload, timeout=30)
        r.raise_for_status()
        print('Server response:', r.status_code, r.text)
    except requests.RequestException as e:
        print('Request failed:', e, file=sys.stderr)
        sys.exit(4)


if __name__ == '__main__':
    main()
