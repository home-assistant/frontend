import "../custom-cards/ha-demo-card";
import "../custom-cards/cast-demo-row";
// Not duplicate, one is for typing.
// tslint:disable-next-line
import { HADemoCard } from "../custom-cards/ha-demo-card";
import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { selectedDemoConfig } from "../configs/demo-configs";
import { LocalizeFunc } from "../../../src/common/translations/localize";

export const mockLovelace = (
  hass: MockHomeAssistant,
  localizePromise: Promise<LocalizeFunc>
) => {
  hass.mockWS("lovelace/config", () =>
    Promise.all([
      selectedDemoConfig,
      localizePromise,
    ]).then(([config, localize]) => config.lovelace(localize))
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
