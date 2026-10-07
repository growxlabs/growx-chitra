# Growx Chitra demo video

Isolated Remotion source for the site's 9-second, 1200 × 1500 product-photo demonstration. It runs at 30 fps with no audio.

## Commands

```powershell
npm run dev
npm run lint
npm run render
```

`npm run render` exports VP8 WebM, H.264 MP4 and a poster frame to `../public/video/`. The Astro site references only those rendered assets; the Remotion and React dependencies stay in this folder.

Source photos live in `public/images/` and are copied from the Astro site's existing Before/After product images.
