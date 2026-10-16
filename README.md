# Brian's Big Garage — Episode 1 prototype

Interactive animated STEM comic built from `PRD.md` (v1.0). Episode 1, *The Car That Wouldn't Move*: 20 pages, 60 panels, 4 optional challenges (spot the clue, choose a plan, count the wheels, make a prediction).

- `content/S01E01.json` — the episode script in the PRD §15 content model (edit this to change the story)
- `engine/template.html` — reader engine; draws every panel as SVG from the JSON
- `content/S01E02.json` → `dist/S01E02.html` — Episode 2, *The Mystery of the Missing Wheels* (12-page short)
- `content/S01E03.json` → `dist/S01E03.html` — Episode 3, *The Great Ramp Race* (12-page short)
- `content/S01E04.json` → `dist/S01E04.html` — Episode 4, *Inside the Mighty Engine* (12-page short)
- `content/S01E05.json` → `dist/S01E05.html` — Episode 5, *The Time-Travel Garage* (12-page short)
- `content/S01E06.json` → `dist/S01E06.html` — Episode 6, *Red Means Stop!* — localised road rules for Nigeria, Canada, UK, France, Germany, Australia, China and the US (reader asks for the country first)
- `dist/S01E01.html` — built, self-contained, works offline (just open it); episodes link to each other from the shelf
- `scripts/` — `validate.mjs`, `build.mjs`, `serve.mjs`

```bash
node scripts/validate.mjs content/S01E01.json && node scripts/build.mjs content/S01E01.json
```

Open `dist/S01E01.html?sheet` (served over http) for a contact sheet of all panels.

Reading: storybook mode by default — tap the page edges or swipe to turn; tap characters, cars, sound words and speech bubbles for little reactions (optional, nothing in the story depends on them). The ▦ Page button shows a whole comic page at once.

Status: M0/M1 creative prototype. All panels are `pending_review` — STEM, automotive, road-safety, accessibility and child-testing sign-offs (PRD §18) still needed. Read-aloud uses the device voice as a placeholder for recorded narration.

Reusable skill: `~/.claude/skills/animated-comic-storybook/`.

## Look and voice

Art follows the `comic-storybook-taste` skill (Afrocentric cast with signature accessories, warm paper + ink + ember accent, material-shaded cars, technical close-ups, monumental portrait cover). Read-aloud defaults to a Nigerian + British accent blend (Settings → Voice accent); the dialog shows which device voices are actually in use. Add recorded West African voice-actor clips with `"audio"` on dialogue lines and `"caption_audio"` on panels to replace device voices.
