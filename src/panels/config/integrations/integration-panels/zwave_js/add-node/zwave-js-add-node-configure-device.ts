import { customElement, property, state } from "lit/decorators";
import { html, LitElement, type PropertyValues } from "lit";
import memoizeOne from "memoize-one";

import type { HomeAssistant } from "../../../../../../types";
import type { LocalizeFunc } from "../../../../../../common/translations/localize";
import type { HaFormSchema } from "../../../../../../components/ha-form/types";
import { fireEvent } from "../../../../../../common/dom/fire_event";
import { Protocols } from "../../../../../../data/zwave_js";
import type { ZWaveJSAddNodeSmartStartOptions } from "./data";

import "../../../../../../components/ha-form/ha-form";

@customElement("zwave-js-add-node-configure-device")
export class ZWaveJsAddNodeConfigureDevice extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "device-name" }) public deviceName = "";

  @property({ type: Boolean, attribute: "lr-supported" })
  public longRangeSupported = false;

  @state() private _options?: ZWaveJSAddNodeSmartStartOptions;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._options = {
        name: this.deviceName,
      };

      if (this.longRangeSupported) {
        this._options.network_type = Protocols.ZWaveLongRange.toString();
      }

      fireEvent(this, "value-changed", { value: this._options });
    }
  }

  render() {
    return html`
      <ha-form
        .hass=${this.hass}
        .schema=${this._getSchema(this.hass.localize, this.longRangeSupported)}
        .data=${this._options!}
        @value-changed=${this._setOptions}
        .computeLabel=${this._computeLabel}
      >
      </ha-form>
    `;
  }

  private _getSchema = memoizeOne(
    (localize: LocalizeFunc, longRangeSupported: boolean): HaFormSchema[] => {
      const schema: HaFormSchema[] = [
        {
          name: "name",
          required: true,
          default: this.deviceName,
          type: "string",
          autofocus: true,
        },
        {
          name: "area",
          selector: {
            area: {},
          },
        },
      ];

      if (longRangeSupported) {
        schema.push({
          name: "network_type",
          required: true,
          selector: {
            select: {
              box_max_columns: 1,
              mode: "box",
              options: [
                {
                  value: Protocols.ZWaveLongRange.toString(),
                  label: localize(
                    "ui.panel.config.zwave_js.add_node.configure_device.long_range_label"
                  ),
                  description: localize(
                    "ui.panel.config.zwave_js.add_node.configure_device.long_range_description"
                  ),
                  image: {
                    src: "/static/images/z-wave-add-node/long-range.svg",
                    src_dark:
                      "/static/images/z-wave-add-node/long-range_dark.svg",
                    flip_rtl: true,
                  },
                },
                {
                  value: Protocols.ZWave.toString(),
                  label: localize(
                    "ui.panel.config.zwave_js.add_node.configure_device.mesh_label"
                  ),
                  description: localize(
                    "ui.panel.config.zwave_js.add_node.configure_device.mesh_description"
                  ),
                  image: {
                    src: "/static/images/z-wave-add-node/mesh.svg",
                    src_dark: "/static/images/z-wave-add-node/mesh_dark.svg",
                    flip_rtl: true,
                  },
                },
              ],
            },
          },
        });
      }
      return schema;
    }
  );

  private _computeLabel = (schema: HaFormSchema): string | undefined => {
    if (schema.name === "network_type") {
      return this.hass.localize(
        "ui.panel.config.zwave_js.add_node.configure_device.choose_network_type"
      );
    }
    if (schema.name === "name") {
      return this.hass.localize(
        "ui.panel.config.zwave_js.add_node.configure_device.device_name"
      );
    }
    if (schema.name === "area") {
      return this.hass.localize(
        "ui.panel.config.zwave_js.add_node.configure_device.device_area"
      );
    }
    return undefined;
  };

  private _setOptions(event: any) {
    this._options = {
      ...this._options!,
      ...event.detail.value,
    };

    fireEvent(this, "value-changed", { value: this._options });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-js-add-node-configure-device": ZWaveJsAddNodeConfigureDevice;
  }
}
