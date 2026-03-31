import os
import sys
from datetime import date
from uuid import uuid4

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db
from app.models import Account, JournalEntry, TransactionLine
from app.services.transactions_service import list_transactions


def _create_entry(entry_date, description, debit_account_id, credit_account_id, amount):
    entry = JournalEntry(entry_date=entry_date, description=description)
    db.session.add(entry)
    db.session.flush()
    db.session.add_all([
        TransactionLine(
            journal_entry_id=entry.id,
            account_id=debit_account_id,
            line_type="DEBIT",
            amount=amount,
            date=entry_date,
        ),
        TransactionLine(
            journal_entry_id=entry.id,
            account_id=credit_account_id,
            line_type="CREDIT",
            amount=amount,
            date=entry_date,
        ),
    ])


def test_transactions_period_sums_apply_account_type_sign_rules():
    db_path = os.path.join(
        os.getcwd(),
        "tmp",
        f"transactions-period-sums-{uuid4().hex}.db",
    )
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    class TestConfig:
        TESTING = True
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
        SQLALCHEMY_TRACK_MODIFICATIONS = False
        SECRET_KEY = "test-secret"

    app = create_app(TestConfig)
    with app.app_context():
        asset_debit = Account(code="A1", name="Cash In", account_type="Asset")
        asset_credit = Account(code="A2", name="Cash Out", account_type="Asset")
        expense_debit = Account(code="E1", name="Groceries", account_type="Expense")
        expense_credit = Account(code="E2", name="Expense Reversal", account_type="Expense")
        liability_credit = Account(code="L1", name="Credit Card", account_type="Liability")
        liability_debit = Account(code="L2", name="Loan Payment", account_type="Liability")
        income_credit = Account(code="I1", name="Salary", account_type="Income")
        income_debit = Account(code="I2", name="Salary Reversal", account_type="Income")
        db.session.add_all([
            asset_debit,
            asset_credit,
            expense_debit,
            expense_credit,
            liability_credit,
            liability_debit,
            income_credit,
            income_debit,
        ])
        db.session.commit()

        entry_date = date(2026, 3, 15)
        _create_entry(entry_date, "Salary received", asset_debit.id, income_credit.id, 1000.0)
        _create_entry(entry_date, "Grocery purchase", expense_debit.id, asset_credit.id, 200.0)
        _create_entry(entry_date, "Expense reversal", asset_debit.id, expense_credit.id, 30.0)
        _create_entry(entry_date, "Card purchase", expense_debit.id, liability_credit.id, 150.0)
        _create_entry(entry_date, "Loan principal payment", liability_debit.id, asset_credit.id, 50.0)
        _create_entry(entry_date, "Salary reversal", income_debit.id, asset_credit.id, 80.0)
        db.session.commit()

        payload = list_transactions(page=1, period="all", account_id=None)
        period_sums = payload["period_sums"]

        asset_values = {item["name"]: item["value"] for item in period_sums["Asset"]}
        expense_values = {item["name"]: item["value"] for item in period_sums["Expense"]}
        liability_values = {item["name"]: item["value"] for item in period_sums["Liability"]}
        income_values = {item["name"]: item["value"] for item in period_sums["Income"]}

        assert asset_values == {"Cash In": 1030.0, "Cash Out": -330.0}
        assert expense_values == {"Expense Reversal": -30.0, "Groceries": 350.0}
        assert liability_values == {"Credit Card": 150.0, "Loan Payment": -50.0}
        assert income_values == {"Salary": 1000.0, "Salary Reversal": -80.0}

        assert sum(asset_values.values()) == 700.0
        assert sum(expense_values.values()) == 320.0
        assert sum(liability_values.values()) == 100.0
        assert sum(income_values.values()) == 920.0
