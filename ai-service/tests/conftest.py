import functools
import http.server
import os
import threading

import pytest

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


@pytest.fixture(scope="session")
def fixture_image_server():
    """Serves tests/fixtures/* over real HTTP on localhost, so tests can
    exercise the actual download -> decode -> inference pipeline end to
    end (load_image_from_url only accepts http/https URLs)."""
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=FIXTURES_DIR)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        server.shutdown()
        thread.join(timeout=5)
