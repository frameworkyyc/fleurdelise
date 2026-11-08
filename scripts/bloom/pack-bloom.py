#!/usr/bin/env python3
"""
Pack the Higgsfield bloom video into a "stacked alpha" web video.

The AI video is rendered on flat Velvet Plum. This script keys the plum out (with colour recovery on soft edges),
then writes ONE ordinary video in which the top half is the premultiplied colour and the bottom half is the alpha
matte as greyscale. The browser composites it on a <canvas> (src/scripts/bloom.ts), so the animation floats over the
hero's real background (grid texture, glow) with no visible rectangle — and no codec-specific alpha support is needed
(works in Safari/iOS, Chrome, Firefox).

Usage:
  python3 scripts/bloom/pack-bloom.py INPUT.mp4 OUT_DIR [--width 1280] [--fps 24] [--hold-last 0]

Outputs: OUT_DIR/bloom.mp4 (H.264), OUT_DIR/bloom.webm (VP9), OUT_DIR/bloom-poster-frame.png (last frame, for review),
         OUT_DIR/bloom.json (width/height/duration/fps for the player).
"""
import argparse, json, os, subprocess, sys
import numpy as np
from scipy import ndimage as ndi

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--width', type=int, default=1280)
ap.add_argument('--fps', type=int, default=24)
ap.add_argument('--t0', type=float, default=5.0, help='distance from plum below which a pixel is fully transparent')
ap.add_argument('--t1', type=float, default=26.0, help='distance from plum above which a pixel is fully opaque')
ap.add_argument('--crf-h264', type=int, default=21)
ap.add_argument('--crf-vp9', type=int, default=33)
ap.add_argument('--hold-last', type=float, default=0.0, help='seconds to freeze the last frame (stillness before hand-off)')
ap.add_argument('--trim-start', type=float, default=0.0, help='seconds to drop from the start')
ap.add_argument('--end-frame', help='EXACT approved end frame (emblem on flat plum, 16:9). The video dissolves to it at the end.')
ap.add_argument('--blend-from', type=float, default=None, help='second at which the dissolve toward --end-frame begins')
ap.add_argument('--blend-to', type=float, default=None, help='second at which the frame equals --end-frame exactly')
args = ap.parse_args()
os.makedirs(args.out, exist_ok=True)

W = args.width - (args.width % 2)
H = int(round(W * 9 / 16)); H -= H % 2

# decode: scale to WxH (the video is 16:9), constant fps, raw rgb24
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', args.src, '-vf', f'scale={W}:{H}:flags=lanczos,fps={args.fps}', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'],
                       stdout=subprocess.PIPE)
fsize = W * H * 3

def enc_cmd(codec_args, path):
    return ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H*2}', '-r', str(args.fps), '-i', '-',
            '-an', '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'] + codec_args + [path]

mp4 = subprocess.Popen(enc_cmd(['-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-crf', str(args.crf_h264), '-preset', 'slow',
                                '-x264-params', 'keyint=48:min-keyint=48', '-movflags', '+faststart'], os.path.join(args.out, 'bloom.mp4')), stdin=subprocess.PIPE)
webm = subprocess.Popen(enc_cmd(['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', str(args.crf_vp9), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1'],
                                os.path.join(args.out, 'bloom.webm')), stdin=subprocess.PIPE)

from PIL import Image
END = None
if args.end_frame:
    END = np.array(Image.open(args.end_frame).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
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
    t_src = src_i / args.fps; src_i += 1
    if t_src < args.trim_start:
        continue
    t = t_src - args.trim_start
    if END is not None and args.blend_from is not None:
        k = float(np.clip((t - (args.blend_from - args.trim_start)) / max(1e-6, (args.blend_to - args.blend_from)), 0, 1))
        if k > 0:
            k = smooth(k); P = (1 - k) * P + k * END      # dissolve toward the exact approved frame (still on flat plum)
    if bg is None:  # background colour = median of the border of the first frame
        band = np.concatenate([P[:20].reshape(-1, 3), P[-20:].reshape(-1, 3), P[:, :20].reshape(-1, 3), P[:, -20:].reshape(-1, 3)])
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

hold = int(round(args.hold_last * args.fps))
for _ in range(hold):
    write_frame(last)
for p in (mp4, webm):
    p.stdin.close(); p.wait()
dec.wait()

dur = (frames + hold) / args.fps
json.dump({'width': W, 'height': H, 'stackedHeight': H * 2, 'fps': args.fps, 'frames': frames + hold, 'duration': round(dur, 3)}, open(os.path.join(args.out, 'bloom.json'), 'w'))
# review image: last frame composited on plum
if last is not None:
    from PIL import Image
    C = last[:H].astype(np.float32); A = last[H:, :, 0:1].astype(np.float32) / 255
    out = (C + (1 - A) * np.array([76, 31, 49])).clip(0, 255).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(args.out, 'bloom-poster-frame.png'))
print(f'packed {frames} frames (+{hold} hold) -> {dur:.2f}s at {W}x{H} (stacked {W}x{H*2})')
