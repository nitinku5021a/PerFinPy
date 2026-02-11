import os
import sys
from datetime import date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db
from app.models import Account, DailyAccountBalance


def test_expense_income_asset_report_grouping():
    app = create_app()
    with app.app_context():
        db_path = os.path.join(os.getcwd(), "accounting.db")
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        income = Account(code="I1", name="Salary", account_type="Income")
        expense = Account(code="E1", name="Rent", account_type="Expense")
        asset = Account(code="A1", name="Bank", account_type="Asset", opening_balance=10000.0)
        db.session.add_all([income, expense, asset])
        db.session.commit()

        rows = [
            DailyAccountBalance(date=date(2023, 12, 31), account_id=income.id, balance=-700.0),
            DailyAccountBalance(date=date(2023, 12, 31), account_id=expense.id, balance=200.0),
            DailyAccountBalance(date=date(2023, 12, 31), account_id=asset.id, balance=3000.0),
            DailyAccountBalance(date=date(2024, 1, 31), account_id=income.id, balance=-1000.0),
            DailyAccountBalance(date=date(2024, 1, 31), account_id=expense.id, balance=400.0),
            DailyAccountBalance(date=date(2024, 1, 31), account_id=asset.id, balance=5000.0),
            DailyAccountBalance(date=date(2024, 2, 29), account_id=income.id, balance=-1200.0),
            DailyAccountBalance(date=date(2024, 2, 29), account_id=expense.id, balance=600.0),
            DailyAccountBalance(date=date(2024, 2, 29), account_id=asset.id, balance=2000.0),
        ]
        db.session.add_all(rows)
        db.session.commit()

        client = app.test_client()
        resp = client.get("/reports/expense-income-asset")
        assert resp.status_code == 200

        payload = resp.get_json()
        assert payload is not None
        assert len(payload["months"]) == 3

        months = {row["month"]: row for row in payload["months"]}
        assert months["2023-12"]["sum_income"] == 700.0
        assert months["2023-12"]["sum_expense"] == -200.0
        assert months["2023-12"]["max_asset"] == 13000.0
        assert months["2023-12"]["rolling_avg_expense"] == -200.0
        assert months["2023-12"]["asset_mom_change_pct"] is None
        assert months["2023-12"]["asset_yoy_change_pct"] is None
        assert months["2024-01"]["max_asset"] == 18000.0
        assert months["2024-01"]["asset_mom_change_pct"] == (5000.0 / 13000.0) * 100.0
        assert months["2024-02"]["max_asset"] == 20000.0
        assert months["2024-02"]["asset_mom_change_pct"] == (2000.0 / 18000.0) * 100.0
        assert months["2024-02"]["rolling_avg_expense"] == -400.0

        years = {row["year"]: row for row in payload["years"]}
        assert years[2023]["sum_income"] == 700.0
        assert years[2023]["sum_expense"] == -200.0
        assert years[2023]["max_asset"] == 13000.0
        assert years[2023]["savings_pct_income"] == (500.0 / 700.0) * 100.0
        assert years[2023]["savings_pct_expense"] == (500.0 / 200.0) * 100.0
        assert years[2024]["sum_income"] == 2200.0
        assert years[2024]["sum_expense"] == -1000.0
        assert years[2024]["max_asset"] == 20000.0
        assert years[2024]["asset_yoy_change_pct"] == (7000.0 / 13000.0) * 100.0
