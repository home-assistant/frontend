---
name: ha-frontend-loading
description: Home Assistant frontend loading states. Use when adding, changing or reviewing anything that shows while content loads, such as a skeleton, spinner, loading button or loading fade, or when checking how a screen looks while it loads.
---

# HA Frontend Loading

Use this skill for every loading state, following the [Loading pattern](https://contributors.home-assistant.io/design/patterns/loading/). A loading state always ends in the content, an empty state, or an error.

## Pick The Indicator

- Use a skeleton from `src/components/skeleton/` (`ha-skeleton`, `ha-skeleton-text`, `ha-skeleton-icon`, `ha-skeleton-log`) when content loads into a layout you already know, such as table rows, tile text, or a log. It holds the layout, so nothing jumps when the content arrives.
- Use `ha-spinner` only when a whole area loads and its shape is unknown.
- Use `ha-button` with `loading`, or `ha-progress-button`, for an action started from a button. Don't put a separate spinner next to it.

## The Wave

Every skeleton uses the same soft wave (`ha-skeleton`'s default `effect="sheen"`). It's one slanted wave across all the skeletons on the page, from the top corner of the content on the side text starts from to the opposite bottom corner, which each skeleton shows its slice of, on one shared clock. It flows from one skeleton into the next, starts its next sweep as soon as it leaves the content, and a skeleton added mid-sweep joins in rather than starting over. Reduced motion stops it.

Don't change the effect or speed (`--ha-skeleton-duration`) for one component.

## Showing A Skeleton

Make the skeleton the same shape and size as the content it stands for: one text skeleton per line of text, an icon skeleton per icon, a block per image or chart.

Wrap the indicator in `ha-fade-in` from `src/components/animation/ha-fade-in.ts`:

- Fade a skeleton in straight away over about 300ms (`.duration=${300}`), as the data table does. It stands in for the content, so a delay would leave an empty gap.
- Delay a spinner or progress bar, usually by `.delay=${500}`, so a load that finishes within that time never flashes it. Some slower areas, such as backups and updates, use `${1000}`.
- Don't fade in the loaded content itself.

Give a skeleton group the `progressbar` role and a translated label, as `ha-spinner` has, rather than visible "Loading" text.

```ts
html`
  <ha-fade-in .duration=${300} easing="ease-in">
    <div
      role="progressbar"
      aria-label=${this._i18n.localize("ui.common.loading")}
    >
      <ha-skeleton-text></ha-skeleton-text>
    </div>
  </ha-fade-in>
  <ha-fade-in .delay=${500}><ha-spinner></ha-spinner></ha-fade-in>
`;
```

## Checking It

Check a loading state in the browser, not only by reading the code. These work on any setup: a dev server, the demo, or the gallery.

- **Hold the loading state.** Home Assistant's data comes over the WebSocket, which DevTools network throttling doesn't slow. Hold the replies back from the console instead, then open the screen from inside the app (not a reload, which drops the patch). Adjust the pattern to the messages the screen waits on:

  ```js
  const conn = document.querySelector("home-assistant").hass.connection;
  const slow = (type = "") => /^(recorder|history|logbook)\//.test(type);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const send = conn.sendMessagePromise.bind(conn);
  conn.sendMessagePromise = async (msg) => {
    const result = await send(msg);
    if (slow(msg.type)) await wait(3000);
    return result;
  };
  const subscribe = conn.subscribeMessage.bind(conn);
  conn.subscribeMessage = (callback, msg, options) => {
    if (!slow(msg.type)) return subscribe(callback, msg, options);
    const due = Date.now() + 3000;
    const later = (message) =>
      setTimeout(() => callback(message), Math.max(0, due - Date.now()));
    return subscribe(later, msg, options);
  };
  ```

- **Compare before and after.** Take screenshots of the same screen on `dev` and on your branch, at the same viewport size, both loading and loaded, and put them side by side. In a pull request, show both.
- **Check every look.** Light and dark themes, a right-to-left language (the wave starts from the right), reduced motion (DevTools, Rendering, "Emulate CSS media feature prefers-reduced-motion": the wave stops), and a phone width (DevTools device toolbar).
