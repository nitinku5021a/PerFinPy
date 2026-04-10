import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db


def test_trade_journal_setup_and_month_payload():
    app = create_app()
    with app.app_context():
        db_path = os.path.join(os.getcwd(), "accounting.db")
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        client = app.test_client()

        setup_one_resp = client.post(
            "/trade-journal/setups",
            json={"name": "Opening Range Breakout", "start_date": "2026-03-20"},
        )
        assert setup_one_resp.status_code == 200
        setup_one = setup_one_resp.get_json()["setup"]

        setup_two_resp = client.post(
            "/trade-journal/setups",
            json={"name": "Swing Pullback", "start_date": "2026-04-01"},
        )
        assert setup_two_resp.status_code == 200
        setup_two = setup_two_resp.get_json()["setup"]

        duplicate_resp = client.post(
            "/trade-journal/setups",
            json={"name": "opening range breakout", "start_date": "2026-04-01"},
        )
        assert duplicate_resp.status_code == 400

        march_entry_resp = client.post(
            "/trade-journal/entries",
            json={
                "setup_id": setup_one["id"],
                "trade_date": "2026-03-25",
                "capital_deployed": 100000,
                "pnl_amount": 1200,
                "comment": "First ORB winner",
            },
        )
        assert march_entry_resp.status_code == 200

        april_entry_resp = client.post(
            "/trade-journal/entries",
            json={
                "setup_id": setup_one["id"],
                "trade_date": "2026-04-10",
                "capital_deployed": 125000,
                "pnl_amount": -800,
                "comment": "ORB gave back gains",
            },
        )
        assert april_entry_resp.status_code == 200

        swing_entry_resp = client.post(
            "/trade-journal/entries",
            json={
                "setup_id": setup_two["id"],
                "trade_date": "2026-04-11",
                "capital_deployed": 200000,
                "pnl_amount": 3500,
                "comment": "Trend continuation",
            },
        )
        assert swing_entry_resp.status_code == 200

        duplicate_day_resp = client.post(
            "/trade-journal/entries",
            json={
                "setup_id": setup_two["id"],
                "trade_date": "2026-04-11",
                "capital_deployed": 210000,
                "pnl_amount": 500,
                "comment": "Duplicate day",
            },
        )
        assert duplicate_day_resp.status_code == 400

        report_resp = client.get("/trade-journal/?month=2026-04")
        assert report_resp.status_code == 200
        payload = report_resp.get_json()
        assert payload is not None
        assert payload["month"] == "2026-04"
        assert payload["summary"]["setup_count"] == 2
        assert payload["summary"]["month_entry_count"] == 2
        assert payload["summary"]["month_total_pnl"] == 2700.0
        assert payload["summary"]["all_time_total_pnl"] == 3900.0

        setups_by_name = {item["name"]: item for item in payload["setups"]}

        orb = setups_by_name["Opening Range Breakout"]
        assert orb["last_capital_deployed"] == 125000.0
        assert orb["month_total_pnl"] == -800.0
        assert orb["all_time_total_pnl"] == 400.0
        assert len(orb["entries"]) == 1
        assert orb["entries"][0]["trade_date"] == "2026-04-10"

        swing = setups_by_name["Swing Pullback"]
        assert swing["last_capital_deployed"] == 200000.0
        assert swing["month_total_pnl"] == 3500.0
        assert swing["all_time_total_pnl"] == 3500.0
        assert len(swing["entries"]) == 1
        assert swing["entries"][0]["comment"] == "Trend continuation"
