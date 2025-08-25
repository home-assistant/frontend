# Fix for PWA Title Bar Color Mismatch (Issue #26512)

## Summary

This fix exports a new `DefaultThemeColor` constant from the Home Assistant frontend that resolves to the correct theme color value (`#009ac7`). This constant should be used by Home Assistant Core instead of hardcoded color values to prevent PWA title bar flicker.

## The Problem

1. PWA title bar initially shows incorrect color (e.g. `#2980b9` or `#03A9F4`)
2. Frontend JavaScript later updates theme-color meta tag to correct color (`#009ac7`)
3. This causes visible flicker during PWA startup
4. Root cause: Core uses hardcoded value that doesn't match frontend CSS variables

## The Solution

### Frontend Changes (This PR)

- Added `DefaultThemeColor` export in `src/resources/theme/color/color.globals.ts`
- Re-exported from `src/resources/theme/color/index.ts` for easier access
- Uses `extractVar()` with variable resolution to get the correct color value

### Core Integration (Required Follow-up)

The Home Assistant Core team should:

1. Import the new constant:

   ```python
   from homeassistant.components.frontend.theme import DefaultThemeColor
   ```

2. Use it instead of hardcoded values:

   ```python
   # Instead of:
   THEME_COLOR = "#03A9F4"  # or "#2980b9"

   # Use:
   THEME_COLOR = DefaultThemeColor  # resolves to "#009ac7"
   ```

## Color Resolution Chain

```
--app-theme-color: var(--app-header-background-color)
--app-header-background-color: var(--primary-color)
--primary-color: var(--ha-color-primary-40)
--ha-color-primary-40: #009ac7
```

The `extractVar()` function resolves this chain to the final hex value `#009ac7`.

## Verification

- Current frontend JavaScript sets: `#009ac7` ✅
- New `DefaultThemeColor` resolves to: `#009ac7` ✅
- Previous Core hardcoded value: `#2980b9` ❌ (mismatch)

## Benefits

- Eliminates PWA title bar color flicker
- Ensures consistency between initial HTML and frontend JavaScript
- Maintains single source of truth for theme colors
- Automatically updates if core palette changes

## Testing

Run the verification script to confirm color resolution:

```bash
node /tmp/theme-color-verification.js
```

## Files Modified

- `src/resources/theme/color/color.globals.ts` - Added `DefaultThemeColor` export
- `src/resources/theme/color/index.ts` - Re-exported constant

## Next Steps

1. ✅ Frontend changes complete (this PR)
2. ⏳ Core team needs to update Home Assistant Core to use the new constant
3. ⏳ Test PWA title bar behavior after Core changes
