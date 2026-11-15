# Change history

## 2026-11-15

- Rebuilt the review interface with a neutral shell, dark image canvas, restrained rust accents, more legible measurements and an original registration-frame logo/favicon.
- Added explicit comparison input provenance and the tolerance equation to every report.
- Kept the verdict rule independent of rounded display values and exposed the exact unrounded change on the measurement.
- Reflowed the mobile run log into labelled summaries and added a skip link and pressed states for source modes.
- Kept the creation form focused by hiding the previous report while a new comparison is configured.
- Separated connection and action errors so polling cannot erase a failed acceptance; added a browser regression check for this behavior.
- Updated the bundled fixture and regenerated desktop, mobile, difference, configuration, baseline and history evidence.
- Refreshed compatible transitive dependencies. The resulting dependency audit reports no known vulnerabilities.

Real Chromium captures, uploaded PNG comparison, all four review modes, immutable baseline acceptance, queue admission and restart recovery continue to use the existing backend.
