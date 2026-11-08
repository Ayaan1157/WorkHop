# WorkHop Engineering & Data Integrity Rules

## 1. Absolute Rule on User Portfolio & Media Content
- **Zero Stock, Placeholder, or AI Content in Portfolios**:
  The WorkHop portfolio gallery may ONLY display media files that the freelancer actually uploaded (files in the authorized `portfolios` Supabase Storage bucket referenced by valid database records) or genuine external URLs entered by the user.
- **Never Substitute Failed or Missing Media**:
  If an image URL fails to load or is deleted, show the neutral "Image unavailable" tile. NEVER fall back to Unsplash, Picsum, demo graphics, or placeholder images.
- **Zero Fake / Invented Titles**:
  Portfolio titles may only come from what the freelancer typed. If none was provided, show no title or "Untitled". Never synthesize titles like "Work Sample 1" or "Work Sample 2".
- **Zero AI Badges / Sparkles**:
  Do not attach AI sparkle icons or "generated" labels to user uploads.
- **Honest Empty State**:
  If a freelancer has zero uploaded files, display "No portfolio images uploaded" and their external portfolio link if provided. Never fill the gallery with mock items.

## 2. Testing & Verification Guard
Run `node tests/test_portfolio_integrity.js` before any deployment. It guarantees that no forbidden stock image domains or synthetic title generators can exist in portfolio rendering code paths.
