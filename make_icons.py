from PIL import Image, ImageDraw

INK = (18, 22, 29, 255)
PAPER = (251, 250, 247, 255)
ACCENT = (242, 193, 78, 255)

S = 1024  # supersample, then downscale


def build():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Ink tile
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=INK)

    # Three lines of "text" — the middle one is highlighted.
    pad = int(S * 0.20)
    w = S - pad * 2
    bar_h = int(S * 0.085)
    gap = int(S * 0.115)
    mid = S // 2

    # Top and bottom lines: quiet, paper-colored, shorter.
    for y, frac in ((mid - gap - bar_h, 0.74), (mid + gap, 0.56)):
        d.rounded_rectangle(
            [pad, y, pad + int(w * frac), y + bar_h],
            radius=bar_h // 2,
            fill=PAPER[:3] + (110,),
        )

    # Middle line: the highlight swipe. Marker sits behind, text sits on top.
    hl_pad = int(S * 0.03)
    d.rounded_rectangle(
        [pad - hl_pad, mid - bar_h // 2 - hl_pad, pad + w, mid + bar_h // 2 + hl_pad],
        radius=int(S * 0.02),
        fill=ACCENT,
    )
    d.rounded_rectangle(
        [pad, mid - bar_h // 2, pad + int(w * 0.88), mid + bar_h // 2],
        radius=bar_h // 2,
        fill=INK,
    )
    return img


base = build()
for size in (16, 48, 128):
    base.resize((size, size), Image.LANCZOS).save(f"icons/icon{size}.png")
print("wrote icons/icon16.png icons/icon48.png icons/icon128.png")
