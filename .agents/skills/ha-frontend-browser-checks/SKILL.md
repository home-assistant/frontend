---
name: ha-frontend-browser-checks
description: Check a Home Assistant frontend change in a browser and show it in a pull request. Use when checking how a change looks or behaves at different screen sizes or in a right-to-left language, or when taking before and after screenshots or videos for a pull request.
---

# HA Frontend Browser Checks

Use this skill to check a visible change in a browser and to show it in a pull request. Load `ha-frontend-testing` for the dev servers, and `ha-frontend-loading` for loading states.

## Use The Browser Tool You Have

Use the browser tool your environment already provides, such as your harness's own browser or a browser extension. Nothing here depends on one tool: it needs to open a page, set its size, run a script in it and take a screenshot. Don't install another tool when the one you have can do that.

## Check Real Devices

Check the sizes the change affects rather than one fixed size, such as a phone, a tablet in both orientations, a laptop and a large desktop monitor. Look up each device's current viewport in CSS pixels, its pixel ratio and touch support from a maintained list rather than from memory:

- Chrome DevTools: [device mode](https://developer.chrome.com/docs/devtools/device-mode), with its presets in [`EmulatedDevices.ts`](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/emulation/EmulatedDevices.ts).
- Playwright: [devices](https://playwright.dev/docs/emulation#devices).
- Firefox: [Responsive Design Mode](https://firefox-source-docs.mozilla.org/devtools-user/responsive_design_mode/index.html).

The narrowest width that must still work is 320 CSS pixels, from the WCAG [Reflow](https://www.w3.org/TR/WCAG22/#reflow) criterion.

## Check Right To Left

Check layout, alignment, icons and anything with a direction in a right-to-left language too. Set your profile's language to one written right to left, such as Hebrew or Arabic, check the change mirrors correctly, then set it back. In the gallery, use its RTL toggle instead.

## Show It In The Pull Request

- Capture the same screen on `dev` and on your branch, in the same state and at the same size, and put them side by side. Say which device or size each pair shows.
- Make the change easy to see: capture the part of the screen it affects rather than a whole page where it's a few pixels.
- Use a short video when the change is about motion or interaction.
- Save captures outside the repository, so they can't be committed by accident.
- Hide personal details, such as names, addresses, IP addresses and tokens, before you capture.
