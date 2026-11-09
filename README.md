# Photobooth

Website for a photo booth rental business (inflatable enclosed and 360 booths) serving LA and the surrounding counties.

Plain HTML, CSS and JavaScript: no build step. Open `index.html` to preview, or push to GitHub Pages.

## What's here
- `index.html` — the whole page: scroll-scrubbed hero video, What we do, What we offer (slider), Contact, navigation bar
- `frames/` — the hero video as 121 WebP frames (scrolling plays them)
- `images/` — booth cutouts (`booth-white.webp`, `booth-black.webp`, `booth-360.webp`) and the transparent 360 clip (`booth-360.webm`)
- `_scaffold/` — files from the original site starter (carousel page, booking calendar, SEO files). Not used by the current page.

## Placeholders to replace
- Business name ("Photobooth" in the nav bar and page title)
- Phone `555-555-0123` and email `hello@example.com` (Contact section)
- "What we do" photo and the photo-strip slot (save a transparent cutout as `images/photo-strips.png` and it appears automatically)
- 360 booth description and the rest of the draft copy
- Prices: $399 for a 3-hour minimum, $60 per additional hour (pricing cards and "at a glance")

## Notes
- The 360 clip is a transparent WebM, which Safari and iOS can't display, so they show the still image instead.
