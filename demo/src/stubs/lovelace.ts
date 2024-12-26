import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import {
  selectedDemoConfig,
  selectedDemoConfigIndex,
  setDemoConfig,
} from "../configs/demo-configs";
import "../custom-cards/cast-demo-row";
import "../custom-cards/ha-demo-card";
import { mapEntities } from "./entities";

export const mockLovelace = (
  hass: MockHomeAssistant,
  localizePromise: Promise<LocalizeFunc>
) => {
  hass.mockWS("lovelace/config", ({ url_path }) => {
    if (url_path === "map") {
      hass.addEntities(mapEntities());
      return {
        strategy: {
          type: "map",
        },
      };
    }
    return Promise.all([selectedDemoConfig, localizePromise]).then(
      ([config, localize]) => config.lovelace(localize)
    );
  });

  hass.mockWS("lovelace/config/save", () => Promise.resolve());
  hass.mockWS("lovelace/resources", () => Promise.resolve([]));
};

customElements.whenDefined("hui-root").then(() => {
  // eslint-disable-next-line
  const HUIRoot = customElements.get("hui-root")!;

  const oldFirstUpdated = HUIRoot.prototype.firstUpdated;

  HUIRoot.prototype.firstUpdated = function (changedProperties) {
    oldFirstUpdated.call(this, changedProperties);
    this.addEventListener("set-demo-config", async (ev) => {
      const index = (ev as CustomEvent).detail.index;
      try {
        await setDemoConfig(this.hass, this.lovelace!, index);
      } catch (err: any) {
        setDemoConfig(this.hass, this.lovelace!, selectedDemoConfigIndex);
        alert("Failed to switch config :-(");
      }
    });
  };
});
