import sys
import os

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app

app = create_app()

with app.app_context():
    client = app.test_client()

    urls = ['/reports/trial-balance', '/reports/balance-sheet', '/reports/income-statement']
    for u in urls:
        resp = client.get(u)
        print(u, 'status:', resp.status_code)
        if resp.status_code != 200:
            print(resp.data.decode()[:1000])
