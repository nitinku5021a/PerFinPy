import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Account
from app.utils.excel_import import import_transactions_from_excel

app = create_app()


def test_import_cleans_legacy_type_accounts():
    with app.app_context():
        # fresh db
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        # Create a legacy top-level account named 'Asset' (buggy prior behavior)
        legacy = Account(code='legacy', name='Asset', account_type='Asset')
        db.session.add(legacy)
        db.session.commit()

        # Import sample file
        sample_path = os.path.join(os.getcwd(), 'tests', 'sample_transactions.xlsx')
        with open(sample_path, 'rb') as f:
            res = import_transactions_from_excel(f)

        # Legacy 'Asset' should be removed if truly orphaned
        legacy_exists = Account.query.filter_by(name='Asset', parent_id=None).first()
        assert legacy_exists is None

        # The intended top-level should be 'Saving Bank Account' with account_type 'Asset'
        s = Account.query.filter_by(name='Saving Bank Account', parent_id=None, account_type='Asset').first()
        assert s is not None

        # Results should include a warning about removed legacy accounts
        assert any('Removed legacy top-level accounts' in w for w in res.get('warnings', []))