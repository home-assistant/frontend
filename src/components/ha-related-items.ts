import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../data/area_registry";
import { ConfigEntry, getConfigEntries } from "../data/config_entries";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../data/device_registry";
import { SceneEntity } from "../data/scene";
import { findRelated, ItemType, RelatedResult } from "../data/search";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { HomeAssistant } from "../types";
import "./ha-switch";

@customElement("ha-related-items")
export class HaRelatedItems extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;
  @property() public itemType!: ItemType;
  @property() public itemId!: string;
  @property() private _entries?: ConfigEntry[];
  @property() private _devices?: DeviceRegistryEntry[];
  @property() private _areas?: AreaRegistryEntry[];
  @property() private _related?: RelatedResult;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._devices = devices;
      }),
      subscribeAreaRegistry(this.hass.connection!, (areas) => {
        this._areas = areas;
      }),
    ];
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    getConfigEntries(this.hass).then((configEntries) => {
      this._entries = configEntries;
    });
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (
      (changedProps.has("itemId") || changedProps.has("itemType")) &&
      this.itemId &&
      this.itemType
    ) {
      this._findRelated();
    }
  }

  protected render(): TemplateResult {
    if (!this._related) {
      return html``;
    }
    return html`
      ${this._related.config_entry && this._entries
        ? this._related.config_entry.map((relatedConfigEntryId) => {
            const entry: ConfigEntry | undefined = this._entries!.find(
              (configEntry) => configEntry.entry_id === relatedConfigEntryId
            );
            if (!entry) {
              return;
            }
            return html`
              <h3>
                ${this.hass.localize(
                  "ui.components.related-items.integration"
                )}:
              </h3>
              <a
                href="/config/integrations/config_entry/${relatedConfigEntryId}"
                @click=${this._close}
              >
                ${this.hass.localize(`component.${entry.domain}.config.title`)}:
                ${entry.title}
              </a>
            `;
          })
        : ""}
      ${this._related.device && this._devices
        ? this._related.device.map((relatedDeviceId) => {
            const device: DeviceRegistryEntry | undefined = this._devices!.find(
              (dev) => dev.id === relatedDeviceId
            );
            if (!device) {
              return;
            }
            return html`
              <h3>
                ${this.hass.localize("ui.components.related-items.device")}:
              </h3>
              <a
                href="/config/devices/device/${relatedDeviceId}"
                @click=${this._close}
              >
                ${device.name_by_user || device.name}
              </a>
            `;
          })
        : ""}
      ${this._related.area && this._areas
        ? this._related.area.map((relatedAreaId) => {
            const area: AreaRegistryEntry | undefined = this._areas!.find(
              (ar) => ar.area_id === relatedAreaId
            );
            if (!area) {
              return;
            }
            return html`
              <h3>
                ${this.hass.localize("ui.components.related-items.area")}:
              </h3>
              ${area.name}
            `;
          })
        : ""}
      ${this._related.entity
        ? html`
            <h3>
              ${this.hass.localize("ui.components.related-items.entity")}:
            </h3>
            <ul>
              ${this._related.entity.map((entityId) => {
                const entity: HassEntity | undefined = this.hass.states[
                  entityId
                ];
                if (!entity) {
                  return;
                }
                return html`
                  <li>
                    <button
                      @click=${this._openMoreInfo}
                      .entityId="${entityId}"
                      class="link"
                    >
                      ${entity.attributes.friendly_name || entityId}
                    </button>
                  </li>
                `;
              })}
            </ul>
          `
        : ""}
      ${this._related.group
        ? html`
            <h3>${this.hass.localize("ui.components.related-items.group")}:</h3>
            <ul>
              ${this._related.group.map((groupId) => {
                const group: HassEntity | undefined = this.hass.states[groupId];
                if (!group) {
                  return;
                }
                return html`
                  <li>
                    <button
                      class="link"
                      @click=${this._openMoreInfo}
                      .entityId="${groupId}"
                    >
                      ${group.attributes.friendly_name || group.entity_id}
                    </button>
                  </li>
                `;
              })}
            </ul>
          `
        : ""}
      ${this._related.scene
        ? html`
            <h3>${this.hass.localize("ui.components.related-items.scene")}:</h3>
            <ul>
              ${this._related.scene.map((sceneId) => {
                const scene: SceneEntity | undefined = this.hass.states[
                  sceneId
                ];
                if (!scene) {
                  return;
                }
                return html`
                  <li>
                    <button
                      class="link"
                      @click=${this._openMoreInfo}
                      .entityId="${sceneId}"
                    >
                      ${scene.attributes.friendly_name || scene.entity_id}
                    </button>
                  </li>
                `;
              })}
            </ul>
          `
        : ""}
      ${this._related.automation
        ? html`
            <h3>
              ${this.hass.localize("ui.components.related-items.automation")}:
            </h3>
            <ul>
              ${this._related.automation.map((automationId) => {
                const automation: HassEntity | undefined = this.hass.states[
                  automationId
                ];
                if (!automation) {
                  return;
                }
                return html`
                  <li>
                    <button
                      class="link"
                      @click=${this._openMoreInfo}
                      .entityId="${automationId}"
                    >
                      ${automation.attributes.friendly_name ||
                        automation.entity_id}
                    </button>
                  </li>
                `;
              })}
            </ul>
          `
        : ""}
      ${this._related.script
        ? html`
            <h3>
              ${this.hass.localize("ui.components.related-items.script")}:
            </h3>
            <ul>
              ${this._related.script.map((scriptId) => {
                const script: HassEntity | undefined = this.hass.states[
                  scriptId
                ];
                if (!script) {
                  return;
                }
                return html`
                  <li>
                    <button
                      class="link"
                      @click=${this._openMoreInfo}
                      .entityId="${scriptId}"
                    >
                      ${script.attributes.friendly_name || script.entity_id}
                    </button>
                  </li>
                `;
              })}
            </ul>
          `
        : ""}
    `;
  }

  private async _findRelated() {
    this._related = await findRelated(this.hass, this.itemType, this.itemId);
    await this.updateComplete;
    fireEvent(this, "iron-resize");
  }

  private _openMoreInfo(ev: CustomEvent) {
    const entityId = (ev.target as any).entityId;
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _close() {
    fireEvent(this, "close-dialog");
  }

  static get styles(): CSSResult {
    return css`
      a {
        color: var(--primary-color);
      }
      button.link {
        color: var(--primary-color);
        text-align: left;
        cursor: pointer;
        background: none;
        border-width: initial;
        border-style: none;
        border-color: initial;
        border-image: initial;
        padding: 0px;
        font: inherit;
        text-decoration: underline;
      }
      h3 {
        font-family: var(--paper-font-title_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-title_-_-webkit-font-smoothing
        );
        font-size: var(--paper-font-title_-_font-size);
        font-weight: var(--paper-font-headline-_font-weight);
        letter-spacing: var(--paper-font-title_-_letter-spacing);
        line-height: var(--paper-font-title_-_line-height);
        opacity: var(--dark-primary-opacity);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-related-items": HaRelatedItems;
  }
}
