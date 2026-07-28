# Demo Agent Instructions

This file applies to all files under `demo/`. Follow the root `AGENTS.md` for repository-wide standards.

The demo is the full Home Assistant frontend running against a mocked backend (published at https://demo.home-assistant.io). It needs no Home Assistant server, which makes it the easiest way to load the real UI in a browser, for example to take screenshots.

## Running the demo

Run from the repository root:

```bash
yarn dev:demo               # dev server on http://localhost:8090
yarn dev:demo --background  # detached; also supports --status/--stop/--logs
```

## Opening a specific demo

The demo contains multiple demo configurations. Select one directly with the `demo` query parameter, e.g. `http://localhost:8090/?demo=<slug>`. The valid slugs are defined in `demoConfigs` in `src/configs/demo-configs.ts`, so "the second demo" means the slug of the second entry in that list. An unknown slug falls back to the default (the first entry).

## Opening a specific page

The demo build uses hash-based routing: the frontend path goes in the URL hash, and the `demo` query parameter goes before the `#`. The URL format is:

```
http://localhost:8090/?demo=<slug>#/<path>
```

Useful paths:

- `/lovelace/0` — the selected demo's dashboard (also the default when no hash is given)
- `/energy` — energy dashboard. Its tabs are views: `/energy/overview` (Summary), `/energy/electricity`, `/energy/gas`, `/energy/water`, `/energy/now`
- `/map`, `/history`, `/todo`, `/config` — other sidebar panels

Example — the water tab of the energy dashboard of the second demo:

```
http://localhost:8090/?demo=<second slug>#/energy/water
```

## Structure

- `src/ha-demo.ts`: Root element; sets up all backend mocks.
- `src/configs/<slug>/`: One directory per demo configuration (entities, dashboard, theme).
- `src/configs/demo-configs.ts`: Registry of demo configurations and URL slug handling.
- `src/stubs/`: Mocked WebSocket/REST APIs.
- `script/develop_demo`, `script/build_demo`: Dev server and static build wrappers.

## The gallery imports these stubs too

`demo/src/stubs/` is shared, not demo-private: gallery pages import from it directly. Before changing or removing anything a stub does, grep for its callers across `gallery/` as well as `demo/`, and check the affected gallery pages, not just the demo.

```bash
grep -rn "stubs/<name>" demo/src gallery/src
```

The two consume a stub differently, so demo behavior does not predict gallery behavior. A gallery page calls stubs against the `hass` from `provideHass`, where `hass.config` is the shared `demoConfig` object, so a stub that mutates `hass.config` in place is visible to the page. `ha-demo.ts` copies `components` into a new array before the stubs run, so the same mutation never reaches the demo. A change can therefore look fine in the demo while quietly breaking a gallery page.
