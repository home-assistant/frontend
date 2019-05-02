"""Frontend for Home Assistant."""
from pathlib import Path


def where():
    """Return path to the frontend."""
    return Path(__file__).parent
