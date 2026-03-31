import os
import sys
from datetime import date
from uuid import uuid4

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db
from app.models import Account, JournalEntry, TransactionLine
from app.services import reports_service


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


def _parent_balance_by_name(group):
    return {parent["name"]: parent["monthly_balances"] for parent in group["parents"]}


def test_income_reports_keep_debit_side_income_negative():
    db_path = os.path.join(
        os.getcwd(),
        "tmp",
        f"income-report-signs-{uuid4().hex}.db",
    )
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    class TestConfig:
        TESTING = True
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
        SQLALCHEMY_TRACK_MODIFICATIONS = False
        SECRET_KEY = "test-secret"

    app = create_app(TestConfig)
    with app.app_context():
        cash = Account(code="A1", name="Cash", account_type="Asset")
        salary = Account(code="I1", name="Salary", account_type="Income")
        debt_capital_gain = Account(code="I2", name="Debt Capital Gain", account_type="Income")
        equity_capital_gain = Account(code="I3", name="Equity Capital Gain", account_type="Income")
        rent = Account(code="E1", name="Rent", account_type="Expense")
        db.session.add_all([cash, salary, debt_capital_gain, equity_capital_gain, rent])
        db.session.commit()

        entry_date = date(2026, 3, 15)
        _create_entry(entry_date, "Salary credit", cash.id, salary.id, 1000.0)
        _create_entry(entry_date, "Debt capital gain reversal", debt_capital_gain.id, cash.id, 120.0)
        _create_entry(entry_date, "Equity capital gain reversal", equity_capital_gain.id, cash.id, 80.0)
        _create_entry(entry_date, "Rent payment", rent.id, cash.id, 300.0)
        db.session.commit()

        matrix = reports_service.income_matrix_report("2026-03")
        income_group = next(group for group in matrix["groups"] if group["group"] == "Income")
        expense_group = next(group for group in matrix["groups"] if group["group"] == "Expense")
        income_by_parent = _parent_balance_by_name(income_group)
        expense_by_parent = _parent_balance_by_name(expense_group)

        assert income_by_parent["Salary"]["2026-03"] == 1000.0
        assert income_by_parent["Debt Capital Gain"]["2026-03"] == -120.0
        assert income_by_parent["Equity Capital Gain"]["2026-03"] == -80.0
        assert income_group["monthly_balances"]["2026-03"] == 800.0
        assert expense_by_parent["Rent"]["2026-03"] == 300.0
        assert expense_group["monthly_balances"]["2026-03"] == 300.0

        income_statement = reports_service.income_statement_report("all", False)
        assert income_statement["total_income"] == 800.0
        assert income_statement["total_expenses"] == 300.0
        assert income_statement["net_income"] == 500.0

        savings_series = reports_service.net_savings_series_report()
        march = next(row for row in savings_series["months"] if row["month"] == "2026-03")
        assert march["income"] == 800.0
        assert march["expense"] == 300.0
        assert march["net_savings"] == 500.0

        expense_income_asset = reports_service.expense_income_asset_report()
        march_asset_report = next(row for row in expense_income_asset["months"] if row["month"] == "2026-03")
        assert march_asset_report["sum_income"] == 800.0
        assert march_asset_report["sum_expense"] == 300.0

        assert reports_service.get_net_income(date(2026, 3, 1), date(2026, 3, 31)) == 500.0
