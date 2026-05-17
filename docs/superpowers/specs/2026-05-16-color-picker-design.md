# Custom HSL Color Picker — Design Spec

## Motivation

The native `<input type="color">` exposes the full color spectrum, allowing users to select pure white (`#ffffff`) and pure black (`#000000`). These values cause usability issues in the theme system — white on white or black on black makes UI elements invisible.

The existing accent picker works around this with a post-selection guard, but the 4 custom theme pickers have no guard at all. A custom color picker with built-in clamping is cleaner and covers all pickers uniformly.

## Component: `ColorPicker.svelte`

Located at `src/lib/components/ColorPicker.svelte`.

### Props

| Prop            | Type                    | Default     | Description                           |
| --------------- | ----------------------- | ----------- | ------------------------------------- |
| `value`         | `string`                | `'#3b82f6'` | Current hex color                     |
| `oncolorchange` | `(hex: string) => void` | —           | Called when user picks a new color    |
| `label`         | `string \| undefined`   | —           | Optional label shown above the picker |

### Internal state

| Variable     | Range          | Derivation                                        |
| ------------ | -------------- | ------------------------------------------------- |
| `hue`        | 0–360          | From `value` via HSL conversion                   |
| `saturation` | 0–100          | From `value` via HSL conversion                   |
| `lightness`  | 8–92 (clamped) | From `value` via HSL conversion, clamped on write |

Lightness is clamped to `[8%, 92%]` — approximately `#141414` to `#ebebeb`. This ensures the selected color always has enough contrast to be visible on both light and dark backgrounds.

### Layout

```
┌──────────────────────────────────┐
│ ● #3b82f6                       │  ← hex input + swatch
│                                  │
│  ┌────────────────────────────┐  │
│  │      S/L Field (canvas)    │  │  ← 200×150 px
│  │  S ←────── 100% ──────→    │  │     indicator ○
│  │  L ↑                      │  │
│  │  8% │                      │  │
│  │     │                      │  │
│  │  92%│                      │  │
│  │     └──────────────────────┘  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │   Hue Strip (canvas)       │  │  ← 200×16 px
│  │   ████████████████████████  │  │     indicator ▽
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### Rendering

**S/L field (canvas 200×150):**

- Background rendered once per hue change.
- For each pixel `(x, y)`:
  - `S = x / width * 100`
  - `L = 8 + (92 - 8) * (1 - y / height)` (top = 92% lightness, bottom = 8%)
  - Convert `HSL(H, S%, L%)` to RGB, fill pixel.
- Overlay a circle indicator at the current `(S, L)` position.

**Hue strip (canvas 200×16):**

- Horizontal gradient from `hsl(0, 100%, 50%)` → `hsl(60, ...)` → ... → `hsl(360, ...)`.
- Rendered once on mount (hue gradient is hue-independent).
- Triangle/line indicator at current hue position.

### Interaction

- **Click/drag on S/L field**: Update `saturation` and `lightness`. Emit new hex via `oncolorchange`.
- **Click/drag on hue strip**: Update `hue`. Re-render S/L field. Emit new hex.
- **Hex input**: Validate on every `input` event. If valid 6-char hex, update HSL state and re-render. If invalid or incomplete, do nothing (don't clear the field — let the user finish typing). On `blur`, if the field contains an invalid hex, revert the display to the current valid color.
- **External `value` change** (e.g., preset theme load): Re-derive `hue`, `saturation`, `lightness` from new hex via HSL conversion.

### HSL ↔ Hex utilities

Pure functions, extracted to `src/lib/utils/color.js`:

```js
hexToHsl(hex: string): { h: number, s: number, l: number }
hslToHex(h: number, s: number, l: number): string
clampLightness(l: number, min = 8, max = 92): number
```

Reuse `toSafeHex` logic from `themeStore.svelte.js` internally.

### Edge cases

- **Empty/invalid hex input**: Revert to previous valid color.
- **Rapid drag outside canvas**: Clamp to canvas bounds, same as edge behavior.
- **Dark mode**: The S/L field is always rendered with the same HSL gradient — no dark mode adjustment needed since the canvas draws its own colors.
- **Very low saturation**: Greys are fine — they won't be pure black/white since L is clamped.

## Integration: Settings page

Replace the 5 `<input type="color">` elements in `src/routes/(app)/settings/+page.svelte`:

| Section      | Lines   | Replacement                                           |
| ------------ | ------- | ----------------------------------------------------- |
| Accent color | 163–179 | `<ColorPicker>` with `value={themeStore.accentColor}` |
| Background   | 190–196 | `<ColorPicker>` with `value={themeStore.bgColor}`     |
| Card         | 203–208 | `<ColorPicker>` with `value={themeStore.cardColor}`   |
| Text         | 216–220 | `<ColorPicker>` with `value={themeStore.textColor}`   |
| Border       | 229–234 | `<ColorPicker>` with `value={themeStore.borderColor}` |

Remove the `#ffffff`/`#000000` guard in the accent handler (lines 171–177) — the component handles that internally.

Remove the content of `TODO.md` line 3 since this will be done.

## Files changed

| File                                     | Change                                                           |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `src/lib/components/ColorPicker.svelte`  | **New** — custom color picker component                          |
| `src/lib/utils/color.js`                 | **New** — HSL↔Hex utility functions                              |
| `src/routes/(app)/settings/+page.svelte` | **Edit** — replace 5 `<input type="color">` with `<ColorPicker>` |
| `TODO.md`                                | **Edit** — remove line 3 (completed task)                        |

## Out of scope

- No touch gesture handling (desktop-first for now).
- No keyboard accessibility beyond the hex input field (improved a11y can be a follow-up).
- No animation on the indicator.
