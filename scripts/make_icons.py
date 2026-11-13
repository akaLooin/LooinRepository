"""Logo/LooinLogo.png 로 안드로이드 런처 아이콘과 스토어 그래픽을 만든다.

사용: python3 scripts/make_icons.py
 - 투두메이트 톤에 맞춰 검정 바탕 + 흰 엠블럼
 - 적응형 아이콘 전경은 108dp 캔버스의 안전 영역(지름 66dp) 안에 들어가게 축소
 - 테마 아이콘(Android 13+) 단색 레이어는 같은 전경 이미지를 쓴다(ic_launcher.xml)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "Logo" / "LooinLogo.png"
RES = ROOT / "app" / "src" / "main" / "res"
STORE = ROOT / "docs" / "release" / "store"
FONTS = ROOT / "ui" / "src" / "androidMain" / "res" / "font"
FONT = FONTS / "pretendard_bold.otf"
FONT_REG = FONTS / "pretendard_medium.otf"


def emblem(height: int, color=(255, 255, 255, 255)) -> Image.Image:
    src = Image.open(LOGO).convert("RGBA")
    src = src.crop(src.getbbox())
    alpha = src.split()[-1]
    w = round(src.width * height / src.height)
    alpha = alpha.resize((w, height), Image.LANCZOS)
    out = Image.new("RGBA", (w, height), color)
    out.putalpha(alpha)
    return out


def centered(canvas: int, scale: float, bg=None) -> Image.Image:
    img = Image.new("RGBA", (canvas, canvas), bg or (0, 0, 0, 0))
    e = emblem(round(canvas * scale))
    img.alpha_composite(e, ((canvas - e.width) // 2, (canvas - e.height) // 2))
    return img


def main():
    densities = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    for name, f in densities.items():
        d = RES / f"mipmap-{name}"
        d.mkdir(parents=True, exist_ok=True)
        size = round(108 * f)
        fg = centered(size, 0.6)
        fg.save(d / "ic_launcher_foreground.png", optimize=True)

    STORE.mkdir(parents=True, exist_ok=True)
    # Play 스토어 아이콘 512x512 (불투명 검정 바탕)
    centered(512, 0.74, bg=(0, 0, 0, 255)).convert("RGB").save(STORE / "play-icon-512.png", optimize=True)
    # 대표 그래픽 1024x500
    fg = Image.new("RGB", (1024, 500), (0, 0, 0))
    e = emblem(380)
    fg.paste(e, (110, 60), e)
    draw = ImageDraw.Draw(fg)
    draw.text((420, 150), "루인 가계부", font=ImageFont.truetype(str(FONT), 84), fill=(255, 255, 255))
    draw.text((424, 270), "잔고 · 예정 지출 · 예산을 한눈에", font=ImageFont.truetype(str(FONT_REG), 36), fill=(210, 210, 210))
    draw.ellipse((424, 345, 448, 369), fill=(0, 255, 127))
    draw.text((460, 338), "오늘 쓸 수 있는 돈을 정확하게", font=ImageFont.truetype(str(FONT_REG), 30), fill=(140, 140, 140))
    fg.save(STORE / "feature-graphic-1024x500.png", optimize=True)

    # PC 아이콘: Windows .ico(16~256), macOS .icns, 창 아이콘 png — 둥근 사각형 검정 바탕
    desk = ROOT / "desktopApp" / "icons"
    desk.mkdir(parents=True, exist_ok=True)
    big = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mask = Image.new("L", (1024, 1024), 0)
    ImageDraw.Draw(mask).rounded_rectangle((40, 40, 984, 984), radius=200, fill=255)
    bg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 255))
    big.paste(bg, (0, 0), mask)
    big.alpha_composite(centered(1024, 0.7))
    big.save(desk / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    big.save(desk / "icon.icns")
    big.resize((512, 512), Image.LANCZOS).save(desk / "icon.png", optimize=True)
    big.resize((256, 256), Image.LANCZOS).save(ROOT / "desktopApp" / "src" / "main" / "resources" / "icon.png", optimize=True)
    print("done")


if __name__ == "__main__":
    main()
