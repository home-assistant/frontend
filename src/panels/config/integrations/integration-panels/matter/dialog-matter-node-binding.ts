import "@material/mwc-list/mwc-list";
import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list-item";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-select";
import "../../../../../components/ha-button";

import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { HaSelect } from "../../../../../components/ha-select";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import type { MatterNodeBindingDialogParams } from "./show-dialog-matter-node-binding";

export interface ItemSelectedEvent {
  target?: HaSelect;
}

@customElement("dialog-matter-node-binding")
class DialogMatterNodeBinding extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private device_id?: string;

  @state() private _bindTargetIndex = -1;

  @state() private _bindableDevices: DeviceRegistryEntry[] = [];

  public async showDialog(
    params: MatterNodeBindingDialogParams
  ): Promise<void> {
    this.device_id = params.device_id;
  }

  private _bindTargetIndexChanged(event: ItemSelectedEvent): void {
    this._bindTargetIndex = Number(event.target!.value);
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("hass")) {
      this._bindableDevices = Object.values(this.hass.devices).filter(
        (device) =>
          device.identifiers.find((identifier) => identifier[0] === "matter") &&
          device.id !== this.device_id
      );
    }
  }

  protected render() {
    if (!this.device_id) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(this.hass, "Matter Node Binding")}
      >
        <section class="binding-controls">
          <ha-select
            label="source"
            class="menu"
            .value=${String(this._bindTargetIndex)}
            @selected=${this._bindTargetIndexChanged}
            @closed=${stopPropagation}
          >
            ${this._bindableDevices.map(
              (device, idx) => html`
                <mwc-list-item .value=${String(idx)}>
                  ${"node:" + device.name} ${"endpoint:" + device.name}
                </mwc-list-item>
              `
            )}
          </ha-select>

          <ha-select
            label="target"
            class="menu"
            .value=${String(this._bindTargetIndex)}
            @selected=${this._bindTargetIndexChanged}
            @closed=${stopPropagation}
          >
          </ha-select>

          <ha-button> "binding" </ha-button>
        </section>
      </ha-dialog>
    `;
  }

  public closeDialog(): void {
    this.device_id = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .binding-controls {
          display: grid;
          gap: 4px;
        }

        .binding-controls ha-select {
          padding: 8px;
          min-width: 0;
          transition: border-color 0.3s ease;
        }

        .binding-controls ha-button {
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-node-binding": DialogMatterNodeBinding;
  }
}
