#!/usr/bin/env python3
"""Inspect actual release DEX declarations/annotations and packaged web assets.

This is an artifact check, not a substitute for running the minified app on
Android. It never reads signing properties or private keys.
"""
import argparse
import hashlib
import json
import re
import struct
from pathlib import Path
from zipfile import ZipFile


def dex_classes(data):
    if not data.startswith(b'dex\n'):
        raise ValueError('Expected standard Android DEX')

    def u32(offset):
        return struct.unpack_from('<I', data, offset)[0]

    def uleb(offset):
        value = shift = 0
        while True:
            byte = data[offset]
            offset += 1
            value |= (byte & 127) << shift
            if byte < 128:
                return value, offset
            shift += 7
            if shift > 35:
                raise ValueError('Invalid DEX variable integer')

    strings = []
    for i in range(u32(56)):
        offset = u32(u32(60) + i * 4)
        _, offset = uleb(offset)
        strings.append(data[offset:data.index(b'\0', offset)].decode('utf-8', errors='replace'))
    types = [strings[u32(u32(68) + i * 4)] for i in range(u32(64))]
    methods = []
    for i in range(u32(88)):
        cls, _, name = struct.unpack_from('<HHI', data, u32(92) + i * 8)
        methods.append((types[cls], strings[name]))

    def annotations(offset):
        result = set()
        if offset:
            for i in range(u32(offset)):
                item = u32(offset + 4 + i * 4)
                annotation_type, _ = uleb(item + 1)
                if data[item] == 1:  # runtime-visible annotations only
                    result.add(types[annotation_type])
        return result

    result = {}
    for i in range(u32(96)):
        offset = u32(100) + i * 32
        name = types[u32(offset)]
        annotation_directory = u32(offset + 20)
        class_annotations, method_annotations = set(), {}
        if annotation_directory:
            class_annotations = annotations(u32(annotation_directory))
            field_count = u32(annotation_directory + 4)
            method_count = u32(annotation_directory + 8)
            cursor = annotation_directory + 16 + field_count * 8
            for j in range(method_count):
                idx, annotation_set = struct.unpack_from('<II', data, cursor + j * 8)
                method_annotations[idx] = annotations(annotation_set)
        declared = {}
        cursor = u32(offset + 24)
        if cursor:
            counts = []
            for _ in range(4):
                count, cursor = uleb(cursor)
                counts.append(count)
            for _ in range(counts[0] + counts[1]):
                _, cursor = uleb(cursor)
                _, cursor = uleb(cursor)
            for count in counts[2:]:
                idx = 0
                for _ in range(count):
                    delta, cursor = uleb(cursor)
                    idx += delta
                    flags, cursor = uleb(cursor)
                    _, cursor = uleb(cursor)
                    cls, method = methods[idx]
                    if cls != name:
                        raise ValueError('DEX declaration has a mismatched class')
                    declared[method] = (flags, method_annotations.get(idx, set()))
        result[name] = {'annotations': class_annotations, 'methods': declared}
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--mapping', type=Path, required=True)
    args = parser.parse_args()
    mapping = {}
    for line in args.mapping.read_text().splitlines():
        match = re.fullmatch(r'(\S+) -> (\S+):', line)
        if match:
            mapping[match[1]] = match[2]

    def descriptor(name):
        return 'L' + mapping.get(name, name).replace('.', '/') + ';'

    with ZipFile(args.baseline) as baseline, ZipFile(args.bundle) as bundle:
        dex_paths = [n for n in bundle.namelist() if n.startswith('base/dex/') and n.endswith('.dex')]
        classes = {}
        for name in dex_paths:
            classes.update(dex_classes(bundle.read(name)))
        embedded_mapping = 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map'
        assert embedded_mapping in bundle.namelist(), 'Bundle is missing its R8 mapping'
        assert bundle.read(embedded_mapping) == args.mapping.read_bytes(), 'Embedded R8 mapping mismatch'
        before_assets = {n: hashlib.sha256(baseline.read(n)).digest() for n in baseline.namelist() if n.startswith('base/assets/') and not n.endswith('/')}
        after_assets = {n: hashlib.sha256(bundle.read(n)).digest() for n in bundle.namelist() if n.startswith('base/assets/') and not n.endswith('/')}
        assert before_assets == after_assets, 'Packaged web/Capacitor assets changed'

        bridge = {
            'com.getcapacitor.MessageHandler': ['postMessage'],
            'com.getcapacitor.plugin.CapacitorHttp': ['isEnabled'],
            'com.getcapacitor.plugin.CapacitorCookies': ['isEnabled', 'setCookie'],
        }
        checks = 0
        for cls, names in bridge.items():
            methods = classes[descriptor(cls)]['methods']
            for name in names:
                flags, annotations = methods[name]
                assert flags & 1, f'{cls}.{name} is no longer public'
                assert 'Landroid/webkit/JavascriptInterface;' in annotations, f'{cls}.{name} lost its JS annotation'
                checks += 1

        plugins = json.loads(bundle.read('base/assets/capacitor.plugins.json'))
        for plugin in plugins:
            name = plugin['classpath']
            assert 'L' + name.replace('.', '/') + ';' in classes, f'Reflectively loaded plugin was renamed: {name}'
        for cls, names in {
            'calces991.calculator.AppConfigurationPlugin': ['getConfiguration', 'openStore'],
            'com.capacitorjs.plugins.share.SharePlugin': ['share', 'canShare'],
        }.items():
            item = classes[descriptor(cls)]
            assert descriptor('com.getcapacitor.annotation.CapacitorPlugin') in item['annotations']
            for name in names:
                flags, annotations = item['methods'][name]
                assert flags & 1 and descriptor('com.getcapacitor.PluginMethod') in annotations
                checks += 1
        before_dex = [n for n in baseline.namelist() if n.startswith('base/dex/') and n.endswith('.dex')]
        before_bytes = sum(baseline.getinfo(n).file_size for n in before_dex)
        after_bytes = sum(bundle.getinfo(n).file_size for n in dex_paths)
        print(json.dumps({
            'baseline_dex_files': len(before_dex), 'optimized_dex_files': len(dex_paths),
            'baseline_dex_bytes': before_bytes, 'optimized_dex_bytes': after_bytes,
            'dex_reduction_percent': round(100 * (1 - after_bytes / before_bytes), 2),
            'unchanged_asset_files': len(after_assets), 'verified_bridge_methods': checks,
            'reflective_plugins': [p['classpath'] for p in plugins], 'embedded_mapping_matches': True,
        }, indent=2))


if __name__ == '__main__':
    main()
