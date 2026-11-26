# Internet & Mobile Plan Cost Calculator

Compare two real internet or mobile quotes over one to 120 months. [Open the calculator](https://coolcode.ca/plancost/).

<!-- coolcode:guide -->
Start with the internet promotion or mobile financing example, replace both offers and read the total and the month when switching starts saving money. Expand each offer for installation, device payments, end-of-term buyouts, credits and taxes. The bill table exports as CSV. Saving is optional and stays in your browser.
<!-- /coolcode:guide -->

## Expand or customize

Edit `web/examples.json` to add a named, illustrative scenario and a stable slug. The offline builder publishes a self-canonical page with the completed example, a calculated initial result and the full editable form. Enter any offers on any page.

Run `node --test tests/*.test.mjs`, `python3 -m unittest discover -s tests`, then `python3 scripts/build.py`. With Playwright Chromium installed run `python3 tests/browser_smoke.py`. Push to main for GitHub Pages. No API, scheduled collector or financial input leaves this browser. An optional anonymous CoolCode counter receives the app ID.
