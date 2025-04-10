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
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-button";

import type { MatterNodeBinding } from "../../../../../data/matter";

import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { HaSelect } from "../../../../../components/ha-select";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import type { MatterNodeBindingDialogParams } from "./show-dialog-matter-node-binding";
import type { MatterDeviceMapper } from "./matter-binding-node-device-mapper";

export interface ItemSelectedEvent {
  target?: HaSelect;
}

@customElement("dialog-matter-node-binding")
class DialogMatterNodeBinding extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: MatterNodeBindingDialogParams;

  @state() private device_id?: string;

  @state() private bindings?: Record<string, MatterNodeBinding[]>;

  @state() private _bindableDevices: DeviceRegistryEntry[] = [];

  @state() private deviceMapper?: MatterDeviceMapper;

  @state() private targetNodeId = -1;

  public async showDialog(
    params: MatterNodeBindingDialogParams
  ): Promise<void> {
    this.device_id = params.device_id;
    this.bindings = params.bindings;
    this.deviceMapper = params.deviceMapper;
    this._params = params;
  }

  private _handleAddClick(_event: Event) {
    // check target node id
    if (this.targetNodeId === -1) return;

    const nodeBinding: MatterNodeBinding = {
      node: this.targetNodeId,
      group: null,
      endpoint: 1,
      cluster: null,
      fabricIndex: null,
    };
    const ishas = this.bindings![1].some(
      (node) =>
        node.node === nodeBinding.node && node.endpoint === nodeBinding.endpoint
    );
    if (!ishas) {
      this.bindings![1].push(nodeBinding);
      this._params?.onUpdate(this.bindings!);
    }
    this.closeDialog();
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

  private _bindTargetChanged(event: ItemSelectedEvent): void {
    const index = Number(event.target!.value);
    this.targetNodeId = Number(
      this.deviceMapper.getNodeIdByDeviceId(this._bindableDevices[index].id)
    );
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
            label="target"
            @selected=${this._bindTargetChanged}
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

          <ha-button @click=${this._handleAddClick}> binding </ha-button>
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
