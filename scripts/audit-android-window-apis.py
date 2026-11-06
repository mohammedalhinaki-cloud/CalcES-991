#!/usr/bin/env python3
"""List window API references in dependency JARs; references are not runtime calls."""
import argparse
import io
import json
import struct
from pathlib import Path
from zipfile import ZipFile

TARGETS = {
    'android/view/Window': {'setStatusBarColor', 'setNavigationBarColor', 'setNavigationBarDividerColor', 'setStatusBarContrastEnforced', 'setNavigationBarContrastEnforced', 'setDecorFitsSystemWindows'},
    'android/view/View': {'setSystemUiVisibility', 'getSystemUiVisibility'},
    'android/view/WindowManager': {'getDefaultDisplay'},
    'android/view/Display': {'getRealSize', 'getRealMetrics', 'getMetrics'},
}


def references(data):
    stream = io.BytesIO(data)
    def read(n):
        value = stream.read(n)
        if len(value) != n:
            raise ValueError('Truncated Java class')
        return value
    def u16():
        return struct.unpack('>H', read(2))[0]
    if read(4) != b'\xca\xfe\xba\xbe':
        raise ValueError('Invalid Java class')
    read(4)
    pool = [None] * u16()
    i = 1
    while i < len(pool):
        tag = read(1)[0]
        if tag == 1:
            pool[i] = read(u16()).decode('utf-8', errors='replace')
        elif tag in (7, 8, 16, 19, 20):
            pool[i] = (tag, u16())
        elif tag in (9, 10, 11, 12, 17, 18):
            pool[i] = (tag, u16(), u16())
        elif tag in (3, 4):
            read(4)
        elif tag in (5, 6):
            read(8)
            i += 1
        elif tag == 15:
            read(3)
        else:
            raise ValueError(f'Unknown constant-pool tag {tag}')
        i += 1
    found = set()
    for item in pool:
        if not isinstance(item, tuple) or item[0] not in (10, 11):
            continue
        owner = pool[pool[item[1]][1]]
        name = pool[pool[item[2]][1]]
        if name in TARGETS.get(owner, set()):
            found.add(owner.replace('/', '.') + '#' + name)
    return sorted(found)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--jar', type=Path, action='append', required=True)
    args = parser.parse_args()
    findings = []
    for jar in args.jar:
        with ZipFile(jar) as archive:
            for name in archive.namelist():
                if name.endswith('.class'):
                    refs = references(archive.read(name))
                    if refs:
                        findings.append({'jar': jar.name, 'class': name[:-6].replace('/', '.'), 'references': refs})
    print(json.dumps(findings, indent=2))


if __name__ == '__main__':
    main()
