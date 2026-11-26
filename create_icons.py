import os
import zlib
import struct
import math

def make_png(width, height, pixel_func):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type 0 (None)
        for x in range(width):
            r, g, b, a = pixel_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw_data), 9)
    
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')
    return png

def monevhub_icon_pixel(x, y, w, h):
    # Normalized coordinates -1 to 1
    nx = (x / (w - 1)) * 2 - 1
    ny = (y / (h - 1)) * 2 - 1
    
    # Rounded squircle / box
    r_corner = 0.82
    p = 4.0
    dist = (abs(nx)**p + abs(ny)**p)**(1.0/p)
    
    if dist > 1.0:
        return 0, 0, 0, 0
    
    # Base background: deep royal navy gradient to cyan
    grad = (nx + ny + 2) / 4.0
    bg_r = int(24 + grad * 15)
    bg_g = int(64 + grad * 35)
    bg_b = int(180 + grad * 60)
    
    # Lightning bolt polygon approximation
    # Lightning shape: top-right to center to bottom-left
    # points: (0.1, -0.65), (-0.35, 0.05), (-0.05, 0.05), (-0.2, 0.65), (0.35, -0.05), (0.05, -0.05)
    # Simple signed distance to lightning segment
    is_bolt = False
    
    # Check if point is inside lightning
    # Upper triangle: (0.1, -0.65), (-0.35, 0.1), (0.05, 0.1)
    # Lower triangle: (-0.05, -0.1), (0.35, -0.1), (-0.2, 0.65)
    
    # Geometric test for lightning bolt
    # Segment 1: top sharp
    if -0.7 < ny < 0.1:
        left_bound = -0.35 + (ny - 0.1) * (-0.45 / -0.75)
        right_bound = 0.15 + (ny - 0.1) * (0.05 / -0.75)
        if left_bound <= nx <= right_bound:
            is_bolt = True
            
    if -0.1 < ny < 0.7:
        left_bound = -0.25 + (ny - 0.7) * (0.2 / -0.8)
        right_bound = 0.35 + (ny - 0.7) * (0.55 / -0.8)
        if left_bound <= nx <= right_bound:
            is_bolt = True

    if is_bolt:
        # Amber / Electric Gold with glowing edge
        return 251, 191, 36, 255
    
    # Border antialiasing
    alpha = 255
    if dist > r_corner:
        fade = (1.0 - dist) / (1.0 - r_corner)
        alpha = max(0, min(255, int(fade * 255)))
        
    return bg_r, bg_g, bg_b, alpha

os.makedirs('icons', exist_ok=True)
for size in [16, 48, 128]:
    data = make_png(size, size, monevhub_icon_pixel)
    with open(f'icons/icon{size}.png', 'wb') as f:
        f.write(data)
    print(f'Generated icons/icon{size}.png ({size}x{size})')
