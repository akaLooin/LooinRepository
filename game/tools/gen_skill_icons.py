"""실버 스킬 아이콘 (오리지널 16x16 픽셀). 작은 도형 조합으로 그린다. python3 tools/gen_skill_icons.py assets/ui"""
import math
import os
import sys

from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/ui"


def C(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


INK = C("1b1530"); W = C("f4f8fc"); S = C("b4c0cf"); B = C("4fb3ff"); BD = C("2f6aa8")
G = C("e8b64c"); Y = C("fff1b8"); R = C("e2574c"); K = C("6b7789"); GR = C("9bd36b"); P = C("c77dff")


class Icon:
    def __init__(self):
        self.c = {}

    def px(self, x, y, col):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < 16 and 0 <= y < 16:
            self.c[(x, y)] = col

    def line(self, x0, y0, x1, y1, col, w=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / max(n, 1)
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            self.px(x, y, col)
            if w > 1:
                self.px(x + 1, y, col)

    def sword(self, x, y, ang, ln=10, col=W, guard=G):
        a = math.radians(ang)
        dx, dy = math.cos(a), math.sin(a)
        self.line(x, y, x + dx * ln, y + dy * ln, col)
        self.line(x - dy * 2, y + dx * 2, x + dy * 2, y - dx * 2, guard)
        self.px(x - dx * 2, y - dy * 2, K)

    def arc(self, cx, cy, r, a0, a1, col):
        for d in range(a0, a1, 6):
            a = math.radians(d)
            self.px(cx + math.cos(a) * r, cy + math.sin(a) * r, col)

    def circle(self, cx, cy, r, col, fill=None):
        for y in range(16):
            for x in range(16):
                d = math.hypot(x - cx, y - cy)
                if fill and d <= r - 1:
                    self.px(x, y, fill)
                elif abs(d - r) < 0.6:
                    self.px(x, y, col)

    def arrow(self, x0, y0, x1, y1, col):
        self.line(x0, y0, x1, y1, col)
        a = math.atan2(y1 - y0, x1 - x0)
        for s in (-1, 1):
            b = a + math.pi * 0.8 * s
            self.line(x1, y1, x1 + math.cos(b) * 3, y1 + math.sin(b) * 3, col)

    def shield(self, cx, cy, col, fill):
        rows = [5, 6, 6, 6, 5, 4, 3, 2, 1]
        for j, hw in enumerate(rows):
            for i in range(-hw, hw + 1):
                self.px(cx + i, cy - 4 + j, col if abs(i) == hw or j == 0 else fill)

    def save(self, name):
        im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        for (x, y) in list(self.c):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if n not in self.c and 0 <= n[0] < 16 and 0 <= n[1] < 16:
                    im.putpixel(n, INK)
        for p, col in self.c.items():
            im.putpixel(p, col)
        im.save(os.path.join(OUT, "skill_%s.png" % name))


def make(name, fn):
    ic = Icon()
    fn(ic)
    ic.save(name)


make("sk_rush", lambda i: (i.sword(3, 8, 0, 11), i.line(1, 4, 6, 4, S), i.line(0, 12, 5, 12, S), i.line(2, 6, 4, 6, S)))
make("sk_crescent", lambda i: (i.arc(8, 8, 6, 0, 300, W), i.arc(8, 8, 5, 20, 280, S), i.sword(8, 8, -45, 6)))
make("sk_thrust", lambda i: (i.sword(2, 8, 0, 12), i.line(9, 5, 14, 5, S), i.line(9, 11, 14, 11, S), i.line(11, 3, 15, 3, S), i.line(11, 13, 15, 13, S)))
make("sk_cross", lambda i: (i.line(8, 1, 8, 12, W), i.line(4, 5, 12, 5, G), i.line(1, 14, 6, 14, B), i.line(10, 14, 15, 14, B), i.arrow(8, 2, 8, 11, W)))
make("sk_oath", lambda i: (i.circle(8, 8, 6, G), i.sword(8, 13, -90, 9, W, G), i.px(4, 3, Y), i.px(12, 3, Y), i.px(2, 9, Y), i.px(14, 9, Y)))
make("sk_dawn", lambda i: (i.line(0, 11, 15, 4, Y, 2), i.line(0, 12, 15, 5, G), i.circle(4, 12, 3, G, Y), i.line(0, 14, 15, 14, K)))
make("cb_up", lambda i: (i.arrow(4, 14, 4, 3, B), i.sword(9, 13, -70, 9)))
make("cb_down", lambda i: (i.arrow(4, 2, 4, 13, B), i.sword(10, 2, 90, 10), i.line(6, 15, 14, 15, K)))
make("cb_air", lambda i: (i.arc(8, 8, 5, 180, 360, W), i.arc(8, 10, 5, 180, 360, S), i.line(3, 14, 13, 14, B)))
make("cb_dash2", lambda i: (i.sword(4, 9, -20, 9), i.line(0, 6, 3, 6, S), i.line(0, 9, 2, 9, S), i.line(0, 12, 3, 12, S), i.arc(10, 8, 5, -60, 60, Y)))
make("cb_combo5", lambda i: (i.circle(8, 8, 6, W), i.sword(8, 8, 30, 6), [i.px(8 + math.cos(math.radians(k * 72 - 90)) * 6, 8 + math.sin(math.radians(k * 72 - 90)) * 6, G) for k in range(5)]))
make("ps_crit", lambda i: (i.circle(8, 8, 6, R), i.circle(8, 8, 3, R), i.px(8, 8, Y), i.line(8, 0, 8, 3, R), i.line(8, 13, 8, 15, R), i.line(0, 8, 3, 8, R), i.line(13, 8, 15, 8, R)))
make("ps_back", lambda i: (i.sword(13, 8, 180, 10), i.arrow(4, 4, 12, 4, Y), i.circle(4, 11, 2, S, K)))
make("ps_potion", lambda i: (i.line(6, 2, 10, 2, K), i.circle(8, 10, 4, W, R), i.line(7, 3, 7, 6, W), i.line(9, 3, 9, 6, W), i.line(12, 2, 12, 6, GR), i.line(10, 4, 14, 4, GR)))
make("ps_def", lambda i: i.shield(8, 7, S, W))
make("ps_getup", lambda i: (i.line(2, 13, 13, 13, K), i.arrow(5, 12, 5, 3, GR), i.arrow(10, 12, 10, 5, GR)))
make("ps_counter", lambda i: (i.arc(8, 8, 6, 200, 520, B), i.arrow(13, 6, 14, 10, B), i.sword(5, 11, -45, 7)))
make("ps_last", lambda i: (i.shield(8, 7, G, Y), i.line(8, 4, 8, 10, R), i.line(5, 7, 11, 7, R)))
make("ps_mpgain", lambda i: (i.circle(8, 9, 5, B, BD), i.line(8, 1, 8, 5, B), i.arc(8, 4, 3, 180, 360, W)))
make("ps_afterglow", lambda i: (i.sword(8, 13, -90, 9, S, G), i.arc(8, 6, 5, 180, 360, Y), i.arc(8, 6, 7, 200, 340, C("fff1b8", 160))))
make("ps_goldpow", lambda i: (i.sword(3, 13, -45, 11, Y, G), i.arrow(12, 13, 12, 6, G), i.px(13, 2, Y)))
make("ps_goldwave", lambda i: (i.arc(4, 8, 5, -70, 70, Y), i.arc(7, 8, 6, -60, 60, G), i.arc(10, 8, 6, -50, 50, Y)))
print("skill icons done")


# ── 글렌 ──
WOOD = C("a8743c"); WD = C("7a4f2a"); GRN = C("2f5a3a"); GN2 = C("5b9a5a"); ORG = C("ffb347"); RP = C("c9b28a")


def bow_shape(i, x, y, col=WOOD):
    i.arc(x - 4, y, 7, -70, 70, col)
    i.line(x - 2, y - 6, x - 2, y + 6, Y)


def arrow_shape(i, x0, y0, x1, y1):
    i.line(x0, y0, x1, y1, RP)
    i.px(x1, y1, W)
    i.px(x0, y0 - 1, G)
    i.px(x0, y0 + 1, G)


make("sk_g_grenade", lambda i: (i.circle(7, 9, 4, K, C("3a2a22")), i.line(7, 4, 9, 2, S), i.px(10, 1, R), i.px(11, 2, ORG), i.arc(7, 9, 7, 200, 320, ORG)))
make("sk_g_fan", lambda i: [arrow_shape(i, 2, 8, 2 + 12 * math.cos(math.radians(a)), 8 + 12 * math.sin(math.radians(a))) for a in (-36, -18, 0, 18, 36)])
make("sk_g_net", lambda i: ([i.line(3 + k, 3, 3 + k, 13, RP) for k in range(0, 11, 3)], [i.line(3, 3 + k, 13, 3 + k, RP) for k in range(0, 11, 3)]))
make("sk_g_trap", lambda i: (i.line(2, 12, 14, 12, WD), i.line(4, 10, 12, 10, S), i.px(8, 9, R), i.arc(8, 9, 6, 200, 340, ORG), i.arc(8, 9, 4, 210, 330, Y)))
make("sk_g_rain", lambda i: [arrow_shape(i, x, 1 + (x % 3), x, 8 + (x % 3)) for x in (2, 6, 10, 14)] + [i.line(0, 14, 15, 14, K)])
make("sk_g_spikes", lambda i: ([i.line(x, 13, x + 1, 7, S) for x in (2, 6, 10)], [i.line(x + 1, 7, x + 2, 13, W) for x in (2, 6, 10)], i.line(0, 14, 15, 14, WD)))
make("sk_g_snipe", lambda i: (i.circle(8, 8, 6, R), i.line(8, 1, 8, 15, R), i.line(1, 8, 15, 8, R), i.px(8, 8, Y)))
make("sk_g_hawk", lambda i: (i.line(2, 6, 7, 9, WD), i.line(14, 6, 9, 9, WD), i.circle(8, 9, 2, Y, Y), i.px(8, 8, INK), i.line(3, 5, 6, 7, C("c9a06a")), i.line(13, 5, 10, 7, C("c9a06a"))))
make("sk_g_hunt", lambda i: (bow_shape(i, 9, 8), arrow_shape(i, 2, 8, 14, 8), i.px(3, 2, ORG), i.px(13, 13, ORG), i.px(2, 13, Y)))
make("ps_g_atk", lambda i: (bow_shape(i, 10, 8), arrow_shape(i, 1, 8, 13, 8)))
make("ps_g_charge", lambda i: (bow_shape(i, 11, 8), arrow_shape(i, 3, 8, 14, 8), i.arc(8, 8, 7, 150, 210, Y), i.arc(8, 8, 6, 140, 220, G)))
make("ps_arrowspd", lambda i: (arrow_shape(i, 5, 8, 15, 8), i.line(0, 5, 4, 5, S), i.line(1, 8, 4, 8, S), i.line(0, 11, 4, 11, S)))
make("ps_g_crit", lambda i: (i.circle(8, 8, 6, R), i.circle(8, 8, 2, R), arrow_shape(i, 1, 1, 8, 8)))
make("cb_multi", lambda i: [arrow_shape(i, 2, 8, 2 + 12 * math.cos(math.radians(a)), 8 + 12 * math.sin(math.radians(a))) for a in (-22, 0, 22)])
make("cb_rapid", lambda i: [arrow_shape(i, 1 + k * 2, 3 + k * 3, 11 + k * 2, 3 + k * 3) for k in range(4)])
make("cb_airshot", lambda i: (arrow_shape(i, 3, 3, 12, 12), arrow_shape(i, 7, 2, 15, 10), i.line(1, 15, 6, 15, B)))
make("ps_pierce", lambda i: (arrow_shape(i, 0, 8, 15, 8), i.line(5, 4, 5, 12, S), i.line(10, 4, 10, 12, S)))
make("ps_g_hp", lambda i: (i.circle(8, 9, 5, R, R), i.line(5, 3, 11, 3, GN2), i.line(8, 1, 8, 5, GN2)))
make("ps_bash", lambda i: (bow_shape(i, 9, 8), i.arrow(3, 13, 14, 13, Y)))
make("ps_stealth", lambda i: (i.arc(8, 8, 6, 180, 360, GRN), i.line(2, 8, 14, 8, GRN), i.px(6, 6, Y), i.px(10, 6, Y)))
make("ps_g_mp", lambda i: (i.circle(8, 9, 5, B, BD), i.line(8, 1, 8, 5, GN2), i.px(7, 2, GN2), i.px(9, 3, GN2)))
make("ps_dodge", lambda i: (i.arrow(12, 8, 3, 8, W), i.line(8, 4, 14, 4, S), i.line(8, 12, 14, 12, S)))
make("ps_far", lambda i: (arrow_shape(i, 1, 13, 13, 3), i.circle(13, 3, 2, R)))
make("ps_stick", lambda i: (i.circle(9, 10, 5, C("6b5a7a"), C("2b1f4a")), arrow_shape(i, 2, 3, 8, 9), arrow_shape(i, 6, 1, 10, 7), arrow_shape(i, 12, 2, 11, 7)))
make("ps_g_last", lambda i: (i.shield(8, 7, GRN, GN2), i.line(8, 4, 8, 10, Y), i.line(5, 7, 11, 7, Y)))
make("ps_trap_pow", lambda i: (i.circle(8, 9, 5, K, C("3a2a22")), i.arc(8, 9, 7, 0, 360, ORG), i.px(8, 3, R)))
make("ps_trap_dur", lambda i: (i.line(2, 12, 14, 12, WD), i.line(4, 10, 12, 10, S), i.circle(8, 5, 3, W), i.line(8, 3, 8, 5, INK), i.line(8, 5, 10, 5, INK)))
make("ps_snare", lambda i: ([i.line(3 + k, 3, 3 + k, 13, RP) for k in range(0, 11, 5)], [i.line(3, 3 + k, 13, 3 + k, RP) for k in range(0, 11, 5)], i.circle(8, 8, 2, R, R)))
make("ps_trap_radius", lambda i: (i.circle(8, 8, 6, ORG), i.circle(8, 8, 3, Y), i.arrow(8, 8, 15, 8, W), i.arrow(8, 8, 1, 8, W)))
make("ps_trap_count", lambda i: (i.line(1, 12, 7, 12, WD), i.line(9, 12, 15, 12, WD), i.px(4, 10, R), i.px(12, 10, R), i.line(2, 11, 6, 11, S), i.line(10, 11, 14, 11, S)))
make("ps_shrapnel", lambda i: (i.circle(8, 8, 3, K, C("3a2a22")), [i.line(8 + 4 * math.cos(a), 8 + 4 * math.sin(a), 8 + 7 * math.cos(a), 8 + 7 * math.sin(a), ORG) for a in [k * math.pi / 3 for k in range(6)]]))
print("glenn icons done")
