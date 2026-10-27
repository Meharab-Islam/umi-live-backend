import os
import math
from PIL import Image, ImageDraw, ImageFilter

def build_perfect_clean_cabinet():
    src_path = '/Users/kitkat/.gemini/antigravity-ide/brain/85485cdb-d602-4a40-b72b-9a0dca3a3560/.user_uploaded/media_1791184409626.png'
    out_dir = '/Users/kitkat/development/slote_mecine/frontend/public/images/cabinet'
    os.makedirs(out_dir, exist_ok=True)
    
    src = Image.open(src_path).convert('RGBA')
    # Cabinet from y=248 to y=1004 (460 x 756)
    cab = src.crop((0, 248, 460, 1004))
    cw, ch = cab.size
    
    # Base image to edit
    base = cab.copy()
    
    # ═════════════════════════════════════════════════════════════════════════
    # 1. TOP-LEFT CLEANUP: Power button, Sound button, Ping/Wifi, Round number
    # ═════════════════════════════════════════════════════════════════════════
    # In cab coordinates:
    # Round:2165 is at x: 60..165, y: 15..55
    # Power btn is at x: 8..66, y: 10..68
    # Sound btn is at x: 8..66, y: 70..130
    # Wifi/ping is at x: 10..68, y: 132..185
    # We create a smooth background patch by sampling the dark casino background
    top_left_mask = Image.new('L', (cw, ch), 0)
    mask_draw = ImageDraw.Draw(top_left_mask)
    # Mask covers the buttons and round text, avoiding the jackpot wings and letters
    # Polygon around the top left controls:
    mask_draw.polygon([
        (0, 0),
        (165, 0),
        (165, 55),
        (68, 55),
        (68, 185),
        (0, 185)
    ], fill=255)
    # Soft blur edge on mask
    top_left_mask = top_left_mask.filter(ImageFilter.GaussianBlur(radius=3))
    
    # Create background patch for top-left
    top_left_bg = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(top_left_bg)
    for y in range(0, 200):
        t = y / 200.0
        # Smooth deep casino purple gradient: (26, 12, 54) to (38, 16, 72)
        r = int(24 + t * 14)
        g = int(12 + t * 6)
        b = int(52 + t * 20)
        bg_draw.line([(0, y), (180, y)], fill=(r, g, b, 255))
        
    base.paste(top_left_bg, (0, 0), top_left_mask)

    # ═════════════════════════════════════════════════════════════════════════
    # 2. TOP-RIGHT CLEANUP: Rule / Lightbulb button (x: 390..460, y: 0..80)
    # ═════════════════════════════════════════════════════════════════════════
    top_right_mask = Image.new('L', (cw, ch), 0)
    trm_draw = ImageDraw.Draw(top_right_mask)
    trm_draw.polygon([
        (392, 0),
        (460, 0),
        (460, 80),
        (392, 80)
    ], fill=255)
    top_right_mask = top_right_mask.filter(ImageFilter.GaussianBlur(radius=3))
    
    top_right_bg = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    tr_draw = ImageDraw.Draw(top_right_bg)
    for y in range(0, 90):
        t = y / 90.0
        r = int(22 + t * 12)
        g = int(10 + t * 6)
        b = int(48 + t * 18)
        tr_draw.line([(385, y), (460, y)], fill=(r, g, b, 255))
        
    base.paste(top_right_bg, (0, 0), top_right_mask)

    # ═════════════════════════════════════════════════════════════════════════
    # 3. CLEAN 8 INSET FRUIT CELL TRAYS & CENTER COUNTDOWN SCREEN
    # ═════════════════════════════════════════════════════════════════════════
    # Cells in cab (shifted by +12 pixels from old crop 260->248):
    cells = [
        (44, 228, 162, 341),   # Row 0, Col 0 (Lemon)
        (166, 228, 284, 341),  # Row 0, Col 1 (Raspberry)
        (288, 228, 406, 341),  # Row 0, Col 2 (Kiwi)
        (44, 341, 162, 453),   # Row 1, Col 0 (Cherry)
        (288, 341, 406, 453),  # Row 1, Col 2 (Plum)
        (44, 453, 162, 566),   # Row 2, Col 0 (Watermelon)
        (166, 453, 284, 566),  # Row 2, Col 1 (Banana)
        (288, 453, 406, 566),  # Row 2, Col 2 (Strawberry)
    ]
    
    cell_overlay = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(cell_overlay)
    
    for cx1, cy1, cx2, cy2 in cells:
        cw_cell = cx2 - cx1
        ch_cell = cy2 - cy1
        midx = (cx1 + cx2) / 2.0
        midy = (cy1 + cy2) / 2.0
        
        # Inset radial velvet arcade tray: bright center #2e125a, dark rim #120428
        for y in range(cy1, cy2 + 1):
            for x in range(cx1, cx2 + 1):
                dx = (x - midx) / (cw_cell / 2.0)
                dy = (y - midy) / (ch_cell / 2.0)
                d = math.sqrt(dx*dx + dy*dy)
                factor = min(1.0, d)
                
                # Radial falloff
                r_val = int(46 - factor * 30)
                g_val = int(20 - factor * 14)
                b_val = int(90 - factor * 54)
                cell_overlay.putpixel((x, y), (r_val, g_val, b_val, 255))
        
        # Smooth rounded double-bevel borders
        c_draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=16, outline=(125, 65, 195, 255), width=2)
        c_draw.rounded_rectangle([cx1 + 2, cy1 + 2, cx2 - 2, cy2 - 2], radius=14, outline=(38, 14, 72, 180), width=1)

    # Center red countdown clock screen: [174, 348, 276, 446]
    clock_x1, clock_y1, clock_x2, clock_y2 = 174, 348, 276, 446
    for y in range(clock_y1, clock_y2 + 1):
        t = (y - clock_y1) / float(clock_y2 - clock_y1)
        r = int(50 - t * 24)
        g = int(8 - t * 4)
        b = int(18 - t * 8)
        c_draw.line([(clock_x1, y), (clock_x2, y)], fill=(r, g, b, 255))
    c_draw.rounded_rectangle([clock_x1, clock_y1, clock_x2, clock_y2], radius=10, outline=(140, 20, 40, 255), width=1)
    
    base = Image.alpha_composite(base, cell_overlay)

    # ═════════════════════════════════════════════════════════════════════════
    # 4. CLEAN RESULT ROW: Empty glossy capsule slot for dynamic fruit history
    # ═════════════════════════════════════════════════════════════════════════
    # The Result pill is at x=45 to 415, y=574 to 618.
    res_x1, res_y1, res_x2, res_y2 = 45, 574, 415, 618
    res_draw = ImageDraw.Draw(base)
    
    # We keep the "Result" label or create a super clean glossy inner pill
    # Draw glossy inner background
    for y in range(res_y1 + 2, res_y2 - 1):
        t = (y - res_y1) / float(res_y2 - res_y1)
        # Deep velvet purple glossy gradient
        r = int(55 - t * 22)
        g = int(22 - t * 10)
        b = int(105 - t * 40)
        res_draw.line([(res_x1 + 18, y), (res_x2 - 18, y)], fill=(r, g, b, 255))
        
    # Draw smooth rounded ends for the result pill
    res_draw.rounded_rectangle([res_x1 + 2, res_y1 + 2, res_x2 - 2, res_y2 - 2], radius=18, outline=(90, 45, 140, 180), width=1)
    # Subtle top specular highlight
    res_draw.line([(res_x1 + 25, res_y1 + 3), (res_x2 - 25, res_y1 + 3)], fill=(150, 95, 220, 160), width=1)

    # ═════════════════════════════════════════════════════════════════════════
    # 5. CLEAN CHIP BUTTONS ROW: Remove 50K, 100K, 500K, 1M badges
    # ═════════════════════════════════════════════════════════════════════════
    # The chip badges are between y=624 and y=662.
    # Below y=662 are the 4 3D arcade buttons which must remain pristine!
    for y in range(622, 663):
        t = (y - 622) / 40.0
        # Dark purple honeycomb background
        r = int(32 - t * 12)
        g = int(14 - t * 6)
        b = int(58 - t * 20)
        for x in range(40, 420):
            # Hex honeycomb subtle texture
            h_tex = 1 if ((x * 2 + y * 3) % 11 < 2) else 0
            base.putpixel((x, y), (r + h_tex * 4, g + h_tex * 2, b + h_tex * 6, 255))

    # ═════════════════════════════════════════════════════════════════════════
    # 6. CLEAN BOTTOM PILLS: Keep 'Mine', 'Today Win', 'Auto', clean numbers!
    # ═════════════════════════════════════════════════════════════════════════
    # Pill 1 (Mine): x: 38..172, y: 706..760
    # The text 'Mine' is at y: 708..724. The numbers are at y: 728..755.
    mine_draw = ImageDraw.Draw(base)
    for y in range(728, 755):
        t = (y - 728) / 27.0
        r = int(72 - t * 20)
        g = int(42 - t * 14)
        b = int(122 - t * 34)
        # Rounded pill interior width
        margin = int(22 * (1.0 - math.sqrt(max(0, 1.0 - ((y - 741.5)/13.5)**2))))
        x_start = 42 + margin
        x_end = 168 - margin
        if x_end > x_start:
            mine_draw.line([(x_start, y), (x_end, y)], fill=(r, g, b, 255))

    # Pill 2 (Today Win): x: 178..312, y: 706..760
    # The text 'Today Win' is at y: 708..724. The numbers are at y: 728..755.
    for y in range(728, 755):
        t = (y - 728) / 27.0
        r = int(72 - t * 20)
        g = int(42 - t * 14)
        b = int(122 - t * 34)
        margin = int(22 * (1.0 - math.sqrt(max(0, 1.0 - ((y - 741.5)/13.5)**2))))
        x_start = 182 + margin
        x_end = 308 - margin
        if x_end > x_start:
            mine_draw.line([(x_start, y), (x_end, y)], fill=(r, g, b, 255))
            
    # Pill 3 (Auto) is untouched!

    # Save output
    out_path = os.path.join(out_dir, 'slot_machine_base.png')
    base.save(out_path, 'PNG', optimize=True)
    print(f'Master Slot Machine saved to: {out_path} (Size: {base.size})')

if __name__ == '__main__':
    build_perfect_clean_cabinet()
