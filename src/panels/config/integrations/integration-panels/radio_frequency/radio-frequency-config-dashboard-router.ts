import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { RadioFrequencyTransmitter } from "../../../../../data/radio_frequency";
import { fetchRadioFrequencyTransmitters } from "../../../../../data/radio_frequency";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import type { RouterOptions } from "../../../../../layouts/hass-router-page";
import { HassRouterPage } from "../../../../../layouts/hass-router-page";
import type { HomeAssistant } from "../../../../../types";

@customElement("radio-frequency-config-dashboard-router")
class RadioFrequencyConfigDashboardRouter extends HassRouterPage {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow = false;

  @state() private _transmitters: RadioFrequencyTransmitter[] = [];

  private _fetched = false;

  protected routerOptions: RouterOptions = {
    defaultPage: "dashboard",
    showLoading: true,
    routes: {
      dashboard: {
        tag: "radio-frequency-config-dashboard",
        load: () => import("./radio-frequency-config-dashboard"),
      },
      devices: {
        tag: "radio-frequency-devices-page",
        load: () => import("./radio-frequency-devices-page"),
      },
    },
  };

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!this._fetched && this.hass) {
      this._fetched = true;
      this._fetchTransmitters();
    }
  }

  private async _fetchTransmitters(): Promise<void> {
    try {
      const result = await fetchRadioFrequencyTransmitters(this.hass);
      this._transmitters = result.transmitters;
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.radio_frequency.loading_error"
        ),
        text: err.message,
      });
    }
  }

  protected updatePageEl(el): void {
    el.route = this.routeTail;
    el.hass = this.hass;
    el.isWide = this.isWide;
    el.narrow = this.narrow;
    el.transmitters = this._transmitters;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "radio-frequency-config-dashboard-router": RadioFrequencyConfigDashboardRouter;
  }
}
