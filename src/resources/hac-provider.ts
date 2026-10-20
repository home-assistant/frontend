import {
  TAG_NAME as BUTTON_CLOSE_TAG_NAME,
  VERSION as BUTTON_CLOSE_VERSION,
} from "@home-assistant/components/button/close/info";
import {
  TAG_NAME as BUTTON_TAG_NAME,
  VERSION as BUTTON_VERSION,
} from "@home-assistant/components/button/info";
import {
  TAG_NAME as CARD_TAG_NAME,
  VERSION as CARD_VERSION,
} from "@home-assistant/components/card/info";
import {
  TAG_NAME as HEADER_TAG_NAME,
  VERSION as HEADER_VERSION,
} from "@home-assistant/components/header/info";
import { provideComponents } from "@home-assistant/components/provider";

// Offers our copies of the hac components to custom cards and other code in
// the page that uses their `dynamic` entry points. Only tag names, versions
// and loaders are published here, the components load on first request.
provideComponents({
  [BUTTON_TAG_NAME]: {
    version: BUTTON_VERSION,
    load: () =>
      import("@home-assistant/components/button").then((m) => m.HacButton),
  },
  [BUTTON_CLOSE_TAG_NAME]: {
    version: BUTTON_CLOSE_VERSION,
    load: () =>
      import("@home-assistant/components/button/close").then(
        (m) => m.HacButtonClose
      ),
  },
  [CARD_TAG_NAME]: {
    version: CARD_VERSION,
    load: () =>
      import("@home-assistant/components/card").then((m) => m.HacCard),
  },
  [HEADER_TAG_NAME]: {
    version: HEADER_VERSION,
    load: () =>
      import("@home-assistant/components/header").then((m) => m.HacHeader),
  },
});
