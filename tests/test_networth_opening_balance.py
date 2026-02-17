import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account


def test_networth_includes_opening_balance_carry_and_balances():
    app = create_app()
    with app.app_context():
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        # Create asset with opening balance
        a = Account(code='A100', name='Cash', account_type='Asset', opening_balance=1500.0)
        # Create liability empty
        l = Account(code='L100', name='CreditCard', account_type='Liability')
        # Ensure no equity is seeded
        db.session.add_all([a, l])
        db.session.commit()

        client = app.test_client()
        resp = client.get('/reports/networth')
        assert resp.status_code == 200
        body = resp.get_data(as_text=True)
        # Carry Forward (plug) row should be present when assets exceed liabilities + equity
        assert 'Carry Forward' in body
        # Page should indicate the statement is balanced
        assert 'Networth Statement is balanced' in body
