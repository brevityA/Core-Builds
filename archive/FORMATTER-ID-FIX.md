# Apex Template — Formatter ID Fix

## The Problem
The Apex template (`core-nexus-4k-apex.json`) used `formatter.id: "core-clean"`, but **AIOStreams only recognizes `"tamtaro"`** as the built-in formatter schema ID. This caused a "Formatter id error" when importing the template.

## Root Cause
The configurator correctly generates formatters with `id: 'tamtaro'` (see `app.js` line ~buildFinal), but the **static template file** in `Templates/Torbox/Single/core-nexus-4k-apex.json` had a stale `id: 'core-clean'` that AIOStreams doesn't understand.

The AIOStreams schema requires:
- `formatter.id` must be `"tamtaro"` (the only built-in formatter slot)
- `formatter.definitions.overrides.tamtaro` must contain the custom `name` and `description` (description maps to AIOStreams' `d` field)

## Fix Applied
**File:** `Templates/Torbox/Single/core-nexus-4k-apex.json`
- Changed `formatter.id` from `"core-clean"` → `"tamtaro"`
- Renamed `formatter.definitions.overrides.core-clean` → `formatter.definitions.overrides.tamtaro`

**File:** `Formatters/core-clean.json`
- Same fix applied for consistency

## Verification
- ✅ All 197 pytest tests pass
- ✅ All 29 configurator unit tests pass
- ✅ All 25 static validations pass
- ✅ Formatter id and override key now match

## Why This Wasn't Caught Earlier
The validator (`tests/test_validate_template.py`) has a test `test_tamtaro_correct_override_key_passes` that checks `id: 'tamtaro'` with matching override key — but this only runs against template files that the validator processes. The Apex template was likely generated before the validator was added (v2.78) or the validator skips files that don't go through the build pipeline.

## How to Prevent
Consider adding a validation rule that checks ALL template JSON files under `Templates/` and `Community-Templates/` have `formatter.id === 'tamtaro'` when a custom formatter is embedded.
