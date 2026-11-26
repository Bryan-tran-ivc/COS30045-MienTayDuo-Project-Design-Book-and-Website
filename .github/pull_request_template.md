## What
<!-- One or two sentences: what changed, which files. -->

## Why (task ID)
<!-- Task ID from the planner, e.g. 1.3, and what it is for. -->

## How tested
<!-- Server + tests, and anything you checked by hand (keyboard, screen sizes). -->

## Checklist
- [ ] One task = one commit; message is `<type>(<scope>): <summary> [<task id>]`
- [ ] `node tests/check-site.mjs` passes (or the failing checks are explained above)
- [ ] No console errors on the pages I changed
- [ ] axe: no serious or critical violations
- [ ] Screenshots at 375, 768 and 1280 px look right (attach them if the UI changed)
- [ ] Every new or changed JS/CSS file starts with the header comment (File, Purpose, Project)
- [ ] Accessibility code is marked with `// A11Y:` (CSS: `/* A11Y: */`)
- [ ] Numbers in page text come from `data-stat` spans, not typed by hand
- [ ] Nothing in `data/` was edited by hand
- [ ] I only changed files I own, or the other owner agreed (see the planner's "File dùng chung" tab)
