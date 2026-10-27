import "./public-path";
// The provider must be defined first. Custom elements upgrade in the order
// they are defined, and cards need a provider to request their context from.
import "./ha-embed-provider";
import "./ha-embed-card";
import { fontStyles } from "../../../src/resources/roboto";

// Font faces only work in the document, not in the shadow root of the card.
// Defining Roboto does not change the page unless it already uses Roboto.
document.head.append(
  Object.assign(document.createElement("style"), {
    textContent: fontStyles.cssText,
  })
);

// Custom cards use the helpers to create built-in cards. The dashboard panel
// sets the same global in the full app.
(window as any).loadCardHelpers = () =>
  import("../../../src/panels/lovelace/custom-card-helpers");
