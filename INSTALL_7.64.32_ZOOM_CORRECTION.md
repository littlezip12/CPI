# Water Polo HQ 7.64.32 — iPhone Zoom Correction

This correction is applied on top of the unpushed 7.64.32 patch.

It broadens `touch-action: manipulation` from individual scorer controls to the page/scorer root so rapid taps across adjacent controls are not interpreted by iOS Safari/WebView as a double-tap zoom gesture. Pinch zoom remains enabled.

After extracting at the repository root, run:

`./release-check-live-7.64.32`
