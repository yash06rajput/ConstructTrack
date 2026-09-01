import time
from contextlib import contextmanager


@contextmanager
def timer_ms():
    """Context manager yielding a callable that returns elapsed ms so far."""
    start = time.perf_counter()
    yield lambda: int((time.perf_counter() - start) * 1000)
