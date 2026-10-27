import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_master_slot_machine():
    src_path = '/Users/kitkat/.gemini/antigravity-ide/brain/85485cdb-d602-4a40-b72b-9a0dca3a3560/.user_uploaded/media_1791184409626.png'
    out_dir = '/Users/kitkat/development/slote_mecine/frontend/public/images/cabinet'
    os.makedirs(out_dir, exist_ok=True)
    
    src = Image.open(src_path).convert('RGBA')
    w, h = src.size # 460, 1024
    
    # 1. Base cabinet crop (y: 260 to 975 -> 460 x 715)
    cab = src.crop((0, 260, w, 975))
    cw, ch = cab.size
    
    # Create an overlay layer for high-end rendering
    overlay = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # ── 1. RED RIBBON JACKPOT COUNTER PLAQUE (x=124 to 324, y=96 to 136) ──
    rx1, ry1, rx2, ry2 = 124, 96, 324, 136
    # Rich crimson 3D gradient with curved bevel
    for y in range(ry1, ry2 + 1):
        t = (y - ry1) / float(ry2 - ry1)
        # Specular shine near top, rich dark velvet at bottom
        if t < 0.25:
            r = int(220 - t * 80)
            g = int(35 - t * 40)
            b = int(45 - t * 40)
        else:
            r = int(170 - (t - 0.25) * 90)
            g = int(18 - (t - 0.25) * 12)
            b = int(22 - (t - 0.25) * 12)
        draw.line([(rx1 + 2, y), (rx2 - 2, y)], fill=(r, g, b, 255))
    
    # Golden embossed top and bottom lines
    draw.line([(rx1 + 1, ry1), (rx2 - 1, ry1)], fill=(255, 230, 120, 255), width=2)
    draw.line([(rx1 + 1, ry2), (rx2 - 1, ry2)], fill=(180, 120, 20, 255), width=2)
    draw.line([(rx1, ry1), (rx1, ry2)], fill=(210, 160, 40, 255), width=2)
    draw.line([(rx2, ry1), (rx2, ry2)], fill=(210, 160, 40, 255), width=2)

    # ── 2. THREE MINI MULTIPLIER REEL BARRELS (3D Cylindrical Shading) ──
    # Reels: y from 138 to 204
    reels = [
        (133, 189),
        (194, 251),
        (256, 313)
    ]
    reely1, reely2 = 138, 204
    rh = reely2 - reely1
    
    for rx1, rx2 in reels:
        for y in range(reely1, reely2 + 1):
            t = (y - reely1) / float(rh)
            # Cylindrical light curve: dark top, bright reflection in upper-middle, metallic bottom
            angle = (t - 0.4) * math.pi
            val = math.cos(angle)
            lum = int(180 + val * 65)
            lum = max(110, min(250, lum))
            # slight lavender metallic tint
            r_c = min(255, int(lum * 0.95))
            g_c = min(255, int(lum * 0.92))
            b_c = min(255, int(lum * 1.05))
            draw.line([(rx1, y), (rx2, y)], fill=(r_c, g_c, b_c, 255))
        
        # Subtle reel edge shadows
        draw.line([(rx1, reely1), (rx1, reely2)], fill=(80, 70, 100, 200), width=1)
        draw.line([(rx2, reely1), (rx2, reely2)], fill=(60, 50, 80, 200), width=1)

    # ── 3. EIGHT 3D INSET FRUIT CELL TRAYS ──
    # Exact coordinates for 8 cells with full margin coverage:
    cells = [
        (44, 216, 162, 329),   # Row 0, Col 0 (Lemon)
        (166, 216, 284, 329),  # Row 0, Col 1 (Raspberry)
        (288, 216, 406, 329),  # Row 0, Col 2 (Kiwi)
        (44, 329, 162, 441),   # Row 1, Col 0 (Cherry)
        (288, 329, 406, 441),  # Row 1, Col 2 (Plum)
        (44, 441, 162, 554),   # Row 2, Col 0 (Watermelon)
        (166, 441, 284, 554),  # Row 2, Col 1 (Banana)
        (288, 441, 406, 554),  # Row 2, Col 2 (Strawberry)
    ]
    
    for cx1, cy1, cx2, cy2 in cells:
        cw_cell = cx2 - cx1
        ch_cell = cy2 - cy1
        midx = (cx1 + cx2) / 2.0
        midy = (cy1 + cy2) / 2.0
        max_dist = math.sqrt((cw_cell/2.0)**2 + (ch_cell/2.0)**2)
        
        # Inset radial velvet arcade tray: bright center #2b1156, dark rim #120426
        for y in range(cy1, cy2 + 1):
            for x in range(cx1, cx2 + 1):
                # distance from center
                dx = (x - midx) / (cw_cell / 2.0)
                dy = (y - midy) / (ch_cell / 2.0)
                d = math.sqrt(dx*dx + dy*dy)
                
                # radial falloff
                factor = min(1.0, d)
                # Center: (44, 18, 86) -> Rim: (16, 6, 36)
                r_val = int(44 - factor * 28)
                g_val = int(18 - factor * 12)
                b_val = int(86 - factor * 50)
                overlay.putpixel((x, y), (r_val, g_val, b_val, 255))
        
        # Draw smooth rounded double-bevel borders
        draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=16, outline=(120, 60, 190, 255), width=2)
        draw.rounded_rectangle([cx1 + 2, cy1 + 2, cx2 - 2, cy2 - 2], radius=14, outline=(40, 16, 75, 180), width=1)

    # ── 4. CENTER RED COUNTDOWN CLOCK SCREEN ──
    # Clock inner screen is inside the red dotted border: [174, 336, 276, 434]
    clock_x1, clock_y1, clock_x2, clock_y2 = 174, 336, 276, 434
    for y in range(clock_y1, clock_y2 + 1):
        t = (y - clock_y1) / float(clock_y2 - clock_y1)
        r = int(50 - t * 24)
        g = int(8 - t * 4)
        b = int(18 - t * 8)
        draw.line([(clock_x1, y), (clock_x2, y)], fill=(r, g, b, 255))
    draw.rounded_rectangle([clock_x1, clock_y1, clock_x2, clock_y2], radius=10, outline=(140, 20, 40, 255), width=1)

    # ── 5. MERGE OVERLAY WITH AUTHENTIC CABINET ──
    # Composite the crisp clean rendered overlays on top of the authentic cabinet
    final_cab = Image.alpha_composite(cab, overlay)
    
    # Save the master slot machine asset
    master_path = os.path.join(out_dir, 'slot_machine_base.png')
    final_cab.save(master_path, 'PNG', optimize=True)
    print(f'Master Slot Machine created at: {master_path} (Size: {final_cab.size})')

if __name__ == '__main__':
    create_master_slot_machine()
