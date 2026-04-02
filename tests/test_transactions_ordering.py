import os
import sys
from datetime import date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db
from app.models import Account, JournalEntry, TransactionLine
from app.services.transactions_service import list_transactions


app = create_app()


def _create_simple_entry(entry_date, description, debit_account_id, credit_account_id, amount):
    je = JournalEntry(entry_date=entry_date, description=description, reference="")
    db.session.add(je)
    db.session.flush()
    db.session.add_all(
        [
            TransactionLine(
                journal_entry_id=je.id,
                account_id=debit_account_id,
                line_type="DEBIT",
                amount=amount,
                date=entry_date
            ),
            TransactionLine(
                journal_entry_id=je.id,
                account_id=credit_account_id,
                line_type="CREDIT",
                amount=amount,
                date=entry_date
            )
        ]
    )
    return je


def test_transactions_same_date_show_latest_entry_first():
    with app.app_context():
        db_path = os.path.join(os.getcwd(), "accounting.db")
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        cash = Account(code="A1", name="Cash", account_type="Asset")
        salary = Account(code="I1", name="Salary", account_type="Income")
        db.session.add_all([cash, salary])
        db.session.commit()

        same_day = date(2026, 4, 2)
        _create_simple_entry(same_day, "Earlier same-day entry", cash.id, salary.id, 1000.0)
        _create_simple_entry(same_day, "Latest same-day entry", cash.id, salary.id, 2000.0)
        db.session.commit()

        payload = list_transactions(page=1, period="all", account_id=None)

        descriptions = [entry["description"] for entry in payload["entries"]]
        assert descriptions[:2] == ["Latest same-day entry", "Earlier same-day entry"]
