# Core Builds — Live Wallpaper

1080p seamless loop wallpaper of the Core Builds mark (lit hex + faceted crystal),
with a dark lo-fi sci-fi score and beat-locked motion.

## Files
- **core-wallpaper-1080p.mp4** — 1920×1080, 60fps, 48s seamless loop (H.264 + AAC).
- **core-wallpaper.html** — self-contained live wallpaper (all code + audio embedded;
  tap/click once to start sound). Runs in any modern browser.
- **final_master.mp3** — the 48s seamless audio track on its own.
- **CLEAN_ANIMATION_PLAN.md** — the design/cleanup plan for reference.
- **source/** — build scripts (see below).
- **assets/** — the raw audio used to build the score.

## Highlights
- Core logo is the single light source; dark single-source scene.
- Motion phase-locked to a 120 BPM beat grid (spin extremes, light pulse, ring flares, SFX all
  land on the downbeats).
- Colour light bleeds into the background; nebulas flare as the rings fade out.
- Seamless: both the video loop and the audio loop wrap with no discontinuity.
- Subtle background dust motes + a coherent particle stream.

## Build pipeline (reproduce from source)
1. `python3 source/build_loop.py` — builds the 48s seamless dark-lofi base from `assets/open-space.mp3`.
2. `python3 source/mix_final.py` — mixes base + drone + beat-synced SFX into `final_master.mp3`.
3. `python3 source/build_wall.py` — generates `core-wallpaper.html` (animation only).
4. `python3 source/inject_audio_full.py` — embeds `final_master.mp3` into the HTML + tap-to-start.
5. Capture the HTML to frames, encode to H.264, mux with `final_master.mp3`.

Requires Python3 (numpy, scipy), ffmpeg, and a headless Chrome for the video capture.

## To preview
Open `core-wallpaper.html` in a browser and click once for sound. Play
`core-wallpaper-1080p.mp4` in any media player.
