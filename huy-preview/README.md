# Huy's four-page prototype

This is a local review build based on the available BITRE/ABS extracts. It is not yet integrated with the Week 12 site or Thong's shared navigation and data loader.

From this folder run `python3 -m http.server 8000`, then open `http://localhost:8000/story-winter.html`. The other pages are linked in the header. The prototype also includes bundled preview data for opening the HTML directly from disk. A web server remains the recommended way to test the CSV loading path. The local-file bundle is for preview only; the final integration should use the team’s shared CSV loader.

Pages: winter (season chart and year control), young people (age share and population rate), what can be done (bed-day scenario calculator), about (definitions and limitations). The four-page preview uses a temporary header; replace it with the team's shared template during integration. The CSVs are copied verbatim from the local MienTayDuo_Website folder.

The calculator is arithmetic, not a causal prediction. Verify final intervention citations against the Design Book before publishing.

## Keyboard and reading controls

Press Tab after the site name to reach the accessibility icon in the header; press Enter or Space to open its nonmodal settings panel. Tab and Shift+Tab move through the native controls; Escape closes the panel and returns focus to the icon. Escape also dismisses the icon tooltip when the icon has focus. Preferences for larger text, higher contrast and reduced motion are stored in this browser when storage is available. Chart marks show their exact values on pointer hover or keyboard focus, and Escape dismisses a visible chart tooltip. The Winter year-by-year dots can be selected with Enter or Space, or the year slider can be used with arrow keys. Play is disabled if reduced motion is active. Each chart has a data table and the relevant pages link to the source CSV extracts.

Visual and screen-reader testing on the actual integrated Week 12 site remains necessary before release.
