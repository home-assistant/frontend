import "../custom-cards/ha-demo-card";
// Not duplicate, one is for typing.
// tslint:disable-next-line
import { HADemoCard } from "../custom-cards/ha-demo-card";
import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { selectedDemoConfig } from "../configs/demo-configs";

export const mockLovelace = (hass: MockHomeAssistant) => {
  selectedDemoConfig.then((config) => hass.addEntities(config.entities()));

  hass.mockWS("lovelace/config", () =>
    selectedDemoConfig.then((config) => config.lovelace())
  );

  hass.mockWS("lovelace/config/save", () => Promise.resolve());
};

customElements.whenDefined("hui-view").then(() => {
  // tslint:disable-next-line
  const HUIView = customElements.get("hui-view");
  // Patch HUI-VIEW to make the lovelace object available to the demo card
  const oldCreateCard = HUIView.prototype.createCardElement;

  HUIView.prototype.createCardElement = function(config) {
    const el = oldCreateCard.call(this, config);
    if (el.tagName === "HA-DEMO-CARD") {
      (el as HADemoCard).lovelace = this.lovelace;
    }
    return el;
  };
});
