---
name: ha-frontend-demo
description: Home Assistant standalone demo structure, configurations, URL navigation, mocked APIs, shared demo stubs used by gallery, and verification. Use when changing files under demo/, changing gallery consumers of demo/src/stubs/, or running and validating the demo.
---

# HA Frontend Demo

Use this skill for standalone demo work and changes to shared demo stubs consumed by the gallery. Follow the persistent repository guidance in `AGENTS.md` and load matching specialist skills alongside this skill, especially `ha-frontend-testing` when running or validating the demo.

## Purpose

The demo is the full Home Assistant frontend running against a mocked backend and is published at <https://demo.home-assistant.io>. It needs no Home Assistant server, which makes it the easiest way to load the real UI in a browser, for example to take screenshots.

## Running The Demo

Run commands from the repository root:

```bash
pnpm dev:demo               # Development server on http://localhost:8090
pnpm dev:demo --background  # Detached; also supports --status/--stop/--logs
```

Use the E2E workflows documented in `ha-frontend-testing` when validating the demo.

## Opening A Specific Demo

The demo contains multiple demo configurations. Select one directly with the `demo` query parameter, for example `http://localhost:8090/?demo=<slug>`. The valid slugs are defined in `demoConfigs` in `demo/src/configs/demo-configs.ts`, so "the second demo" means the slug of the second entry in that list. An unknown slug falls back to the default, which is the first entry.

## Opening A Specific Page

The demo build uses hash-based routing: the frontend path goes in the URL hash, and the `demo` query parameter goes before the `#`. The URL format is:

```text
http://localhost:8090/?demo=<slug>#/<path>
```

Useful paths:

- `/lovelace/0`: The selected demo's dashboard, also the default when no hash is given.
- `/energy`: The energy dashboard. Its tabs are views: `/energy/overview` (Summary), `/energy/electricity`, `/energy/gas`, `/energy/water`, and `/energy/now`.
- `/map`, `/history`, `/todo`, `/config`: Other sidebar panels.

For example, the water tab of the energy dashboard of the second demo is:

```text
http://localhost:8090/?demo=<second slug>#/energy/water
```

## Screenshots Of A Single Card

Use Playwright from the repository dependencies, with a 1280 by 900 viewport and a device scale factor of 1.
If its browser is missing, run `pnpm exec playwright install chromium`.
Demo data follows the current date.

`page.locator("<card element> ha-card").first().screenshot()` crops to the card edges.
To add a margin or set the width, move the card element into a fixed wrapper and capture the wrapper.
Set the wrapper width to the target image width minus twice the padding, for example to match an image being replaced.
This also works for a card that its view places over other content, such as the energy date picker bar, where a clip with a margin would include the charts below it:

```ts
const host = page.locator("hui-energy-date-selection-card").first();
await host.evaluate((el) => {
  const wrap = document.createElement("div");
  wrap.id = "screenshot-wrap";
  wrap.style.cssText =
    "position:fixed;top:0;left:0;z-index:100000;padding:4px;width:631px;background:var(--primary-background-color);";
  document.body.appendChild(wrap);
  wrap.appendChild(el);
});
await page.locator("#screenshot-wrap").screenshot({ path: "card.png" });
```

The moved card keeps its theme and data but loses the styling of its view position, so the energy date picker renders as a regular card with a border.

## Structure

- `demo/src/ha-demo.ts`: Root element that sets up all backend mocks.
- `demo/src/configs/<slug>/`: One directory per demo configuration, containing entities, dashboard, and theme data.
- `demo/src/configs/demo-configs.ts`: Registry of demo configurations and URL slug handling.
- `demo/src/stubs/`: Mocked WebSocket and REST APIs.
- `demo/script/develop_demo`, `demo/script/build_demo`: Development server and static build wrappers.

## Core Data

The service descriptions in `src/fake_data/demo_services.ts` and the trigger and condition descriptions and icons in `demo/src/stubs/automation_platforms_*.ts` are generated from Home Assistant Core. Do not edit them by hand. Run `script/gen_demo_core_data` to regenerate them from the core `dev` branch, and add a domain to the lists in `build-scripts/gulp/gen-demo-core-data.js` when the demo needs its services, triggers, or conditions. Their translations come from the backend translations merged into the demo build.

## Shared Gallery Stubs

`demo/src/stubs/` is shared, not demo-private: gallery pages import from it directly. Before changing or removing anything a stub does, search for its callers across `demo/src/` and `gallery/src/`, then check the affected gallery pages as well as the demo.

The two consumers use a stub differently, so demo behavior does not predict gallery behavior. A gallery page calls stubs against the `hass` from `provideHass`, where `hass.config` is the shared `demoConfig` object. A stub that mutates `hass.config` in place is therefore visible to the page. `demo/src/ha-demo.ts` copies `components` into a new array before the stubs run, so the same mutation never reaches the demo. A change can look correct in the demo while quietly breaking a gallery page.

## Verification

Load `ha-frontend-testing` and use its demo and gallery workflows. Validate both consumers when changing shared stubs. Documentation-only changes do not require code tests unless examples or commands change.
