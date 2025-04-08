/* eslint-disable lit/lifecycle-super */
import { customElement } from "lit/decorators";
import { navigate } from "../../../../../common/navigate";
import type { HomeAssistant } from "../../../../../types";
import { showZWaveJSAddNodeDialog } from "./show-dialog-zwave_js-add-node";
import { fetchZwaveNetworkStatus } from "../../../../../data/zwave_js";

@customElement("zwave_js-add-node")
export class DialogZWaveJSAddNode extends HTMLElement {
  public hass!: HomeAssistant;

  public configEntryId!: string;

  connectedCallback() {
    this._openDialog();
  }

  private async _openDialog() {
    await navigate(
      `/config/devices/dashboard?config_entry=${this.configEntryId}`,
      {
        replace: true,
      }
    );

    let longRangeSupported = false;

    try {
      const zwaveNetwork = await fetchZwaveNetworkStatus(this.hass, {
        entry_id: this.configEntryId,
      });
      longRangeSupported = zwaveNetwork?.controller?.supports_long_range;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }

    showZWaveJSAddNodeDialog(this, {
      entry_id: this.configEntryId,
      longRangeSupported,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-add-node": DialogZWaveJSAddNode;
  }
}
