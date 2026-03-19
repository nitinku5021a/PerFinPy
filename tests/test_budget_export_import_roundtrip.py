import io
import os
import sys
from datetime import date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db
from app.models import (
    Account,
    JournalEntry,
    TransactionLine,
    MonthlyBudget,
    BudgetEntryAssignment,
    GoalSetting,
    Goal
)
from app.services.transactions_service import export_transactions
from app.utils.excel_import import import_transactions_from_excel


def test_budget_export_import_roundtrip():
    app = create_app()
    with app.app_context():
        db_path = os.path.join(os.getcwd(), "accounting.db")
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        cash = Account(code="A1", name="Cash", account_type="Asset")
        expense = Account(code="E1", name="Food", account_type="Expense")
        db.session.add_all([cash, expense])
        db.session.commit()

        je = JournalEntry(entry_date=date(2026, 1, 5), description="Lunch")
        db.session.add(je)
        db.session.flush()
        db.session.add_all([
            TransactionLine(journal_entry_id=je.id, account_id=expense.id, line_type="DEBIT", amount=500.0, date=date(2026, 1, 5)),
            TransactionLine(journal_entry_id=je.id, account_id=cash.id, line_type="CREDIT", amount=500.0, date=date(2026, 1, 5))
        ])
        db.session.add(
            MonthlyBudget(
                month=date(2026, 1, 1),
                budget_amount=20000.0,
                guchi_opening_balance=100.0,
                gunu_opening_balance=200.0
            )
        )
        db.session.flush()
        db.session.add(BudgetEntryAssignment(month=date(2026, 1, 1), journal_entry_id=je.id, owner="Gunu"))
        db.session.add(GoalSetting(interest_rate=8.25))
        db.session.add(Goal(description="House", target_corpus=2500000.0, target_year=2032, current_corpus=500000.0))
        db.session.commit()

        stream = export_transactions("all")
        data = stream.read()
        assert len(data) > 100

        db.session.remove()
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        result = import_transactions_from_excel(io.BytesIO(data))
        assert result["success"] >= 1
        assert not result["errors"]

        mb = MonthlyBudget.query.filter_by(month=date(2026, 1, 1)).first()
        assert mb is not None
        assert mb.budget_amount == 20000.0
        assert mb.guchi_opening_balance == 100.0
        assert mb.gunu_opening_balance == 200.0

        assignment = BudgetEntryAssignment.query.first()
        assert assignment is not None
        assert assignment.month == date(2026, 1, 1)
        assert assignment.owner == "Gunu"

        settings = GoalSetting.query.order_by(GoalSetting.id.asc()).first()
        assert settings is not None
        assert settings.interest_rate == 8.25

        goal = Goal.query.filter_by(description="House").first()
        assert goal is not None
        assert goal.target_corpus == 2500000.0
        assert goal.target_year == 2032
        assert goal.current_corpus == 500000.0
