# Core Wallpaper — Clean Animation Plan

**Goal:** Make the animation feel clean, intentional, and premium instead of busy — while keeping the
logo as the hero, the core as the only light source, and the 48s seamless loop + beat-locked motion intact.

---

## Diagnosis (current state)

~21 independently-animated systems compete for attention, plus ~24 animated SVG blur filters:

| System | Elements | Notes |
|---|---|---|
| Core logo | coreStage (DVD sweep), frame, diamond (spin), dGlow | hero — keep |
| Light | bloom1/2, rays, chroma, sheen, rim, fire, spec (key-light) | 8 layers, redundant speculars |
| Particles | canvas stream, 6 spark twinkles, up to 130 dust motes | high noise floor |
| Rings/orbits | ring1/2, dot1/2 | 4 |

**Problems:**
1. **Clutter** — too many simultaneous motions; the hero competes with decorative noise.
2. **Performance** — animated `filter: blur()` (24 uses) is the most expensive thing to animate;
   slows the live wallpaper and drastically slows video capture.
3. **Inconsistent easing** — ad-hoc math on many systems, so they don't read as one organism.

---

## Recommendation: "Hero + Atmosphere"

Collapse the many systems into a few unified, purposeful motions.

### Phase 1 — Declutter
- Collapse the specular stack (`spec` + `twinkle` + `fire` + `chroma`) into **one** moving
  specular highlight on the crystal.
- Cut `dust` (130 → ~20) or remove; remove the 6 `spark` twinkles.
- Reduce 5 drifting nebulas → 2–3 **static** (rays + sweep already provide motion).
- Unify the canvas trail into one coherent stream.

### Phase 2 — Unify easing & timing
- Easing tokens: `easeInOutSine`, `easeOutQuart`, `easeInCubic` (a small named set, no magic numbers).
- Derive **every** period from the beat grid (0.5s) and loop divisors (4/6/8/12/24/48s).
- Phase-lock all systems to the downbeat grid so they breathe together.

### Phase 3 — Performance & cleanliness
- Replace animated SVG blur filters with **pre-blurred layered radial gradients**, animated
  only via `transform`/`opacity`.
- Everything GPU-composited; `will-change` only on the few animated layers.
- Direct benefit: smoother live playback + **much faster** frame capture.

### Phase 4 — Light discipline
- One key-light; the core remains the single light source; background stays dark.

### Phase 5 — Verify & render
- Loop-seam check (frame 0 vs 2879 diff), beat-alignment check, dark-corner check.
- Re-render 1920×1080 / 60fps / 48s, re-mux tuned audio.

---

## Success criteria
- Frame 0 vs 2879 mean diff ≈ 0 (seamless).
- Every downbeat aligns with spin extreme + light pulse (beat-locked).
- Corners remain dark (core = only light source).
- Fewer animated systems (~21 → ~8) with consistent easing.
- Capture time drops materially (blur reduction).
