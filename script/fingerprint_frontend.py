#!/usr/bin/env python3
"""Generate a file with all md5 hashes of the assets."""

from collections import OrderedDict
import glob
import hashlib
import json

fingerprint_file = './hass_frontend/__init__.py'
base_dir = 'hass_frontend/'


def fingerprint():
    """Fingerprint the frontend files."""
    files = (glob.glob(base_dir + '**/*.html') +
             glob.glob(base_dir + '*.html') +
             glob.glob(base_dir + 'core.js') +
             glob.glob(base_dir + 'compatibility.js'))

    md5s = OrderedDict()

    for fil in sorted(files):
        name = fil[len(base_dir):]
        with open(fil) as fp:
            md5 = hashlib.md5(fp.read().encode('utf-8')).hexdigest()
        md5s[name] = md5

    template = "FINGERPRINTS = {}\n"
    result = template.format(json.dumps(md5s, indent=4))

    with open(fingerprint_file, 'at') as fp:
        fp.write(result)


if __name__ == '__main__':
    fingerprint()
