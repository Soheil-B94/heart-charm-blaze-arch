#!/usr/bin/env python3
"""Meridian atlas — Python version. Uses only the Python standard library.

From the project folder:

    python python/meridian.py

On Windows, if `python` is not found:

    py python\\meridian.py

Then open http://127.0.0.1:8000
Stop the server with Ctrl+C.
"""

import argparse
import os
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
PORT = 8000


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, format, *args):
        return


def main():
    parser = argparse.ArgumentParser(description="Run the Meridian atlas.")
    parser.add_argument("--no-open", action="store_true", help="do not open a browser")
    parser.add_argument("--port", type=int, default=PORT)
    args = parser.parse_args()

    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError as exc:
        print(f"Could not start on port {args.port}: {exc}", file=sys.stderr)
        print("Close the other program using that port, or run: python python/meridian.py --port 8001")
        return 1

    url = f"http://127.0.0.1:{args.port}"
    print(f"Meridian is running at {url}")
    print("Press Ctrl+C to stop.")
    if not args.no_open:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
