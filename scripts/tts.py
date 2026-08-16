#!/usr/bin/env python3
"""
Regenerasi narasi memakai edge-tts (gratis, tanpa API key).

Dipanggil workflow saat pengguna mengubah teks narasi atau memilih
suara/kecepatan berbeda. Menghasilkan public/audio/segN.mp3, lalu
build-timeline.mjs + build-audio.mjs mengurus sisanya — jadi durasi
scene otomatis menyesuaikan panjang narasi baru.

Pemakaian:
  python3 scripts/tts.py --voice id-ID-GadisNeural --rate +0% \
      --narration '{"seg1":"teks baru", ...}'
"""
import argparse
import asyncio
import json
import pathlib
import sys

try:
    import edge_tts
except ImportError:
    sys.exit("edge-tts belum terpasang: pip install edge-tts")

ROOT = pathlib.Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "audio"
CONTENT = ROOT / "src" / "config" / "content.mjs"


def default_narration() -> dict[str, str]:
    """Ambil narasi bawaan dari content.mjs tanpa menjalankan JS."""
    import re

    src = CONTENT.read_text(encoding="utf-8")
    out: dict[str, str] = {}
    # cocokkan blok  id: 'segN' ... narration: '...' / "..."
    for m in re.finditer(
        r"id:\s*['\"](\w+)['\"].*?narration:\s*(['\"])(.*?)(?<!\\)\2",
        src,
        re.S,
    ):
        out[m.group(1)] = m.group(3).replace("\\'", "'").replace('\\"', '"')
    return out


async def synth(text: str, voice: str, rate: str, out: pathlib.Path) -> None:
    # edge-tts menolak rate tanpa tanda; pastikan formatnya benar
    if not rate.startswith(("+", "-")):
        rate = "+" + rate
    c = edge_tts.Communicate(text, voice, rate=rate)
    await c.save(str(out))


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="id-ID-GadisNeural")
    ap.add_argument("--rate", default="+0%")
    ap.add_argument(
        "--narration",
        default="{}",
        help='JSON {"segN": "teks"} — hanya segmen yang disebut yang diganti',
    )
    a = ap.parse_args()

    try:
        override = json.loads(a.narration or "{}")
        if not isinstance(override, dict):
            override = {}
    except json.JSONDecodeError:
        print("! --narration bukan JSON valid, diabaikan")
        override = {}

    texts = default_narration()
    texts.update({k: v for k, v in override.items() if isinstance(v, str) and v.strip()})

    if not texts:
        sys.exit("tidak ada teks narasi yang ditemukan")

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    print(f"suara: {a.voice}  kecepatan: {a.rate}")

    for seg_id, text in sorted(texts.items()):
        out = AUDIO_DIR / f"{seg_id}.mp3"
        await synth(text, a.voice, a.rate, out)
        kb = out.stat().st_size / 1024
        print(f"  ✔ {seg_id}.mp3  {kb:5.0f} KB  “{text[:52]}…”")

    print(f"selesai — {len(texts)} segmen")


if __name__ == "__main__":
    asyncio.run(main())
