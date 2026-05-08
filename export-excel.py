import argparse
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path


DEFAULT_BACKUP_DIR = Path.home() / "PerFinPyBackups"


def load_dotenv(path):
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def parse_args():
    parser = argparse.ArgumentParser(description="Export PerFinPy data to an Excel backup.")
    parser.add_argument("backup_dir", nargs="?", help="Directory where Excel backups are stored.")
    parser.add_argument("keep_latest", nargs="?", type=int, help="Number of latest backups to keep.")
    parser.add_argument(
        "--source-url",
        default=os.environ.get("PERFINPY_EXPORT_URL"),
        help=(
            "Remote export URL, for example "
            "http://perfinpy-oracle:5173/api/transactions/export?period=all"
        ),
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=int(os.environ.get("PERFINPY_EXPORT_RETRIES", "12")),
        help="Remote download attempts before failing.",
    )
    parser.add_argument(
        "--retry-delay",
        type=int,
        default=int(os.environ.get("PERFINPY_EXPORT_RETRY_DELAY", "10")),
        help="Seconds to wait between remote download attempts.",
    )
    return parser.parse_args()


def export_local():
    from app import create_app
    from app.services import transactions_service

    app = create_app()
    with app.app_context():
        stream = transactions_service.export_transactions("all")
        return stream.read()


def export_remote(source_url, retries, retry_delay):
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            request = urllib.request.Request(source_url, headers={"User-Agent": "PerFinPyBackup/1.0"})
            with urllib.request.urlopen(request, timeout=60) as response:
                if response.status >= 400:
                    raise RuntimeError(f"HTTP {response.status} from {source_url}")
                return response.read()
        except (OSError, urllib.error.URLError, RuntimeError) as exc:
            last_error = exc
            if attempt >= retries:
                break
            print(
                f"==> Remote export attempt {attempt}/{retries} failed: {exc}. "
                f"Retrying in {retry_delay}s...",
                flush=True,
            )
            time.sleep(retry_delay)
    raise RuntimeError(f"Remote export failed after {retries} attempts: {last_error}")


def prune_old_exports(backup_dir, keep_latest):
    files = [
        path
        for path in backup_dir.iterdir()
        if path.name.startswith("PerFinPy-Transactions-") and path.suffix.lower() == ".xlsx"
    ]
    files.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    for old in files[keep_latest:]:
        try:
            old.unlink()
        except OSError:
            pass


def main():
    load_dotenv(Path(__file__).resolve().parent / ".env")
    args = parse_args()

    backup_dir = Path(
        args.backup_dir
        or os.environ.get("PERFINPY_BACKUP_DIR")
        or os.environ.get("BACKUP_DIR")
        or DEFAULT_BACKUP_DIR
    ).expanduser()
    keep_latest = args.keep_latest or int(os.environ.get("PERFINPY_BACKUP_KEEP_LATEST", "5"))
    backup_dir.mkdir(parents=True, exist_ok=True)

    if args.source_url:
        print(f"==> Exporting from remote PerFinPy URL: {args.source_url}", flush=True)
        content = export_remote(args.source_url, args.retries, args.retry_delay)
    else:
        print("==> Exporting from local PerFinPy database", flush=True)
        content = export_local()

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_path = backup_dir / f"PerFinPy-Transactions-{timestamp}.xlsx"
    out_path.write_bytes(content)

    prune_old_exports(backup_dir, keep_latest)

    print(f"==> Export created: {out_path}")
    print(f"==> Kept latest {keep_latest} exports in {backup_dir}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
