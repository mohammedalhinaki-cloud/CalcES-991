#!/usr/bin/env python3
"""Read root manifest attributes directly from AAPT2 protobuf in an AAB."""
import argparse
import json
from zipfile import ZipFile


def fields(data):
    pos = 0
    def varint():
        nonlocal pos
        result = shift = 0
        while True:
            byte = data[pos]
            pos += 1
            result |= (byte & 127) << shift
            if byte < 128:
                return result
            shift += 7
    while pos < len(data):
        tag = varint()
        number, wire = tag >> 3, tag & 7
        if wire == 0:
            value = varint()
        elif wire == 2:
            size = varint()
            value = data[pos:pos + size]
            pos += size
        elif wire in (1, 5):
            size = 8 if wire == 1 else 4
            value = data[pos:pos + size]
            pos += size
        else:
            raise ValueError(f'Unsupported protobuf wire type {wire}')
        yield number, value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('bundle')
    parser.add_argument('--code', required=True)
    parser.add_argument('--name', required=True)
    parser.add_argument('--package', default='calces991.calculator')
    args = parser.parse_args()
    with ZipFile(args.bundle) as bundle:
        node = bundle.read('base/manifest/AndroidManifest.xml')
    element = next(value for number, value in fields(node) if number == 1)
    attributes = {}
    for number, value in fields(element):
        if number == 4:
            attribute = dict(fields(value))
            attributes[attribute[2].decode()] = attribute.get(3, b'').decode()
    for key, expected in [('package', args.package), ('versionCode', args.code), ('versionName', args.name)]:
        if attributes.get(key) != expected:
            raise SystemExit(f'{key}: expected {expected!r}, got {attributes.get(key)!r}')
    print(json.dumps({key: attributes[key] for key in ('package', 'versionCode', 'versionName')}, indent=2))


if __name__ == '__main__':
    main()
