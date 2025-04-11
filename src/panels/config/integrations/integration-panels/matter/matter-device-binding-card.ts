import type { TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon";
import "../../../../../components/ha-button";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-selector/ha-selector";

import { mdiDevices, mdiPlusCircle } from "@mdi/js";
import { showMatterNodeBindingDialog } from "./show-dialog-matter-node-binding";

import type { HaSelect } from "../../../../../components/ha-select";
import type { HomeAssistant } from "../../../../../types";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";

import type { MatterNodeBinding } from "../../../../../data/matter";

import {
  getMatterNodeBinding,
  setMatterNodeBinding,
} from "../../../../../data/matter";

import { MatterDeviceMapper } from "./matter-binding-node-device-mapper";

export interface ItemSelectedEvent {
  target?: HaSelect;
}

declare global {
  interface HTMLElementEventMap {
    "binding-updated": CustomEvent<Record<string, MatterNodeBinding[]>>;
  }
}

@customElement("matter-device-binding-card")
export class MatterDeviceBindingCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @state()
  public showHidden = false;

  @property({ attribute: false })
  public bindings?: Record<string, MatterNodeBinding[]>;

  @state()
  private deviceMapper?: MatterDeviceMapper;

  async handleDeleteClickCallback(event: Event) {
    const button = event.target as HTMLElement;
    const index = Number(button.dataset.index);
    const source_endpoint = button.dataset.endpoint!;

    // const device_id = this.device.id;
    const bindings = this.bindings![source_endpoint];

    if (bindings) {
      // remove data
      bindings.splice(index, 1);
      // send to device
      const ret = await setMatterNodeBinding(
        this.hass,
        this.device.id,
        Number(source_endpoint),
        bindings
      );

      if (ret[0].Status === 0) {
        this.bindings![source_endpoint].splice(index, 1);
        this.requestUpdate();
      }
    }
  }

  private _onDialogUpdate = async (
    bindings: Record<string, MatterNodeBinding[]>
  ) => {
    try {
      const ret = await setMatterNodeBinding(
        this.hass,
        this.device.id,
        1,
        bindings[1]
      );
      if (ret[0].Status === 0) {
        this.bindings![1] = bindings[1];
        this.requestUpdate();
      }
    } catch (_err) {
      alert("set matter binding error!");
    }
  };

  async handleAddClickCallback(_ev: Event): Promise<any> {
    showMatterNodeBindingDialog(this, {
      device_id: this.device.id,
      bindings: this.bindings!,
      onUpdate: this._onDialogUpdate,
      deviceMapper: this.deviceMapper!,
    });
  }

  private async _fetchBindingForMatterDevice(): Promise<void> {
    if (this.hass) {
      this.bindings = await getMatterNodeBinding(this.hass, this.device.id!);
      if (Object.values(this.bindings).some((value) => Array.isArray(value))) {
        this.showHidden = true;
      }
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("hass")) {
      this._fetchBindingForMatterDevice();
      this.deviceMapper = new MatterDeviceMapper(this.hass);
    }
  }

  protected getDeviceNameByNodeId(nodeId: number): string {
    if (this.deviceMapper) {
      const deviceId = this.deviceMapper!.getDeviceIdByNodeId(String(nodeId));
      if (deviceId) {
        const device = this.hass.devices![deviceId!];
        if (device) {
          return device.name_by_user! || device.name!;
        }
      }
    }
    return String(nodeId);
  }

  protected render(): TemplateResult {
    if (!this.showHidden) {
      return html`<p></p>`;
    }

    return html`
      <ha-card outlined>
        <h1 class="card-header">
          Binding
          <ha-icon-button
            .path=${mdiPlusCircle}
            @click=${this.handleAddClickCallback}
          >
          </ha-icon-button>
        </h1>
        <main class="card-content">
          ${this.bindings
            ? Object.entries(this.bindings).map(
                ([key, value]) => html`
                  ${value.map(
                    (nodeItem, index) => html`
                      <section class="binding-row">
                        <ha-list-item twoline graphic="icon">
                          <span
                            >${this.getDeviceNameByNodeId(nodeItem.node)}
                          </span>
                          <span slot="secondary"
                            >${"node id: " + nodeItem.node}</span
                          >
                          <ha-svg-icon
                            .path=${mdiDevices}
                            slot="graphic"
                          ></ha-svg-icon>
                        </ha-list-item>

                        <ha-button
                          class="binding-button"
                          data-endpoint=${key}
                          data-index=${index}
                          label="delete"
                          @click=${this.handleDeleteClickCallback}
                        ></ha-button>
                      </section>
                    `
                  )}
                `
              )
            : nothing}
        </main>
      </ha-card>
    `;
  }

  static styles = css`
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
    }

    .card-header ha-icon-button {
      margin-right: -8px;
      margin-inline-end: -8px;
      margin-inline-start: initial;
      color: var(--primary-color);
      height: auto;
      direction: var(--direction);
    }

    .card-content {
      display: grid;
      padding: 8px;
      gap: 5px;
    }

    .header-row {
      display: flex;
      padding: 2px;
      height: 30px;
      align-items: center;
      justify-content: center;
    }

    .header-title {
      font-weight: bold;
      gap: 4px;
      border-bottom: 2px solid #333;
      padding-bottom: 8px;
    }

    .header-column {
      flex: 0.3;
      text-align: center;
    }

    .header-columns {
      display: flex;
      flex: 0.5;
      align-items: anchor-center;
    }

    .header-columns span {
      flex: 0.5;
      text-align: center;
    }

    .grid-container {
      display: flex;
      height: 36px;
    }

    .binding-row {
      display: flex;
      align-items: center;
      gap: 2px;
      padding-bottom: 8px;
    }

    .binding-row ha-list-item {
      flex: 0.7;
    }

    .binding-row ha-button {
      flex: 0.3;
    }

    .binding-column {
      text-align: center;
      flex: 0.3;
    }

    .binding-columns {
      display: flex;
      flex: 0.5;
      gap: 4px;
      text-align: center;
    }

    .binding-columns span {
      flex: 0.5;
      text-align: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-device-binding-card": MatterDeviceBindingCard;
  }
}
