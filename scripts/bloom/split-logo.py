#!/usr/bin/env python3
"""
Split the approved Dark Background Alternative logo (C, transparent) into two PIXEL-EXACT layers:

  emblem   — lotus, leaves, crescent, moons, stars, the small star under the lotus
  wordmark — "Fleur de Lise" script, HEALING, flanking rules, lower star

Every visible pixel lands in exactly one layer and is copied unchanged, so emblem + wordmark == the approved logo.
The script asserts this. The AI bloom animates only the emblem; the wordmark is always the original artwork.

Usage: python3 scripts/bloom/split-logo.py [OUT_DIR=brand-originals/derived]
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'brand-originals/C_dark-alternative-transparent.png'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'brand-originals/derived'
os.makedirs(OUT, exist_ok=True)

A = np.array(Image.open(SRC).convert('RGBA')).astype(int)
H, W = A.shape[:2]
r, g, b, a = (A[..., i] for i in range(4))
yy, xx = np.mgrid[0:H, 0:W]
ell = lambda cx, cy, rx, ry: ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 < 1
vis = a > 0

# regions that always belong to the emblem: lotus (+ lower petals), the small star under it, the ring's lower arc
protect = ell(768, 455, 300, 125) | ell(768, 640, 45, 45) | ell(768, 591, 232, 17)
gold = (r > 140) & (b < 125) & (r - b > 70) & (g > 80)

# lettering = large connected ivory shapes below y=500 (+ their anti-aliased fringe) and everything from y=665
ivoryish = (r > 205) & (g > 195) & (b > 175) & vis & (yy >= 500) & ~protect
lab, n = ndi.label(ivoryish, structure=np.ones((3, 3)))
areas = ndi.sum(ivoryish, lab, range(1, n + 1))
keep = np.zeros(n + 1, bool); keep[1:] = areas >= 150
seed = keep[lab]
near3 = ndi.binary_dilation(seed, structure=np.ones((3, 3)), iterations=3)
word = (seed | (near3 & ~gold & vis) | ((yy >= 665) & vis)) & ~protect & vis

# nothing of the emblem lives in the lower corners or below the small star
word |= (vis & (yy >= 548) & ((xx < 470) | (xx > 1068)) & ~protect) | (vis & (yy >= 610) & ~ell(768, 640, 45, 45) & ~protect)

# sweep up tiny stray fragments low in the lettering zone, and two known specks near the ring
emb = vis & ~word
lab2, n2 = ndi.label(emb, structure=np.ones((3, 3)))
for i, area in enumerate(ndi.sum(emb, lab2, range(1, n2 + 1)), 1):
    if area < 120:
        ys, _ = np.where(lab2 == i)
        if ys.mean() > 555:
            word |= (lab2 == i); emb &= ~(lab2 == i)
for (x0, x1, y0, y1) in [(960, 1030, 580, 605), (430, 560, 555, 592)]:
    box = emb & (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    faint = (a < 200) | ((r > 200) & (g > 195) & (b > 170))
    word |= box & faint; emb &= ~(box & faint)
word &= vis; emb = vis & ~word


def layer(mask):
    out = np.zeros_like(A); out[mask] = A[mask]
    return Image.fromarray(out.astype(np.uint8), 'RGBA')

E, Wd = layer(emb), layer(word)
rec = np.array(E).astype(int) + np.array(Wd).astype(int)
assert int((emb & word).sum()) == 0, 'layers overlap'
assert np.array_equal(rec[vis], A[vis]) and np.array_equal(rec[..., 3], A[..., 3]), 'recomposition is not pixel-exact'
E.save(os.path.join(OUT, 'emblem-layer.png')); Wd.save(os.path.join(OUT, 'wordmark-layer.png'))
print(f'OK: emblem {int(emb.sum())} px + wordmark {int(word.sum())} px recompose pixel-exactly to the approved logo -> {OUT}')
