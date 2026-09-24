import "./public-path";
import "../../../src/resources/append-ha-style";
// The provider must be defined first. Custom elements upgrade in the order
// they are defined, and cards need a provider to request their context from.
import "./ha-embed-provider";
import "./ha-embed-card";

// Custom cards use the helpers to create built-in cards. The dashboard panel
// sets the same global in the full app.
(window as any).loadCardHelpers = () =>
  import("../../../src/panels/lovelace/custom-card-helpers");
