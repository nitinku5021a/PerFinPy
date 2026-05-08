import argparse
import os
import platform
import socket
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
VENV = ROOT / "venv"


def load_dotenv(path):
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def venv_python():
    if platform.system() == "Windows":
        return VENV / "Scripts" / "python.exe"
    return VENV / "bin" / "python"


def run(args, cwd=ROOT, env=None):
    subprocess.run(args, cwd=cwd, env=env, check=True)


def ensure_venv():
    python = venv_python()
    if not python.exists():
        print("==> Creating Python virtual environment", flush=True)
        run([sys.executable, "-m", "venv", str(VENV)])
    return python


def normalize_probe_host(host):
    if host in ("0.0.0.0", "::", "[::]"):
        return "127.0.0.1"
    return host


def port_is_in_use(host, port):
    probe_host = normalize_probe_host(host)
    try:
        with socket.create_connection((probe_host, int(port)), timeout=0.5):
            return True
    except OSError:
        return False


def choose_port(host, preferred, alternates):
    for port in [preferred, *alternates]:
        if not port_is_in_use(host, port):
            return str(port)
    raise RuntimeError(f"No free port found for {host}; tried {preferred}, {alternates}")


def terminate(process):
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def parse_args():
    parser = argparse.ArgumentParser(description="Run PerFinPy production backend and frontend.")
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help="Skip pip/npm dependency installation.",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Skip frontend build before starting services.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    load_dotenv(ROOT / ".env")

    print("==> PerFinPy production boot", flush=True)
    python = ensure_venv()

    if not args.skip_install:
        print("==> Installing backend dependencies", flush=True)
        run([str(python), "-m", "pip", "install", "-r", str(ROOT / "requirements.txt")])

    print("==> Initializing database (create tables if needed)", flush=True)
    run([str(python), "-c", "from app import create_app; create_app()"])

    if not args.skip_install:
        print("==> Installing frontend dependencies", flush=True)
        run(["npm", "install"], cwd=FRONTEND)

    if not args.skip_build:
        print("==> Building frontend", flush=True)
        run(["npm", "run", "build"], cwd=FRONTEND)

    is_windows = platform.system() == "Windows"
    backend_host = os.environ.get("BACKEND_HOST", "0.0.0.0")
    frontend_host = os.environ.get("FRONTEND_HOST", "0.0.0.0")
    backend_default = "8001" if is_windows else "8000"
    backend_port = choose_port(
        backend_host,
        os.environ.get("BACKEND_PORT", backend_default),
        ["8002", "8003"],
    )
    frontend_port = choose_port(
        frontend_host,
        os.environ.get("FRONTEND_PORT", "5173"),
        ["5174", "5175"],
    )

    os.environ.setdefault("API_BASE_URL", f"http://127.0.0.1:{backend_port}")
    frontend_env = os.environ.copy()
    frontend_env.update(
        {
            "NODE_ENV": "production",
            "HOST": frontend_host,
            "PORT": frontend_port,
            "BACKEND_HOST": backend_host,
            "BACKEND_PORT": backend_port,
            "API_BASE_URL": os.environ["API_BASE_URL"],
        }
    )

    if is_windows:
        backend_args = [
            str(python),
            "-m",
            "waitress",
            f"--host={backend_host}",
            f"--port={backend_port}",
            "wsgi:app",
        ]
    else:
        backend_args = [
            str(python),
            "-m",
            "gunicorn",
            "wsgi:app",
            "--bind",
            f"{backend_host}:{backend_port}",
            "--workers",
            os.environ.get("GUNICORN_WORKERS", "3"),
            "--timeout",
            os.environ.get("GUNICORN_TIMEOUT", "300"),
        ]

    print("==> Starting backend in background and frontend in foreground", flush=True)
    print(f"Backend:  http://{backend_host}:{backend_port}", flush=True)
    print(f"Frontend: http://{frontend_host}:{frontend_port}", flush=True)
    print(f"API Base: {os.environ['API_BASE_URL']}", flush=True)
    print("Press Ctrl+C to stop.", flush=True)

    backend = subprocess.Popen(backend_args, cwd=ROOT, env=os.environ.copy())
    try:
        run(["node", "build"], cwd=FRONTEND, env=frontend_env)
    finally:
        terminate(backend)


if __name__ == "__main__":
    main()
