import os
import sys
from datetime import date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db
from app.models import Account, JournalEntry, TransactionLine


def _create_simple_entry(entry_date, description, debit_account_id, credit_account_id, amount):
    je = JournalEntry(entry_date=entry_date, description=description, reference="", notes="")
    db.session.add(je)
    db.session.flush()
    db.session.add(
        TransactionLine(
            journal_entry_id=je.id,
            account_id=debit_account_id,
            line_type="DEBIT",
            amount=amount,
            date=entry_date,
            description=description
        )
    )
    db.session.add(
        TransactionLine(
            journal_entry_id=je.id,
            account_id=credit_account_id,
            line_type="CREDIT",
            amount=amount,
            date=entry_date,
            description=description
        )
    )
    db.session.flush()
    return je


def test_monthly_budget_summary_and_carry_forward():
    app = create_app()
    with app.app_context():
        db_path = os.path.join(os.getcwd(), "accounting.db")
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        expense = Account(code="E1", name="General Expense", account_type="Expense")
        cash = Account(code="A1", name="Cash", account_type="Asset")
        income = Account(code="I1", name="Salary", account_type="Income")
        db.session.add_all([expense, cash, income])
        db.session.commit()

        d = date(2026, 1, 15)
        _create_simple_entry(d, "Common Expense", expense.id, cash.id, 15000.0)
        _create_simple_entry(d, "Gunu Expense", expense.id, cash.id, 1000.0)
        _create_simple_entry(d, "Guchi Expense", expense.id, cash.id, 2000.0)
        _create_simple_entry(d, "Income Entry", cash.id, income.id, 50000.0)
        db.session.commit()

        client = app.test_client()
        settings_resp = client.post(
            "/budget/monthly/settings",
            json={
                "month": "2026-01",
                "budget_amount": 20000,
                "guchi_opening_balance": 100,
                "gunu_opening_balance": 200
            }
        )
        assert settings_resp.status_code == 200

        jan_report = client.get("/budget/monthly?month=2026-01")
        assert jan_report.status_code == 200
        jan_payload = jan_report.get_json()
        assert jan_payload is not None

        entries = jan_payload["entries"]
        entry_by_desc = {entry["description"]: entry for entry in entries}

        assign_common = client.post(
            "/budget/monthly/assign-owner",
            json={"month": "2026-01", "journal_entry_id": entry_by_desc["Common Expense"]["entry_id"], "owner": "None"}
        )
        assign_gunu = client.post(
            "/budget/monthly/assign-owner",
            json={"month": "2026-01", "journal_entry_id": entry_by_desc["Gunu Expense"]["entry_id"], "owner": "Gunu"}
        )
        assign_guchi = client.post(
            "/budget/monthly/assign-owner",
            json={"month": "2026-01", "journal_entry_id": entry_by_desc["Guchi Expense"]["entry_id"], "owner": "Guchi"}
        )
        assert assign_common.status_code == 200
        assert assign_gunu.status_code == 200
        assert assign_guchi.status_code == 200

        jan_report = client.get("/budget/monthly?month=2026-01")
        jan_payload = jan_report.get_json()
        summary = jan_payload["summary"]
        assert summary["total_expense"] == 18000.0
        assert summary["common_spent"] == 15000.0
        assert summary["gunu_expense"] == 1000.0
        assert summary["guchi_expense"] == 2000.0
        assert summary["remaining_budget"] == 2000.0
        assert summary["discretionary_pool"] == 5000.0
        assert summary["remaining_shared"] == 2000.0
        assert summary["gunu_remaining_power"] == 1000.0
        assert summary["guchi_remaining_power"] == 1000.0
        assert summary["guchi_final_available"] == 1100.0
        assert summary["gunu_final_available"] == 1200.0

        feb_report = client.get("/budget/monthly?month=2026-02")
        assert feb_report.status_code == 200
        feb_payload = feb_report.get_json()
        assert feb_payload["budget"]["guchi_opening_balance"] == 1100.0
        assert feb_payload["budget"]["gunu_opening_balance"] == 1200.0
