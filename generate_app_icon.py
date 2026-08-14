import os
from PIL import Image, ImageDraw

def create_mimir_icon(size=512):
    # 1. Create transparent canvas
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # 2. Draw rounded rectangle background (Color: #005ac1 -> RGB(0, 90, 193))
    bg_color = (0, 90, 193, 255)
    radius = int(size * 0.22) # smooth squircle radius
    draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=bg_color)

    # 3. Draw white Material shield_lock icon in center
    # Scale factors relative to size
    cx = size / 2.0
    cy = size / 2.0
    s = size / 512.0 # scale factor

    # Draw Shield outer path using smooth polygon / curves
    shield_pts = [
        (cx, cy - 130 * s),           # top center tip
        (cx + 110 * s, cy - 100 * s), # top right
        (cx + 110 * s, cy + 10 * s),  # right curve start
        (cx, cy + 140 * s),           # bottom tip
        (cx - 110 * s, cy + 10 * s),  # left curve start
        (cx - 110 * s, cy - 100 * s), # top left
    ]
    draw.polygon(shield_pts, fill=(255, 255, 255, 255))

    # Inner cutout in blue for lock effect inside shield
    inner_shield_pts = [
        (cx, cy - 105 * s),
        (cx + 85 * s, cy - 80 * s),
        (cx + 85 * s, cy + 5 * s),
        (cx, cy + 110 * s),
        (cx - 85 * s, cy + 5 * s),
        (cx - 85 * s, cy - 80 * s),
    ]
    draw.polygon(inner_shield_pts, fill=bg_color)

    # Lock Body & Shackle inside shield (white)
    # Shackle arc (circle outline top)
    shackle_bbox = [cx - 35 * s, cy - 65 * s, cx + 35 * s, cy + 5 * s]
    draw.arc(shackle_bbox, start=180, end=360, fill=(255, 255, 255, 255), width=int(14 * s))

    # Lock box (solid rect)
    lock_box = [cx - 45 * s, cy - 20 * s, cx + 45 * s, cy + 45 * s]
    draw.rounded_rectangle(lock_box, radius=int(8 * s), fill=(255, 255, 255, 255))

    # Keyhole inside lock box (blue cutout)
    keyhole_circle = [cx - 10 * s, cy - 5 * s, cx + 10 * s, cy + 15 * s]
    draw.ellipse(keyhole_circle, fill=bg_color)
    keyhole_stem = [cx - 6 * s, cy + 5 * s, cx + 6 * s, cy + 28 * s]
    draw.rectangle(keyhole_stem, fill=bg_color)

    return image

def create_mimir_foreground(size=512):
    # Transparent canvas with only the white Material shield_lock icon
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    bg_color = (0, 90, 193, 255)
    cx = size / 2.0
    cy = size / 2.0
    s = size / 512.0

    shield_pts = [
        (cx, cy - 130 * s),
        (cx + 110 * s, cy - 100 * s),
        (cx + 110 * s, cy + 10 * s),
        (cx, cy + 140 * s),
        (cx - 110 * s, cy + 10 * s),
        (cx - 110 * s, cy - 100 * s),
    ]
    draw.polygon(shield_pts, fill=(255, 255, 255, 255))

    inner_shield_pts = [
        (cx, cy - 105 * s),
        (cx + 85 * s, cy - 80 * s),
        (cx + 85 * s, cy + 5 * s),
        (cx, cy + 110 * s),
        (cx - 85 * s, cy + 5 * s),
        (cx - 85 * s, cy - 80 * s),
    ]
    draw.polygon(inner_shield_pts, fill=bg_color)

    shackle_bbox = [cx - 35 * s, cy - 65 * s, cx + 35 * s, cy + 5 * s]
    draw.arc(shackle_bbox, start=180, end=360, fill=(255, 255, 255, 255), width=int(14 * s))

    lock_box = [cx - 45 * s, cy - 20 * s, cx + 45 * s, cy + 45 * s]
    draw.rounded_rectangle(lock_box, radius=int(8 * s), fill=(255, 255, 255, 255))

    keyhole_circle = [cx - 10 * s, cy - 5 * s, cx + 10 * s, cy + 15 * s]
    draw.ellipse(keyhole_circle, fill=bg_color)
    keyhole_stem = [cx - 6 * s, cy + 5 * s, cx + 6 * s, cy + 28 * s]
    draw.rectangle(keyhole_stem, fill=bg_color)

    return image

def main():
    icon_512 = create_mimir_icon(512)
    foreground_512 = create_mimir_foreground(512)
    os.makedirs("/workspace/projects/2fa-auth/assets", exist_ok=True)
    icon_512.save("/workspace/projects/2fa-auth/assets/icon.png")
    foreground_512.save("/workspace/projects/2fa-auth/assets/adaptive-icon.png")

    favicon = icon_512.resize((64, 64), Image.LANCZOS)
    favicon.save("/workspace/projects/2fa-auth/assets/favicon.png")

    mipmaps = [
        ("mipmap-mdpi", 48),
        ("mipmap-hdpi", 72),
        ("mipmap-xhdpi", 96),
        ("mipmap-xxhdpi", 144),
        ("mipmap-xxxhdpi", 192),
    ]

    res_dir = "/workspace/projects/2fa-auth/android/app/src/main/res"
    for folder, dim in mipmaps:
        target_folder = os.path.join(res_dir, folder)
        if os.path.exists(target_folder):
            img = icon_512.resize((dim, dim), Image.LANCZOS)
            fg = foreground_512.resize((dim, dim), Image.LANCZOS)
            for fname in ["ic_launcher.webp", "ic_launcher_round.webp", "ic_launcher_foreground.webp"]:
                fpath = os.path.join(target_folder, fname)
                if os.path.exists(fpath):
                    os.remove(fpath)
            img.save(os.path.join(target_folder, "ic_launcher.png"))
            img.save(os.path.join(target_folder, "ic_launcher_round.png"))
            fg.save(os.path.join(target_folder, "ic_launcher_foreground.png"))

    print("Successfully generated and updated all Mimir App Icons!")

if __name__ == "__main__":
    main()
