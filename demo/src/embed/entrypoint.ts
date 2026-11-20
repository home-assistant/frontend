import "./public-path";
import "./workers";
// The provider must be defined first. Custom elements upgrade in the order
// they are defined, and cards need a provider to request their context from.
import "./ha-embed-provider";
import "./ha-embed-card";
import "./ha-embed-section";
import "./ha-embed-view";
import "./ha-embed-dashboard";
// For custom cards, which can't load them themselves. The built-in cards only
// load ha-list-item-button with the map card. The full app loads ha-select
// with the more info dialog.
import "../../../src/components/item/ha-list-item-button";
import "../../../src/components/ha-select";
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
