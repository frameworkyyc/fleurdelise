#!/usr/bin/env python3
"""
Pack the Higgsfield bloom video into a "stacked alpha" web video.

The AI video is rendered on flat Velvet Plum. This script keys the plum out (with colour recovery on soft edges),
then writes ONE ordinary video in which the top half is the premultiplied colour and the bottom half is the alpha
matte as greyscale. The browser composites it on a <canvas> (src/scripts/bloom.ts), so the animation floats over the
hero's real background (grid texture, glow) with no visible rectangle — and no codec-specific alpha support is needed
(works in Safari/iOS, Chrome, Firefox).

Smoothness-critical choices (see docs/BLOOM-PERFORMANCE.md):
  * NATIVE frame rate by default (--fps 0): the source is 30 fps, which divides evenly into 60/120 Hz displays. Never
    resample 30 -> 24 (that drops every 5th frame and forces an uneven 3:2 cadence on 60 Hz screens).
  * --crop x,y,w,h (logo space, 1536x864): encode only the emblem's footprint. Same pixel density, ~35% fewer pixels
    to decode and (the dominant cost) upload to the GPU every frame.
  * --end-at: stop encoding when the dissolve to the exact approved frame completes; the still hold is a timer in the
    player, so timing is unchanged but no static frames are decoded/uploaded.

Usage:
  python3 scripts/bloom/pack-bloom.py INPUT.mp4 OUT_DIR --width 930 --crop 150,0,1240,700 --trim-start 0.15 \
      --end-frame brand-originals/bloom-source/end-frame-emblem-1920x1080.png --blend-from 2.7 --blend-to 3.5 --end-at 3.5

Outputs: OUT_DIR/bloom.mp4 (H.264), OUT_DIR/bloom.webm (VP9), OUT_DIR/bloom-poster-frame.png (last frame, for review),
         OUT_DIR/bloom.json (dimensions/fps/duration/crop for the player).
"""
import argparse, json, os, subprocess, sys
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

LOGO_W, LOGO_H = 1536, 864          # logo-space canvas the AI video / end frame are registered to

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--width', type=int, default=1152, help='output colour width in px (height follows the crop aspect)')
ap.add_argument('--fps', type=float, default=0, help='0 = keep the source frame rate (recommended). Anything else RESAMPLES.')
ap.add_argument('--crop', default=None, help='x,y,w,h in logo space (1536x864) to keep')
ap.add_argument('--t0', type=float, default=5.0, help='distance from plum below which a pixel is fully transparent')
ap.add_argument('--t1', type=float, default=26.0, help='distance from plum above which a pixel is fully opaque')
ap.add_argument('--crf-h264', type=int, default=24)
ap.add_argument('--crf-vp9', type=int, default=38)
ap.add_argument('--hold-last', type=float, default=0.0, help='seconds to freeze the last frame (prefer a player-side hold)')
ap.add_argument('--trim-start', type=float, default=0.0, help='seconds to drop from the start')
ap.add_argument('--end-at', type=float, default=None, help='source-time second after which no more frames are written')
ap.add_argument('--end-frame', help='EXACT approved end frame (emblem on flat plum, 16:9). The video dissolves to it at the end.')
ap.add_argument('--blend-from', type=float, default=None, help='second at which the dissolve toward --end-frame begins')
ap.add_argument('--blend-to', type=float, default=None, help='second at which the frame equals --end-frame exactly')
args = ap.parse_args()
os.makedirs(args.out, exist_ok=True)

# source fps (native, unless explicitly overridden)
pr = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', args.src], capture_output=True, text=True).stdout.strip()
num, den = (pr.split('/') + ['1'])[:2]
src_fps = float(num) / float(den)
FPS = args.fps if args.fps else src_fps
resample = bool(args.fps) and abs(args.fps - src_fps) > 1e-3
if resample:
    print(f'WARNING: resampling {src_fps:g} -> {args.fps:g} fps will drop/duplicate frames and hurt smoothness', file=sys.stderr)

cx, cy, cw, ch = (0, 0, LOGO_W, LOGO_H)
if args.crop:
    cx, cy, cw, ch = (int(v) for v in args.crop.split(','))
W = args.width - (args.width % 2)
H = int(round(W * ch / cw)); H -= H % 2

def chain(extra=''):
    c = f'scale={LOGO_W}:{LOGO_H}:flags=lanczos'
    if args.crop: c += f',crop={cw}:{ch}:{cx}:{cy}'
    return c + f',scale={W}:{H}:flags=lanczos' + extra

dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', args.src, '-vf', chain(f',fps={args.fps:g}' if resample else ''), '-fps_mode', 'passthrough' if not resample else 'cfr',
                        '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
fsize = W * H * 3
kf = max(1, int(round(FPS * 2)))

def enc_cmd(codec_args, path):
    return ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H*2}', '-r', f'{FPS:g}', '-i', '-',
            '-an', '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'] + codec_args + [path]

mp4 = subprocess.Popen(enc_cmd(['-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-crf', str(args.crf_h264), '-preset', 'slow',
                                '-x264-params', f'keyint={kf}:min-keyint={kf}', '-movflags', '+faststart'], os.path.join(args.out, 'bloom.mp4')), stdin=subprocess.PIPE)
webm = subprocess.Popen(enc_cmd(['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', str(args.crf_vp9), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1', '-g', str(kf)],
                                os.path.join(args.out, 'bloom.webm')), stdin=subprocess.PIPE)

END = None
if args.end_frame:
    e = Image.open(args.end_frame).convert('RGB').resize((LOGO_W, LOGO_H), Image.LANCZOS)
    if args.crop: e = e.crop((cx, cy, cx + cw, cy + ch))
    END = np.array(e.resize((W, H), Image.LANCZOS)).astype(np.float32)
smooth = lambda x: x * x * (3 - 2 * x)
bg = None
frames = 0
src_i = 0
last = None
def write_frame(stacked):
    b = stacked.tobytes()
    mp4.stdin.write(b); webm.stdin.write(b)

while True:
    buf = dec.stdout.read(fsize)
    if len(buf) < fsize:
        break
    P = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
    t_src = src_i / FPS; src_i += 1
    if t_src < args.trim_start - 1e-6:
        continue
    if args.end_at is not None and t_src > args.end_at + 1e-6:
        break
    t = t_src - args.trim_start
    if END is not None and args.blend_from is not None:
        k = float(np.clip((t - (args.blend_from - args.trim_start)) / max(1e-6, (args.blend_to - args.blend_from)), 0, 1))
        if k > 0:
            k = smooth(k); P = (1 - k) * P + k * END      # dissolve toward the exact approved frame (still on flat plum)
    if bg is None:  # background colour = median of the border of the first frame
        band = np.concatenate([P[:12].reshape(-1, 3), P[-12:].reshape(-1, 3), P[:, :12].reshape(-1, 3), P[:, -12:].reshape(-1, 3)])
        bg = np.median(band, axis=0)
        print('estimated background colour', bg.tolist(), file=sys.stderr)
    d = np.sqrt(((P - bg) ** 2).sum(2))
    a = np.clip((d - args.t0) / (args.t1 - args.t0), 0, 1)
    # fill enclosed holes: dark petal shadows are close to the plum and would otherwise stay translucent
    core = ndi.binary_fill_holes(a > 0.35)
    interior = ndi.binary_erosion(core, iterations=3)
    a = np.where(interior, 1.0, a)
    a3 = a[..., None]
    F = np.where(a3 > 0.02, (P - (1 - a3) * bg) / np.maximum(a3, 0.02), 0).clip(0, 255)   # un-mix from the plum
    C = (F * a3)                                                                           # premultiplied colour
    A = np.repeat((a * 255)[..., None], 3, axis=2)
    stacked = np.concatenate([C, A], axis=0).clip(0, 255).astype(np.uint8)
    write_frame(stacked); last = stacked; frames += 1

hold = int(round(args.hold_last * FPS))
for _ in range(hold):
    write_frame(last)
for p in (mp4, webm):
    p.stdin.close(); p.wait()
dec.kill()   # we may have stopped reading early (--end-at); don't wait for a decoder blocked on a full pipe
dec.wait()

dur = (frames + hold) / FPS
json.dump({'width': W, 'height': H, 'stackedHeight': H * 2, 'fps': FPS, 'frames': frames + hold, 'duration': round(dur, 4),
           'logoSpace': {'w': LOGO_W, 'h': LOGO_H}, 'crop': {'x': cx, 'y': cy, 'w': cw, 'h': ch}}, open(os.path.join(args.out, 'bloom.json'), 'w'))
if last is not None:
    C = last[:H].astype(np.float32); A = last[H:, :, 0:1].astype(np.float32) / 255
    out = (C + (1 - A) * np.array([76, 31, 49])).clip(0, 255).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(args.out, 'bloom-poster-frame.png'))
print(f'packed {frames} frames (+{hold} hold) @ {FPS:g} fps -> {dur:.3f}s, colour {W}x{H} (stacked {W}x{H*2}), crop {cx},{cy},{cw},{ch}')
