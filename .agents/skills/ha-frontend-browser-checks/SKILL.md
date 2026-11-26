---
name: ha-frontend-browser-checks
description: Check a Home Assistant frontend change in a browser and show it in a pull request. Use when checking how a change looks or behaves at different screen sizes, in light and dark mode, right to left (RTL) or with long translations, or when taking before and after screenshots or recording a demo of a feature for a pull request.
---

# HA Frontend Browser Checks

Use this skill to check a visible change in a browser and to show it in a pull request. Any browser tool you already have works if it can open a page, set its size, run a script in it, take screenshots and record video. Load `ha-frontend-testing` for the dev servers, and `ha-frontend-loading` for loading states.

Screenshots and recordings help reviewers see what changed, but they don't make a large change easy to review. [Keep pull requests small](https://contributors.home-assistant.io/start/pull-requests/#keep-it-small), and make sure you have reviewed and understood the change and can explain it, as the [AI policy](https://contributors.home-assistant.io/start/ai-policy/) asks.

## Check Real Devices

Check the sizes the change affects rather than one fixed size, such as a phone, a tablet in both orientations, a laptop and a large desktop monitor. Include a small phone. Take each device's viewport in CSS pixels, its pixel ratio and touch support from the device presets your tools have, rather than from memory, and check the page really has that size once it's set.

## Check Light And Dark

When the change can look different in light and dark mode, such as a colour, border, background or image, check it in both. Switch the colour scheme in your browser tool, with the profile's theme following it, or pick light and dark in the profile. A fix for one mode only needs that mode.

## Check Right To Left (RTL)

Check layout, alignment, icons and anything with a direction in RTL. In the app, set your profile language to one written right to left, then set it back: many components take their direction from the language, so setting the page to RTL in your browser tool leaves them left to right. The gallery's RTL toggle checks styling only.

## Check Long Text

When a change adds or changes text, check it in a language with long words or long translations too, so labels, descriptions and buttons don't overflow or wrap badly. When the new string isn't translated yet, try a rough translation to check its length.

## Show It In The Pull Request

- When the change alters something that exists already, capture the same screen on `dev` and on your branch, in the same state, and put them side by side. Only a new screen, with nothing before it, needs just the after.
- Keep the size of every capture fixed, screenshots as well as videos. Set the page size before you capture and don't change it in between, and capture the same area each time, so the subject sits in the same place in before and after. For a card or other part of the page, work out a fixed area around it for each size you test, and use that same area on both branches.
- Say which device, size or mode each capture shows.
- Make the change easy to see: capture the part of the screen it affects rather than a whole page where it's a few pixels.
- Save captures outside the repository, so they can't be committed by accident.
- Keep personal details out: use demo data, such as the demo or the Demo integration, and mask anything else before you capture, such as names, addresses, IP and MAC addresses, hostnames, serial numbers and tokens. Check each capture before you attach it.

Record a video when it shows the change better than a still, such as an animation, a drag, a loading sequence (hold the loading state as "Checking It" in `ha-frontend-loading` shows) or a flow across several screens. Keep each video short and small: GitHub limits upload sizes, and reviewers have to watch it. You can record it yourself with the tools you have; it doesn't need a person.

- Use the recording tools at hand: your browser tool's recorder for a page, or a desktop screen recorder for a window, such as a phone emulator, so the device frame shows.
- Don't resize, zoom or take screenshots while recording, which redraw the page at another size and make the video jump.
- Check the whole recording before you attach it. For a short clip, look at a frame every second or half second, not only the first and last, since the page can jump to another size partway through. Record again if it does. Take stills from the same frames, so they match the video.
- Keep the window drawn on a screen. A hidden or minimised window records only a frame every few seconds.
- Label each video, such as **Before** and **After**, and say what it shows and how you set it up. Say what you didn't record and why.
