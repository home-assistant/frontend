---
name: ha-frontend-query-params
description: Home Assistant frontend URL query param patterns. Use when keeping page state such as filters, search, sorting or grouping in the URL, adding or reading typed query params, using QueryParamsController or the data table's sync-url and column urlName, building in-app links with a query string, or adding params to My Home Assistant redirects.
---

# HA Frontend Query Params

Use this skill when implementing or reviewing state kept in the URL's query string, or links that set it. Cross-load `ha-frontend-lit` for the controller and lifecycle work, `ha-frontend-testing` for running tests, and `ha-frontend-review` when reviewing.

## Typed Params

`src/common/url/query-params.ts` turns a typed config into values and back:

- `QueryParamConfig` lists keys by type: `string`, `list` (one comma-separated param, `?label=a,b`), `date` (ISO string) and `boolean` (`{ key, trueValue }`, true only when the param equals `trueValue`).
- `QueryParamValues<typeof config>` is the matching partial values type.
- `decodeQueryParams(source, config)` reads a `SearchParamsSource` (a `URLSearchParams`, a plain record or a query string). Empty values are skipped.
- `createQueryString(values, config)` writes the values, leaving out empty strings, empty lists and false booleans.
- `updateQueryString(current, values, config)` replaces only the config's params in an existing query string and keeps every other param exactly as written.
- `hasQueryParams(source, config)` tells whether a URL has any of the config's params, which is how a page knows whether a link asked for anything.
- `serviceTargetFromQueryParams` and `queryParamsFromServiceTarget` map `HassServiceTarget` keys to list params.

Give each feature its own `*-query-params.ts` in `src/common/url/` holding its config (`as const satisfies QueryParamConfig`), its values type, and the helpers that turn params into page state and back. Follow the existing ones: `data-table-query-params.ts`, `marketplace-query-params.ts`, `history-logbook-query-params.ts` and `todo-query-params.ts`. Helpers in `src/data/` that build outside links use a local config the same way, as `src/data/integration.ts` and `src/data/system_log_report.ts` do. In new code, prefer these over hand-built `URLSearchParams`, string concatenation or `extractSearchParam` reads from `src/common/url/search-params.ts`.

## QueryParamsController

`src/common/controllers/query-params-controller.ts` keeps part of a page's state in the URL. Construct it with the host, the feature's config and options:

- `enabled()`: whether the host syncs right now. It can change, as on the Marketplace dashboard, which turns it off on the Discover tab.
- `navigated()`: called when the page's URL changes while the host is connected (`location-changed` or `popstate`), and when the host reconnects after its first update. Read the URL with `searchParams()`, apply it, then `write()` the state back.

Methods:

- `searchParams()` returns the current params, or `undefined` when the controller is disabled or the URL is on another path.
- `write(values, debounced?)` updates only the config's params with `replaceCurrentUrl`, so it replaces the current history entry. Pass `debounced` for values that change while typing; the write lands 300 ms after the last one and any later write replaces it.
- `flush()` writes a pending debounced write now. The data table calls it when the search box loses focus. Call it before anything that adds its own history entry, such as a dialog.

The controller binds to `currentPath()` when the host connects and does nothing while the URL is on another path. Navigating away drops a pending write. When a page is reached through a router `defaultPage` (such as `/marketplace` landing on `/marketplace/browse`), check that a link to the bare path still syncs, since the redirect may land after the host connects.

Read the URL yourself on the first render, after the initial state is set (in `willUpdate` before `hasUpdated`, or `firstUpdated`), and leave later navigations to `navigated()`. `ha-marketplace-dashboard.ts` and `lorawan-devices.ts` show both. When moving a page to the controller, remove its own `location-changed` and `popstate` listeners and any search kept in history state, since the controller replaces them.

When a router reuses one element for different items, such as one app's tab after another's, key it on the item so the controller binds again to the new path.

## URL Rules

- Writes replace the current history entry, so Back leaves the page instead of undoing each change. Push a new entry only for a deliberate navigation, such as picking another log provider.
- Debounce search writes. Write sort, group and filter changes straight away.
- Leave empty and default values out of the URL, such as an empty search or ascending direction.
- A param in the URL wins over stored preferences. A link with none of the page's params keeps what the user picked before; `hasQueryParams` makes that check.
- A link with any of the page's params replaces the search and every filter, since a filter left over from before would hide part of what the link shows. Show what the link applied, but don't store it: links often carry someone else's choices, such as a My Home Assistant link made with `m`. Store only what the user changes on the page, and only that setting.
- The URL is the whole state. Don't add filters while applying a link; a link that needs one, such as showing disabled devices, says so in its params (`status=disabled`).
- A link to a page that is already open must apply the new URL. Handle `navigated()`, not only the first render. The router often keeps a page alive, so this is the common case, not an edge case.
- Use one comma-separated param for several values (`?status=new,installed`), which `list` params do.
- Use the names other pages already use for the same thing: `search`, `sort`, `direction` and `group` for the table, and `floor`, `area`, `device`, `label`, `config_entry`, `sub_entry` and `assistants` for the shared filters.
- A search box's text is always `search`, never `filter` or `q`.
- Keep existing param names so existing links and My Home Assistant links keep working. When renaming, read the old name as well for about six months, with a code comment naming the release it can be removed in, and write only the new name. Keep the old name in the config, use it only as a fallback when reading, and leave it out of the values you write, so the next write removes it from the URL.
- Pages opt in. Some use params for other things, such as `?domain=` starting the add integration flow on the integrations dashboard, so check what a page already reads before syncing it.
- Collapsed groups, column order and hidden columns stay in storage (`@storage`), not the URL.
- Link to a page by its main path, not an alias, so a link to an open page lands on the same path and applies.

## Data Tables

`hass-tabs-subpage-data-table` with the `sync-url` attribute keeps `search`, `sort`, `direction` and `group` in the URL through `dataTableQueryParamsFromState` and `dataTableQueryStateFromUrl`. A linked search replaces the current one, and sorting or grouping a link leaves out keeps what was picked before. The table fires `search-changed`, `sorting-changed` and `grouping-changed` when a link changes them, with `link` set, so the page shows them without storing them. Use `DataTableSettingsController` (`src/common/controllers/data-table-settings-controller.ts`) for the stored search, sorting and grouping: give it the page's storage keys, bind its `search`, `sorting` and `grouping` to the table, and its `searchChanged`, `sortingChanged` and `groupingChanged` to the table's events. Call `showSearch` for a search the page reads from a link itself. A page the router keeps open shows what the user stored when it's opened again without params, like from the sidebar: the controller and table restore the search, sorting and grouping, and a page with filters restores its stored filters when its URL has no params.

- Give sortable and groupable columns a short public `urlName` (for example `type`, not `translated_category`). Sorting falls back to the column id without one; grouping is only written for columns that have one, so internal ids don't end up in links.
- When a column definition is shared between pages, set its `urlName` where the shared column is defined, so every page uses the same name.
- The table reads the URL once, as soon as it has columns. When a column only exists once data has loaded, such as Filename on the dashboards page, turn syncing on only after loading succeeds (`?sync-url=${!this._loading && !this._loadFailed}`), or a link that sorts or groups by that column is dropped.
- The page owns its filters. Give it a filter config in its `*-query-params.ts`, a helper that turns filter values into params, and one that turns a link back into the search and filter values. The link helper returns `undefined` when the URL has none of the filter params and none of the table's (`dataTableQueryParamConfig`), so stored choices stay. Use a second controller on the page for them, as `ha-marketplace-dashboard.ts` and `lorawan-devices.ts` do. `browseUrl` and `browseLinkFromUrl` in `src/panels/marketplace/dashboards/dashboard-repositories.ts` show the pair.
- Filter components also send the value the page gave them once they have looked up their items, so a filter event isn't always the user's. Store a filter only when it changes what the URL holds, comparing the filters' query strings before and after, as `helpersFilterQueryString` does, and store only that filter.
- A memoized filter that also reads async state (anything loaded after the page connects) must take that state as a memoize argument, or a linked filter shows stale results until something else changes.
- A filter component that looks up related items asynchronously should drop a lookup whose value has since changed, or two links landing within one lookup apply the older one.

## Coverage Check

Before calling a page done:

1. List every filter, sortable column, groupable column, the search box and any view toggle (such as a tab, raw view or provider). Confirm each one is written to the URL and read back from a link, both on first render and on a page that is already open.
2. Search the codebase for in-app links and `navigate()` calls into the page with a query string, and move them to the current param names and the page's main path. `lorawan-connections.ts` and `lorawan-overview.ts` link into `lorawan-devices.ts` this way.

## My Home Assistant Links

When a page gains params, add them to its redirect in `getMyRedirects()` in `src/panels/my/ha-panel-my.ts`:

- List them under `params` as `"string?"`, matching what the page reads. For a data table page that includes `search`, `sort`, `direction` and `group` as well as its filters. Keep the list in a const next to the others, such as `marketplaceTableParams`, which several redirects share.
- Point the redirect at the page's main path, the one the page's controller binds to.
- Don't add legacy param names.
- Add the same params to the redirect's entry in `redirect.json` in `home-assistant/my.home-assistant.io`, in a separate pull request that links the frontend pull request. Merge it only once the frontend pull request is in `dev`.
- In the frontend pull request, link the My Home Assistant pull request under "Additional information": `- Link to My Home Assistant pull request: home-assistant/my.home-assistant.io#<n>`.

## Tests

Follow `test/common/url/query-params.test.ts`, `test/common/url/data-table-query-params.test.ts` and `test/common/controllers/query-params-controller.test.ts`. For a feature's params file, cover the encode and decode round trip, defaults being left out, and legacy names still being read. Test the helpers, not the page rendering, and only where the logic could break without anyone noticing.
