import os
import math
from PIL import Image, ImageDraw, ImageFilter

def generate_master_clean_base():
    src_path = '/Users/kitkat/.gemini/antigravity-ide/brain/85485cdb-d602-4a40-b72b-9a0dca3a3560/.user_uploaded/media_1791184409626.png'
    out_dir = '/Users/kitkat/development/slote_mecine/frontend/public/images/cabinet'
    os.makedirs(out_dir, exist_ok=True)
    
    src = Image.open(src_path).convert('RGBA')
    # Cabinet crop from y=248 to y=1004 (460 x 756)
    cab = src.crop((0, 248, 460, 1004))
    cw, ch = cab.size
    
    res = cab.copy()
    
    # ═════════════════════════════════════════════════════════════════════════
    # 1. TOP-LEFT & TOP-RIGHT CLEAN CASINO AMBIANCE
    # ═════════════════════════════════════════════════════════════════════════
    clean_top = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(clean_top)
    
    for y in range(0, 220):
        t = y / 220.0
        r = int(24 + t * 18)
        g = int(12 + t * 8)
        b = int(50 + t * 24)
        c_draw.line([(0, y), (175, y)], fill=(r, g, b, 255))
        c_draw.line([(385, y), (460, y)], fill=(r, g, b, 255))
        
    bokeh = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(bokeh)
    b_draw.ellipse([15, 20, 75, 80], fill=(80, 40, 140, 140))
    b_draw.ellipse([10, 90, 60, 140], fill=(60, 30, 110, 120))
    b_draw.ellipse([395, 15, 455, 75], fill=(70, 35, 130, 130))
    bokeh = bokeh.filter(ImageFilter.GaussianBlur(radius=10))
    clean_top = Image.alpha_composite(clean_top, bokeh)
    
    # Mask covering only:
    # - Power btn (x: 0..68, y: 0..72)
    # - Sound btn (x: 0..68, y: 72..135)
    # - Wifi / 150ms (x: 0..68, y: 135..210)
    # - Round:2165 (x: 65..172, y: 0..58)
    # - Rule button (x: 390..460, y: 0..78)
    top_mask = Image.new('L', (cw, ch), 0)
    tm_draw = ImageDraw.Draw(top_mask)
    tm_draw.rectangle([0, 0, 68, 210], fill=255)
    tm_draw.rectangle([68, 0, 172, 58], fill=255)
    tm_draw.rectangle([390, 0, 460, 78], fill=255)
    top_mask = top_mask.filter(ImageFilter.GaussianBlur(radius=5))
    
    res = Image.composite(clean_top, res, top_mask)
    draw = ImageDraw.Draw(res)

    # ═════════════════════════════════════════════════════════════════════════
    # 2. CLEAN 8 INSET FRUIT CELL TRAYS & CENTER COUNTDOWN SCREEN
    # ═════════════════════════════════════════════════════════════════════════
    cells = [
        (44, 228, 162, 340),   # Row 0, Col 0 (Lemon)
        (166, 228, 284, 340),  # Row 0, Col 1 (Raspberry)
        (288, 228, 406, 340),  # Row 0, Col 2 (Kiwi)
        (44, 342, 162, 454),   # Row 1, Col 0 (Cherry)
        (288, 342, 406, 454),  # Row 1, Col 2 (Plum)
        (44, 456, 162, 548),   # Row 2, Col 0 (Watermelon)
        (166, 456, 284, 548),  # Row 2, Col 1 (Banana)
        (288, 456, 406, 548),  # Row 2, Col 2 (Strawberry)
    ]
    
    for cx1, cy1, cx2, cy2 in cells:
        cw_cell = cx2 - cx1
        ch_cell = cy2 - cy1
        midx = (cx1 + cx2) / 2.0
        midy = (cy1 + cy2) / 2.0
        
        for y in range(cy1, cy2 + 1):
            for x in range(cx1, cx2 + 1):
                dx = (x - midx) / (cw_cell / 2.0)
                dy = (y - midy) / (ch_cell / 2.0)
                d = math.sqrt(dx*dx + dy*dy)
                factor = min(1.0, d)
                
                # Inset radial gradient: bright center #2b1156, dark rim #120426
                r_val = int(46 - factor * 28)
                g_val = int(18 - factor * 12)
                b_val = int(92 - factor * 54)
                res.putpixel((x, y), (r_val, g_val, b_val, 255))
        
        # Smooth rounded double-bevel borders
        draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=16, outline=(120, 60, 190, 255), width=2)
        draw.rounded_rectangle([cx1 + 2, cy1 + 2, cx2 - 2, cy2 - 2], radius=14, outline=(40, 16, 75, 180), width=1)

    # Clean the bottom border of cell 4 (strawberry blue glow removed)
    draw.line([(288, 549), (406, 549)], fill=(40, 16, 75, 255), width=2)
    draw.line([(288, 550), (406, 550)], fill=(70, 35, 120, 255), width=2)

    # Center red countdown clock screen: [174, 354, 276, 442]
    clock_x1, clock_y1, clock_x2, clock_y2 = 174, 354, 276, 442
    for y in range(clock_y1, clock_y2 + 1):
        t = (y - clock_y1) / float(clock_y2 - clock_y1)
        r = int(52 - t * 26)
        g = int(8 - t * 4)
        b = int(20 - t * 10)
        draw.line([(clock_x1, y), (clock_x2, y)], fill=(r, g, b, 255))
    draw.rounded_rectangle([clock_x1, clock_y1, clock_x2, clock_y2], radius=10, outline=(150, 20, 45, 255), width=1)

    # ═════════════════════════════════════════════════════════════════════════
    # 3. CLEAN RESULT ROW (x: 52..410, y: 554..600)
    # ═════════════════════════════════════════════════════════════════════════
    res_x1, res_y1, res_x2, res_y2 = 52, 554, 410, 600
    
    # Fill interior with sleek glossy purple glass
    for y in range(res_y1 + 1, res_y2):
        t = (y - res_y1) / float(res_y2 - res_y1)
        r = int(64 - t * 28)
        g = int(24 - t * 12)
        b = int(118 - t * 48)
        
        norm_y = (y - (res_y1 + res_y2)/2.0) / ((res_y2 - res_y1)/2.0)
        curve_inset = int(18 * (1.0 - math.sqrt(max(0.0, 1.0 - norm_y**2))))
        x_start = res_x1 + 4 + curve_inset
        x_end = res_x2 - 4 - curve_inset
        if x_end > x_start:
            draw.line([(x_start, y), (x_end, y)], fill=(r, g, b, 255))

    # Top highlight line on result bar
    draw.line([(res_x1 + 24, res_y1 + 2), (res_x2 - 24, res_y1 + 2)], fill=(160, 100, 240, 180), width=1)

    # ═════════════════════════════════════════════════════════════════════════
    # 4. CLEAN CHIP BUTTONS ROW (y: 606..650)
    # ═════════════════════════════════════════════════════════════════════════
    for y in range(606, 650):
        t = (y - 606) / 44.0
        r = int(34 - t * 14)
        g = int(15 - t * 7)
        b = int(62 - t * 22)
        for x in range(38, 422):
            h_tex = 1 if ((x * 2 + y * 3) % 11 < 2) else 0
            res.putpixel((x, y), (r + h_tex * 4, g + h_tex * 2, b + h_tex * 6, 255))

    # ═════════════════════════════════════════════════════════════════════════
    # 5. CLEAN BOTTOM PILLS: Keep 'Mine', 'Today Win', 'Auto', clean numbers!
    # ═════════════════════════════════════════════════════════════════════════
    # Pill 1 (Mine):
    # 'Mine' text is at y: 696..713 (PRESERVED!)
    # Numbers & Coin '3256751 >' are at y: 714..738
    p1_x1, p1_x2 = 46, 162
    p1_y1, p1_y2 = 714, 738
    for y in range(p1_y1, p1_y2 + 1):
        t = (y - p1_y1) / float(p1_y2 - p1_y1)
        r = int(76 - t * 24)
        g = int(45 - t * 16)
        b = int(128 - t * 38)
        norm_y = (y - 726.0) / 14.0
        curve_inset = int(18 * (1.0 - math.sqrt(max(0.0, 1.0 - min(1.0, norm_y**2)))))
        x_start = p1_x1 + curve_inset
        x_end = p1_x2 - curve_inset
        if x_end > x_start:
            draw.line([(x_start, y), (x_end, y)], fill=(r, g, b, 255))

    # Pill 2 (Today Win):
    # 'Today Win' text is at y: 696..713 (PRESERVED!)
    # Numbers & Coin '1,500,000' are at y: 714..738
    p2_x1, p2_x2 = 186, 302
    p2_y1, p2_y2 = 714, 738
    for y in range(p2_y1, p2_y2 + 1):
        t = (y - p2_y1) / float(p2_y2 - p2_y1)
        r = int(76 - t * 24)
        g = int(45 - t * 16)
        b = int(128 - t * 38)
        norm_y = (y - 726.0) / 14.0
        curve_inset = int(18 * (1.0 - math.sqrt(max(0.0, 1.0 - min(1.0, norm_y**2)))))
        x_start = p2_x1 + curve_inset
        x_end = p2_x2 - curve_inset
        if x_end > x_start:
            draw.line([(x_start, y), (x_end, y)], fill=(r, g, b, 255))

    # Pill 3 (Auto) is untouched!

    # Save to public images
    out_path = os.path.join(out_dir, 'slot_machine_base.png')
    res.save(out_path, 'PNG', optimize=True)
    print(f'Master Slot Machine saved successfully to: {out_path} (Size: {res.size})')

if __name__ == '__main__':
    generate_master_clean_base()
