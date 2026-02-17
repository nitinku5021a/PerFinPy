from app import create_app, db
from app.services.snapshots_service import backfill_snapshots


def main():
    app = create_app()
    with app.app_context():
        backfill_snapshots(db.session)
        print("Snapshot backfill complete.")


if __name__ == "__main__":
    main()
