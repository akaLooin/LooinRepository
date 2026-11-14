"""앱 아이콘과 스토어 그래픽을 만든다(그림은 scripts/draw_icon.py: 깃털 만년필이 새겨진 금화).

사용: python3 scripts/make_icons.py
 - Android 적응형 아이콘: 바탕(네이비 그라데이션) + 전경(동전, 안전 영역 지름 66dp 안) + 단색(테마 아이콘)
 - Play 아이콘 512, 대표 그래픽 1024×500
 - PC: Windows .ico, macOS .icns, 창 아이콘 png (둥근 사각형)
 - iOS: 1024 (투명 없이 꽉 찬 정사각형 — 모서리는 iOS 가 자름)
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import draw_icon  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "app" / "src" / "main" / "res"
STORE = ROOT / "docs" / "release" / "store"
FONTS = ROOT / "ui" / "src" / "androidMain" / "res" / "font"
FONT = FONTS / "pretendard_bold.otf"
FONT_REG = FONTS / "pretendard_medium.otf"

# 108dp 적응형 캔버스에서 동전 지름 ≈ 58dp (안전 영역 66dp 안, 그림자 포함)
FG_RATIO = 0.27


def android():
    densities = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    for name, f in densities.items():
        d = RES / f"mipmap-{name}"
        d.mkdir(parents=True, exist_ok=True)
        size = round(108 * f)
        draw_icon.render(size, "foreground", FG_RATIO).save(d / "ic_launcher_foreground.png", optimize=True)
        draw_icon.render(size, "background").convert("RGB").save(d / "ic_launcher_background.png", optimize=True)
        draw_icon.render(size, "monochrome", FG_RATIO).save(d / "ic_launcher_monochrome.png", optimize=True)


def store():
    STORE.mkdir(parents=True, exist_ok=True)
    draw_icon.render(512, "full", 0.38).convert("RGB").save(STORE / "play-icon-512.png", optimize=True)
    # 대표 그래픽 1024×500: 네이비 바탕 + 동전 + 이름
    fg = draw_icon.gradient((1024, 500), draw_icon.NAVY_TOP, draw_icon.NAVY_BOTTOM).convert("RGBA")
    c = draw_icon.render(420, "foreground", 0.40)
    fg.alpha_composite(c, (70, 40))
    d = ImageDraw.Draw(fg)
    d.text((500, 140), "페즈뱅크", font=ImageFont.truetype(str(FONT), 92), fill=(255, 255, 255))
    d.text((504, 262), "잔고 · 예정 지출 · 예산을 한눈에", font=ImageFont.truetype(str(FONT_REG), 36), fill=(214, 224, 240))
    d.ellipse((506, 342, 528, 364), fill=draw_icon.GOLD_MID)
    d.text((542, 334), "오늘 쓸 수 있는 돈을 정확하게", font=ImageFont.truetype(str(FONT_REG), 30), fill=(160, 180, 210))
    fg.convert("RGB").save(STORE / "feature-graphic-1024x500.png", optimize=True)


def desktop():
    """PC 아이콘: 둥근 사각형 네이비 바탕 + 동전."""
    desk = ROOT / "desktopApp" / "icons"
    desk.mkdir(parents=True, exist_ok=True)
    full = draw_icon.render(1024, "full", 0.36)
    mask = Image.new("L", (1024, 1024), 0)
    ImageDraw.Draw(mask).rounded_rectangle((40, 40, 984, 984), radius=200, fill=255)
    big = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    big.paste(full, (0, 0), mask)
    big.save(desk / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    big.save(desk / "icon.icns")
    big.resize((512, 512), Image.LANCZOS).save(desk / "icon.png", optimize=True)
    big.resize((256, 256), Image.LANCZOS).save(ROOT / "desktopApp" / "src" / "main" / "resources" / "icon.png", optimize=True)


def ios_icon():
    """iOS 앱 아이콘 1024(App Store·홈 화면 공용). 투명 없이 꽉 찬 정사각형."""
    d = ROOT / "iosApp" / "LooinBudget" / "Assets.xcassets" / "AppIcon.appiconset"
    d.mkdir(parents=True, exist_ok=True)
    draw_icon.render(1024, "full", 0.37).convert("RGB").save(d / "icon-1024.png", optimize=True)


def main():
    android()
    store()
    desktop()
    ios_icon()
    print("done")


if __name__ == "__main__":
    main()
