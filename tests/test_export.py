import sys, os, io
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.utils.excel_import import import_transactions_from_excel
from openpyxl import load_workbook

def test_export_transactions():
    app = create_app()

    with app.app_context():
        # fresh DB
        db_path = os.path.join(os.getcwd(), 'accounting.db')
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        sample = os.path.join(os.getcwd(), 'sample.xlsx')
        assert os.path.exists(sample), f"sample.xlsx missing at {sample}"

        with open(sample, 'rb') as f:
            res = import_transactions_from_excel(f)
            assert res['success'] > 0 and not res['errors']

        client = app.test_client()
        resp = client.get('/transactions/export')
        assert resp.status_code == 200
        data = resp.data
        assert len(data) > 100

        # Load workbook from bytes
        wb = load_workbook(filename=io.BytesIO(data))
        assert 'Transactions' in wb.sheetnames
        ws = wb['Transactions']
        rows = list(ws.rows)
        # header + at least one data row
        assert len(rows) >= 2
        header = [c.value for c in rows[0]]
        assert header == ['Date', 'Debit Account', 'Description', 'Amount', 'Credit Account']

        # Accounts sheet should be present and include Opening Balance
        assert 'Accounts' in wb.sheetnames
        acc_ws = wb['Accounts']
        acc_rows = list(acc_ws.rows)
        assert len(acc_rows) >= 1
        acc_header = [c.value for c in acc_rows[0]]
        assert 'Opening Balance' in acc_header

        # spot-check a data row
        first_row = [c.value for c in rows[1]]
        assert first_row[0] is not None and first_row[1] is not None and isinstance(first_row[3], (int, float))
        # debit account path should be prefixed by account type (e.g., 'Asset:...')
        from app.models import AccountType
        debit_path = first_row[1]
        assert isinstance(debit_path, str) and ':' in debit_path and debit_path.split(':')[0] in [t.value for t in AccountType]

