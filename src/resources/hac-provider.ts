import { VERSION as BUTTON_CLOSE_VERSION } from "@home-assistant/components/button/close/version";
import { VERSION as BUTTON_VERSION } from "@home-assistant/components/button/version";
import { VERSION as CARD_VERSION } from "@home-assistant/components/card/version";
import { VERSION as HEADER_VERSION } from "@home-assistant/components/header/version";
import { provideComponents } from "@home-assistant/components/provider";

// Offers our copies of the hac components to custom cards and other code in
// the page that uses their `dynamic` entry points. Only versions and loaders
// are published here, the components load on first request.
provideComponents({
  "hac-button": {
    version: BUTTON_VERSION,
    load: () =>
      import("@home-assistant/components/button").then((m) => m.HacButton),
  },
  "hac-button-close": {
    version: BUTTON_CLOSE_VERSION,
    load: () =>
      import("@home-assistant/components/button/close").then(
        (m) => m.HacButtonClose
      ),
  },
  "hac-card": {
    version: CARD_VERSION,
    load: () =>
      import("@home-assistant/components/card").then((m) => m.HacCard),
  },
  "hac-header": {
    version: HEADER_VERSION,
    load: () =>
      import("@home-assistant/components/header").then((m) => m.HacHeader),
  },
});
