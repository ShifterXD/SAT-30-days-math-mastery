#!/usr/bin/env python3
"""Crop oversized Day 1 PNG screenshots and wrap long Day 2 SVG text.

Uses only Python stdlib so it works in the lean Hermes/VPS environment.
"""
from __future__ import annotations

import html
import re
import struct
import zlib
from pathlib import Path
from textwrap import wrap

ROOT = Path(__file__).resolve().parents[1]
DAY1 = ROOT / 'public' / 'day-assets' / 'day-1'
DAY2 = ROOT / 'public' / 'day-assets' / 'day-2'

PNG_SIG = b'\x89PNG\r\n\x1a\n'


def read_png(path: Path):
    data = path.read_bytes()
    if not data.startswith(PNG_SIG):
        raise ValueError(f'{path} is not a PNG')
    pos = len(PNG_SIG)
    width = height = color_type = bit_depth = None
    idat = bytearray()
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        ctype = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if ctype == b'IHDR':
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack('>IIBBBBB', chunk)
            if bit_depth != 8 or compression != 0 or filter_method != 0 or interlace != 0:
                raise ValueError(f'Unsupported PNG format for {path}')
            if color_type not in (2, 6):
                raise ValueError(f'Unsupported color type {color_type} for {path}')
        elif ctype == b'IDAT':
            idat.extend(chunk)
        elif ctype == b'IEND':
            break
    channels = 4 if color_type == 6 else 3
    raw = zlib.decompress(bytes(idat))
    stride = width * channels
    rows = []
    prev = [0] * stride
    i = 0
    for _ in range(height):
        filter_type = raw[i]
        i += 1
        scan = list(raw[i:i + stride])
        i += stride
        recon = [0] * stride
        for x, val in enumerate(scan):
            left = recon[x - channels] if x >= channels else 0
            up = prev[x]
            up_left = prev[x - channels] if x >= channels else 0
            if filter_type == 0:
                pred = 0
            elif filter_type == 1:
                pred = left
            elif filter_type == 2:
                pred = up
            elif filter_type == 3:
                pred = (left + up) // 2
            elif filter_type == 4:
                p = left + up - up_left
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - up_left)
                pred = left if pa <= pb and pa <= pc else up if pb <= pc else up_left
            else:
                raise ValueError(f'Unsupported filter {filter_type}')
            recon[x] = (val + pred) & 255
        rows.append(recon)
        prev = recon
    return width, height, color_type, channels, rows


def write_png(path: Path, width: int, height: int, color_type: int, channels: int, rows: list[list[int]]):
    def chunk(ctype: bytes, payload: bytes) -> bytes:
        return struct.pack('>I', len(payload)) + ctype + payload + struct.pack('>I', zlib.crc32(ctype + payload) & 0xFFFFFFFF)

    raw = bytearray()
    for row in rows:
        raw.append(0)  # no filter
        raw.extend(row)
    ihdr = struct.pack('>IIBBBBB', width, height, 8, color_type, 0, 0, 0)
    path.write_bytes(PNG_SIG + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b''))


def crop_day1_png(path: Path, margin: int = 28):
    width, height, color_type, channels, rows = read_png(path)
    # Treat almost-white pixels as background; keep dark text/lines and light blue UI details.
    xs, ys = [], []
    for y, row in enumerate(rows):
        for x in range(width):
            base = x * channels
            r, g, b = row[base], row[base + 1], row[base + 2]
            a = row[base + 3] if channels == 4 else 255
            if a > 10 and not (r >= 248 and g >= 248 and b >= 248):
                xs.append(x)
                ys.append(y)
    if not xs:
        return False, (width, height), (width, height)
    left = max(0, min(xs) - margin)
    right = min(width - 1, max(xs) + margin)
    top = max(0, min(ys) - margin)
    bottom = min(height - 1, max(ys) + margin)
    new_w = right - left + 1
    new_h = bottom - top + 1
    if new_w >= width - 4 and new_h >= height - 4:
        return False, (width, height), (new_w, new_h)
    cropped = [row[left * channels:(right + 1) * channels] for row in rows[top:bottom + 1]]
    write_png(path, new_w, new_h, color_type, channels, cropped)
    return True, (width, height), (new_w, new_h)


def wrap_svg_text(text: str, max_chars: int = 72) -> list[str]:
    return wrap(text, width=max_chars, break_long_words=False, break_on_hyphens=False) or ['']


def fix_svg(path: Path) -> bool:
    original = path.read_text()
    # Rebuild each normal text element as multi-line tspans when it would overflow the card.
    pattern = re.compile(r'<text\b([^>]*)>([^<]+)</text>')

    def repl(match: re.Match[str]) -> str:
        attrs, raw_text = match.group(1), html.unescape(match.group(2))
        x_match = re.search(r'\bx="([\d.]+)"', attrs)
        fs_match = re.search(r'font-size="([\d.]+)"', attrs)
        x = float(x_match.group(1)) if x_match else 0
        fs = float(fs_match.group(1)) if fs_match else 16
        est_width = len(raw_text) * fs * 0.52
        if x + est_width <= 1030:
            return match.group(0)
        lines = wrap_svg_text(raw_text)
        escaped = [html.escape(line, quote=False) for line in lines]
        x_value = x_match.group(1) if x_match else '0'
        tspans = ''.join(
            f'<tspan x="{x_value}" dy="{0 if i == 0 else 32}">{line}</tspan>'
            for i, line in enumerate(escaped)
        )
        return f'<text{attrs}>{tspans}</text>'

    fixed = pattern.sub(repl, original)
    if fixed != original:
        path.write_text(fixed)
        return True
    return False


def main():
    for path in sorted(DAY1.glob('q*.png')):
        changed, before, after = crop_day1_png(path)
        if changed:
            print(f'cropped {path.relative_to(ROOT)}: {before[0]}x{before[1]} -> {after[0]}x{after[1]}')
    for path in sorted(DAY2.glob('q*.svg')):
        if fix_svg(path):
            print(f'wrapped {path.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
