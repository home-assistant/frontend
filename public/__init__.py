"""Frontend for Home Assistant."""
import os
from user_agents import parse

FAMILY_MIN_VERSION = {
    'Chrome': 55,          # Async/await
    'Chrome Mobile': 55,
    'Firefox': 52,         # Async/await
    'Firefox Mobile': 52,
    'Opera': 42,           # Async/await
    'Edge': 15,            # Async/await
    'Safari': 10.1,        # Async/await
}


def where():
    """Return path to the frontend."""
    return os.path.dirname(__file__)


def version(useragent):
    """Get the version for given user agent."""
    useragent = parse(useragent)

    # on iOS every browser uses the Safari engine
    if useragent.os.family == 'iOS':
        return useragent.os.version[0] >= FAMILY_MIN_VERSION['Safari']

    version = FAMILY_MIN_VERSION.get(useragent.browser.family)
    return version and useragent.browser.version[0] >= version
