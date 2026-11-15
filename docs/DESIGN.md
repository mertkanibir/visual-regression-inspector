# Prism design notes

Prism is a measuring instrument for rendered pages. Its central object is the comparison report: two inputs, a reproducible environment, a measured result, and an acceptance decision. The interface gives these objects a stable hierarchy.

## Identity

The [Prism mark](../public/brand/prism-mark.svg) uses registration corners around an aligned frame. The small rust square represents a changed region. The symbol reads at favicon size and is used without a separate decorative icon container. The wordmark uses tracked capitals; the subtitle states what the tool does.

The SVG is original, editable source. It contains no external fonts, scripts, embedded images or remote references. The mark and all application code are covered by the repository's MIT license.

## Color and type

| Role | Color | Purpose |
| --- | --- | --- |
| Workspace | `#efeee8` | Warm neutral ground around reports |
| Report paper | `#fafaf6` | Inputs, measurements and annotations |
| Image canvas | `#1c211b` | Separates screenshots from interface chrome |
| Primary text | `#272b26` | Main copy and control labels |
| Rust | `#a83b20` | Current location, focus, and review status |
| Pass | `#256348` | Results within the configured tolerance |

Bundled Manrope handles navigation and explanatory text. The system monospace face handles IDs, addresses, timestamps and measurements. No network font request is required. Numeric values use tabular spacing, and status is always written in text as well as color.

## Workspace rules

- Keep the report next to its evidence. Source A and source B are labelled above the viewer; the threshold equation sits beside the verdict.
- Keep the application shell quiet. Hairlines, small corner radii and flat surfaces establish grouping without stacking decorative cards.
- Make the image canvas distinct. Image-view controls use the same dark surface across all four views. A baseline marker and candidate marker retain their meanings in every mode.
- Keep creation and review separate. Opening a comparison form hides the prior report until the form is closed or a new run is created.
- Reserve baseline acceptance for a reviewed result. It creates a reference without mutating the comparison that produced it.

## Responsive and keyboard behavior

At narrow widths, paired inputs and screenshots stack vertically. Measurements use a two-column grid; the run log becomes labelled summaries rather than a clipped desktop table. Image views remain scrollable at actual size. The workbench itself does not overflow the viewport.

The navigation exposes the current page. URL/PNG mode buttons expose their pressed state. Image tabs support arrow keys, Home and End, and provide a roving tab stop. Overlay and swipe retain native range inputs for keyboard adjustment. A skip link moves directly to the workspace, focus states stay visible on both light and dark surfaces, and progress respects reduced-motion preferences.

## Evidence and regeneration

Run `npm run build` followed by `npm run test:browser` to regenerate the desktop report, capture form, difference view, baseline library, history, mobile review, and the three source PNG artifacts in this directory. Captures use disposable local state and the deterministic project-settings fixture. Real private screenshots remain in the ignored data directory.

`before-workspace.png` records the previous interface. `screenshot.png` and `mobile.png` show the current implementation. To refresh the complete motion walkthrough as well, run `PRISM_RECORD_VIDEO=1 npm run test:browser` after building.

The fixture intentionally changes alignment, button shape/color and row spacing. Its results are environment-dependent evidence, not a performance benchmark. Acceptance followed by a candidate rerun must measure zero changed pixels in the same environment.
