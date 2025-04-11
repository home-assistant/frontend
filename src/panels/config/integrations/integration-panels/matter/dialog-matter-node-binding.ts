import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiDevices } from "@mdi/js";

import "../../../../../components/ha-button";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-select";

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

  private _createNodeBinding(nodeId: number): MatterNodeBinding {
    return {
      node: nodeId,
      group: null,
      endpoint: 1,
      cluster: null,
      fabricIndex: null,
    };
  }

  private _isBindingExists(binding: MatterNodeBinding): boolean {
    return this.bindings![1].some(
      (node) => node.node === binding.node && node.endpoint === binding.endpoint
    );
  }

  private _handleAddClick(_event: Event) {
    try {
      const select = this.shadowRoot!.querySelector("ha-select")!;
      const index = Number(select.value);
      const device = this._bindableDevices[index];
      const nodeId = Number(this.deviceMapper!.getNodeIdByDeviceId(device.id));

      const nodeBinding = this._createNodeBinding(nodeId);
      if (!this._isBindingExists(nodeBinding)) {
        this.bindings![1].push(nodeBinding);
        this._params?.onUpdate(this.bindings!);
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
        .heading=${createCloseHeading(this.hass, "Binding Target")}
      >
        <section class="binding-controls">
          <ha-select @closed=${stopPropagation} fixedMenuPosition>
            ${this._bindableDevices.map(
              (device) => html`
                <ha-list-item twoline graphic="icon">
                  <span>${device.name_by_user || device.name}</span>
                  <span slot="secondary">
                    ${"node id: " +
                    String(this.deviceMapper?.getNodeIdByDeviceId(device.id))}
                  </span>
                  <ha-svg-icon .path=${mdiDevices} slot="graphic"></ha-svg-icon>
                </ha-list-item>
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
          gap: 20px;
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
