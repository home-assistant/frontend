import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { LovelaceDashboard } from "../../../src/data/lovelace/dashboard";
import type { LovelaceInfo } from "../../../src/data/lovelace/resource";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import {
  selectedDemo,
  selectedDemoConfig,
  setDemoConfig,
} from "../configs/demo-configs";
import "../custom-cards/cast-demo-row";
import "../custom-cards/ha-demo-card";
import "../custom-cards/ha-demo-next-card";
import { mockMap } from "./map";

let dashboards: LovelaceDashboard[] = [];

export const mockLovelace = (
  hass: MockHomeAssistant,
  localizePromise: Promise<LocalizeFunc>,
  data: LovelaceDashboard[] = []
) => {
  dashboards = data;
  hass.mockWS("lovelace/config", ({ url_path }) => {
    if (url_path === "map") {
      mockMap(hass);
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

  hass.mockWS("lovelace/info", () =>
    Promise.resolve({ resource_mode: "storage" } as LovelaceInfo)
  );
  hass.mockWS("lovelace/config/save", () => Promise.resolve());
  hass.mockWS("lovelace/resources", () => Promise.resolve([]));
  hass.mockWS("lovelace/dashboards/list", () =>
    dashboards.map((dashboard) => ({ ...dashboard }))
  );
  hass.mockWS("lovelace/dashboards/delete", (msg: { dashboard_id: string }) => {
    const index = dashboards.findIndex((d) => d.id === msg.dashboard_id);
    if (index === -1) {
      throw new Error(`Dashboard ${msg.dashboard_id} not found`);
    }
    dashboards.splice(index, 1);
  });
};

customElements.whenDefined("hui-root").then(() => {
  // eslint-disable-next-line
  const HUIRoot = customElements.get("hui-root")!;

  const oldFirstUpdated = HUIRoot.prototype.firstUpdated;

  HUIRoot.prototype.firstUpdated = function (changedProperties) {
    oldFirstUpdated.call(this, changedProperties);
    this.addEventListener("set-demo-config", async (ev) => {
      const demo = (ev as CustomEvent).detail.demo;
      try {
        await setDemoConfig(this.hass, this.lovelace!, demo);
      } catch (_err: any) {
        setDemoConfig(this.hass, this.lovelace!, selectedDemo);
        alert("Failed to switch config :-(");
      }
    });
  };
});
