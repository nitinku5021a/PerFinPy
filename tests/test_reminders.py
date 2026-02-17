import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, db


def test_reminders_monthly_generation_and_actions():
    app = create_app()
    with app.app_context():
        db_path = os.path.join(os.getcwd(), "accounting.db")
        if os.path.exists(db_path):
            os.remove(db_path)
        db.create_all()

        client = app.test_client()

        create_resp = client.post(
            "/reminders/tasks",
            json={
                "title": "Electricity bill",
                "notes": "Pay online",
                "due_day_of_month": 31,
            },
        )
        assert create_resp.status_code == 200

        feb_resp = client.get("/reminders/monthly?month=2026-02")
        assert feb_resp.status_code == 200
        feb_payload = feb_resp.get_json()
        assert feb_payload is not None
        assert feb_payload["month"] == "2026-02"
        assert len(feb_payload["reminders"]) == 1

        item = feb_payload["reminders"][0]
        assert item["title"] == "Electricity bill"
        assert item["due_date"] == "2026-02-28"
        assert item["is_done"] is False

        done_resp = client.post(
            f"/reminders/occurrences/{item['occurrence_id']}/done",
            json={"is_done": True},
        )
        assert done_resp.status_code == 200

        feb_after_done = client.get("/reminders/monthly?month=2026-02").get_json()
        assert feb_after_done["reminders"][0]["is_done"] is True

        remove_resp = client.delete(f"/reminders/occurrences/{item['occurrence_id']}")
        assert remove_resp.status_code == 200

        feb_after_remove = client.get("/reminders/monthly?month=2026-02").get_json()
        assert feb_after_remove["reminders"] == []

        create_resp2 = client.post(
            "/reminders/tasks",
            json={
                "title": "Credit card bill",
                "notes": "Before statement due",
                "due_day_of_month": 5,
            },
        )
        assert create_resp2.status_code == 200
        task_id = create_resp2.get_json()["task_id"]

        delete_task_resp = client.delete(f"/reminders/tasks/{task_id}")
        assert delete_task_resp.status_code == 200

        mar_payload = client.get("/reminders/monthly?month=2026-03").get_json()
        titles = [row["title"] for row in mar_payload["reminders"]]
        assert "Credit card bill" not in titles
