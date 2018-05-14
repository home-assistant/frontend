#!/usr/bin/env python3
"""Download the latest Polymer v1 iconset for materialdesignicons.com."""
import os
import re
import sys
import urllib.request

GETTING_STARTED_URL = ('https://raw.githubusercontent.com/Templarian/'
                       'MaterialDesign/master/site/getting-started.savvy')
DOWNLOAD_LINK = re.compile(r'(/api/download/polymer/v1/([A-Z0-9-]{36}))')
START_ICONSET = '<iron-iconset-svg'

OUTPUT_BASE = 'hass_frontend'
ICONSET_OUTPUT = os.path.join(OUTPUT_BASE, 'mdi.html')


def get_text(url):
    with urllib.request.urlopen(url) as f:
        return f.read().decode('utf-8')


def get_remote_version():
    """Get current version and download link."""
    gs_page = get_text(GETTING_STARTED_URL)

    mdi_download = re.search(DOWNLOAD_LINK, gs_page)

    if not mdi_download:
        print("Unable to find download link")
        sys.exit()

    return 'https://materialdesignicons.com' + mdi_download.group(1)


def clean_component(source):
    """Clean component."""
    return source[source.index(START_ICONSET):].replace('iron-iconset-svg', 'ha-iconset-svg')


def write_component(source):
    """Write component."""
    with open(ICONSET_OUTPUT, 'w') as outp:
        print('Writing icons to', ICONSET_OUTPUT)
        outp.write(source)


def main():
    """Main section of the script."""
    # All scripts should have their current work dir set to project root
    if os.path.basename(os.getcwd()) == 'script':
        os.chdir('..')

    print("materialdesignicons.com icon updater")

    remote_url = get_remote_version()
    source = clean_component(get_text(remote_url))
    write_component(source)

    print('Updated to latest version')


if __name__ == '__main__':
    main()
