import os
import sys
from datetime import datetime

from app import create_app
from app.services import transactions_service

DEFAULT_BACKUP_DIR = r"G:\My Drive\Personal Finance\PerFin_2025_26\PerFin_Backup"


def main():
    backup_dir = DEFAULT_BACKUP_DIR
    keep_latest = 5

    if len(sys.argv) > 1 and sys.argv[1]:
        backup_dir = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2]:
        try:
            keep_latest = int(sys.argv[2])
        except ValueError:
            keep_latest = 5

    os.makedirs(backup_dir, exist_ok=True)

    app = create_app()
    with app.app_context():
        stream = transactions_service.export_transactions("all")
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        out_path = os.path.join(backup_dir, f"PerFinPy-Transactions-{timestamp}.xlsx")
        with open(out_path, "wb") as f:
            f.write(stream.read())

    files = [
        os.path.join(backup_dir, f)
        for f in os.listdir(backup_dir)
        if f.startswith("PerFinPy-Transactions-") and f.lower().endswith(".xlsx")
    ]
    files.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    for old in files[keep_latest:]:
        try:
            os.remove(old)
        except OSError:
            pass

    print(f"==> Export created: {out_path}")
    print(f"==> Kept latest {keep_latest} exports in {backup_dir}")


if __name__ == "__main__":
    main()
