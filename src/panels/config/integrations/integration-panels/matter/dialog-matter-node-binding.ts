import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";

import "../../../../../components/ha-button";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-select";
import "../../../../../components/ha-state-icon";
import "../../../../../components/ha-icon-next";

import type { HomeAssistant } from "../../../../../types";
import type { HaSelect } from "../../../../../components/ha-select";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import type { MatterNodeBindingDialogParams } from "./show-dialog-matter-node-binding";
import type { MatterDeviceMapper } from "./matter-binding-node-device-mapper";
import type { MatterNodeBinding } from "../../../../../data/matter";

import { fireEvent } from "../../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import { getDeviceControlsState } from "./matter-device-binding-card";

export interface ItemSelectedEvent {
  target?: HaSelect;
  value?: string;
  index?: number;
}

@customElement("dialog-matter-node-binding")
class DialogMatterNodeBinding extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: MatterNodeBindingDialogParams;

  @state() private device_id?: string;

  @state() private bindings?: Record<string, MatterNodeBinding[]>;

  @state() private _bindableDevices: DeviceRegistryEntry[] = [];

  @state() private deviceMapper?: MatterDeviceMapper;

  public async showDialog(
    params: MatterNodeBindingDialogParams
  ): Promise<void> {
    this.device_id = params.device_id;
    this.bindings = params.bindings;
    this.deviceMapper = params.deviceMapper;
    this._params = params;
  }

  private _createNodeBinding(targetNodeId: number): MatterNodeBinding {
    return {
      node: targetNodeId,
      group: null,
      endpoint: 1,
      cluster: null,
      fabricIndex: null,
    };
  }

  private _isBindingExists(
    sourceEndpoint: string,
    binding: MatterNodeBinding
  ): boolean {
    return this.bindings![sourceEndpoint].some(
      (node) => node.node === binding.node && node.endpoint === binding.endpoint
    );
  }

  private _handleAddClick(_event: Event) {
    try {
      const sourceSelect: HaSelect = this.shadowRoot!.querySelector(
        ".binding-controls ha-select:nth-child(2)"
      )!;
      const source_endpoint = sourceSelect.value;

      const targetSelect: HaSelect = this.shadowRoot!.querySelector(
        ".binding-controls ha-select:nth-child(4)"
      )!;
      const targetNode = targetSelect.value;
      const nodeBinding = this._createNodeBinding(Number(targetNode));

      if (!this._isBindingExists(source_endpoint, nodeBinding)) {
        this.bindings![source_endpoint].push(nodeBinding);
        this._params?.onUpdate(Number(source_endpoint), this.bindings!);
      }
    } catch (_error) {
      fireEvent(this, "hass-notification", {
        message: "Failed to add binding",
      });
    } finally {
      this.closeDialog();
    }
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
        .heading=${createCloseHeading(this.hass, "")}
      >
        <section class="binding-controls">
          <div>Source Endpoint</div>
          <ha-select @closed=${stopPropagation} fixedMenuPosition>
            ${Object.entries(this.bindings!).map(
              ([key]) => html`
                <ha-list-item .value=${key}>
                  <span>${"endpoint: " + key}</span>
                </ha-list-item>
              `
            )}
          </ha-select>
          <div>Target</div>
          <ha-select @closed=${stopPropagation} fixedMenuPosition>
            ${this._bindableDevices.map(
              (device) => html`
                <ha-list-item
                  twoline
                  graphic="icon"
                  .value=${String(
                    this.deviceMapper?.getNodeIdByDeviceId(device.id)
                  )}
                >
                  <span>${device.name_by_user || device.name}</span>
                  <span slot="secondary">
                    ${"node id: " +
                    String(this.deviceMapper?.getNodeIdByDeviceId(device.id))}
                  </span>
                  <ha-state-icon
                    slot="graphic"
                    .hass=${this.hass}
                    .stateObj=${getDeviceControlsState(this.hass, device)}
                  ></ha-state-icon>
                </ha-list-item>
              `
            )}
          </ha-select>
        </section>

        <ha-button slot="secondaryAction" @click=${this._handleAddClick}>
          binding
        </ha-button>
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
          gap: 20px;
          font-size: 20px;
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
