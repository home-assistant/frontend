import type { HassEntity } from "home-assistant-js-websocket";
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
import { fireEvent } from "../../../../../common/dom/fire_event";
import {
  getMatterNodeBinding,
  setMatterNodeBinding,
} from "../../../../../data/matter";
import { MatterDeviceMapper } from "./matter-binding-node-device-mapper";

import type { HaSelect } from "../../../../../components/ha-select";
import type { HomeAssistant } from "../../../../../types";
import type { DeviceRegistryEntry } from "../../../../../data/device_registry";
import type { EntityRegistryDisplayEntry } from "../../../../../data/entity_registry";
import type { MatterNodeBinding } from "../../../../../data/matter";

export interface ItemSelectedEvent {
  target?: HaSelect;
  value?: string;
  index?: number;
}

export const getDeviceControlsState = (
  hass: HomeAssistant,
  device: DeviceRegistryEntry
): HassEntity | undefined => {
  if (!device) return undefined;

  // Helper function to find the first matching entity
  const findEntity = (
    predicate: (entity: EntityRegistryDisplayEntry) => boolean
  ): HassEntity | undefined => {
    const entity = Object.values(hass.entities).find(predicate);
    return entity ? hass.states[entity.entity_id] : undefined;
  };

  // Try to find a control entity (no category)
  const controlState = findEntity(
    (entity: EntityRegistryDisplayEntry) =>
      entity.device_id === device.id && entity.entity_category === undefined
  );
  if (controlState) return controlState;

  // Fallback to config "Identify" entity
  return findEntity(
    (entity: EntityRegistryDisplayEntry) =>
      entity.device_id === device.id &&
      entity.entity_category === "config" &&
      entity.name === "Identify"
  );
};

declare global {
  interface HTMLElementEventMap {
    "binding-updated": CustomEvent<Record<string, MatterNodeBinding[]>>;
  }
}

@customElement("matter-device-binding-card")
export class MatterDeviceBindingCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ type: Boolean, reflect: true }) outlined = false;

  @state()
  public showHidden = false;

  @property({ attribute: false })
  public bindings?: Record<string, MatterNodeBinding[]>;

  @state()
  private deviceMapper?: MatterDeviceMapper;

  private async _deleteBinding(
    endpoint: string,
    index: number
  ): Promise<boolean> {
    const bindings = this.bindings![endpoint];
    if (!bindings) return false;

    bindings.splice(index, 1);
    const ret = await setMatterNodeBinding(
      this.hass,
      this.device.id,
      Number(endpoint),
      bindings
    );

    return ret[0].Status === 0;
  }

  async handleDeleteClickCallback(event: Event) {
    try {
      const button = event.target as HTMLElement;
      const index = Number(button.dataset.index);
      const source_endpoint = button.dataset.endpoint!;

      const success = await this._deleteBinding(source_endpoint, index);
      if (success) {
        this.bindings![source_endpoint].splice(index, 1);
        this.requestUpdate();
      } else {
        throw new Error("Failed to delete binding");
      }
    } catch (_error) {
      fireEvent(this, "hass-notification", {
        message: "Failed to delete binding",
      });
    }
  }

  private _onDialogUpdate = async (
    source_endpoint: number,
    bindings: Record<string, MatterNodeBinding[]>
  ) => {
    try {
      const ret = await setMatterNodeBinding(
        this.hass,
        this.device.id,
        source_endpoint,
        bindings[source_endpoint]
      );
      if (ret[0].Status === 0) {
        this.bindings![source_endpoint] = bindings[source_endpoint];
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
      try {
        this.bindings = await getMatterNodeBinding(this.hass, this.device.id!);
      } catch (_err) {
        alert(_err);
      }
      if (Object.values(this.bindings!).some((value) => Array.isArray(value))) {
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

  protected getDeviceByNodeId(nodeId: number) {
    if (this.deviceMapper) {
      const deviceId = this.deviceMapper!.getDeviceIdByNodeId(String(nodeId));
      if (deviceId) {
        const device = this.hass.devices![deviceId!];
        if (device) {
          return device;
        }
      }
    }
    return undefined;
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
            ? Object.entries(this.bindings).map(([key, value]) =>
                value.length > 0
                  ? html`
                      <div class="sub-card">
                        <div class="sub-card-header">
                          <div>endpoint:</div>
                          <div>${key}</div>
                        </div>
                        ${value.map(
                          (nodeItem, index) => html`
                            <section class="binding-row">
                              <ha-list-item twoline graphic="icon">
                                <span>
                                  ${(() => {
                                    const device = this.getDeviceByNodeId(
                                      nodeItem.node
                                    );
                                    return device
                                      ? device.name_by_user || device.name
                                      : "undefined";
                                  })()}
                                </span>
                                <span slot="secondary">
                                  ${"node id: " + nodeItem.node}
                                </span>

                                ${(() => {
                                  const device = this.getDeviceByNodeId(
                                    nodeItem.node
                                  );
                                  const device_state = getDeviceControlsState(
                                    this.hass,
                                    device!
                                  );
                                  return device_state
                                    ? html`
                                        <ha-state-icon
                                          slot="graphic"
                                          .hass=${this.hass}
                                          .stateObj=${device_state}
                                          )}
                                        ></ha-state-icon>
                                      `
                                    : html`
                                        <ha-svg-icon
                                          slot="graphic"
                                          .path=${mdiDevices}
                                        ></ha-svg-icon>
                                      `;
                                })()}
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
                      </div>
                    `
                  : nothing
              )
            : nothing}
        </main>
      </ha-card>
    `;
  }

  static styles = css`
    :host([outlined]) {
      box-shadow: none;
      border-width: 1px;
      border-style: solid;
      border-color: var(--outline-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
    }

    .sub-card-header {
      display: flex;
      font-size: 20px;
      padding: 10px;
      gap: 20px;
      align-items: center;
    }

    .card-header ha-icon-button {
      margin-right: -8px;
      margin-inline-end: -8px;
      margin-inline-start: initial;
      color: var(--primary-color);
      height: auto;
      direction: var(--direction);
    }

    .sub-card {
      box-shadow: none;
      border-width: 1px;
      border-style: solid;
      border-color: var(--outline-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }

    .card-content {
      display: grid;
      padding: 8px;
      gap: 5px;
    }

    .binding-row {
      display: flex;
      flex-wrap: wrap;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "matter-device-binding-card": MatterDeviceBindingCard;
  }
}
