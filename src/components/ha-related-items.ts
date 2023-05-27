import "@material/mwc-list/mwc-list";
import { mdiDevices, mdiPaletteSwatch, mdiSofa } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import { Blueprints, fetchBlueprints } from "../data/blueprint";
import { ConfigEntry, getConfigEntries } from "../data/config_entries";
import { SceneEntity } from "../data/scene";
import { findRelated, ItemType, RelatedResult } from "../data/search";
import { haStyle } from "../resources/styles";
import { HomeAssistant } from "../types";
import { brandsUrl } from "../util/brands-url";
import "./ha-icon-next";
import "./ha-list-item";
import "./ha-state-icon";
import "./ha-switch";

@customElement("ha-related-items")
export class HaRelatedItems extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public itemType!: ItemType;

  @property() public itemId!: string;

  @state() private _entries?: ConfigEntry[];

  @state() private _blueprints?: Record<"automation" | "script", Blueprints>;

  @state() private _related?: RelatedResult;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
  }

  private async _fetchConfigEntries() {
    if (this._entries) {
      return;
    }
    this.hass.loadBackendTranslation("title");
    this._entries = await getConfigEntries(this.hass);
  }

  private async _fetchBlueprints() {
    if (this._blueprints) {
      return;
    }
    const [automation, script] = await Promise.all([
      fetchBlueprints(this.hass, "automation"),
      fetchBlueprints(this.hass, "script"),
    ]);
    this._blueprints = { automation, script };
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

  protected render() {
    if (!this._related) {
      return nothing;
    }
    if (Object.keys(this._related).length === 0) {
      return html`
        ${this.hass.localize("ui.components.related-items.no_related_found")}
      `;
    }
    return html`
      ${this._related.config_entry && this._entries
        ? html`<h3>
              ${this.hass.localize("ui.components.related-items.integration")}
            </h3>
            <mwc-list
              >${this._related.config_entry.map((relatedConfigEntryId) => {
                const entry: ConfigEntry | undefined = this._entries!.find(
                  (configEntry) => configEntry.entry_id === relatedConfigEntryId
                );
                if (!entry) {
                  return "";
                }
                return html`
                  <a
                    href=${`/config/integrations/integration/${entry.domain}#config_entry=${relatedConfigEntryId}`}
                    @click=${this._navigateAwayClose}
                  >
                    <ha-list-item hasMeta graphic="icon">
                      <img
                        .src=${brandsUrl({
                          domain: entry.domain,
                          type: "icon",
                          useFallback: true,
                          darkOptimized: this.hass.themes?.darkMode,
                        })}
                        alt=${entry.domain}
                        slot="graphic"
                      />
                      ${this.hass.localize(`component.${entry.domain}.title`)}:
                      ${entry.title} <ha-icon-next slot="meta"></ha-icon-next>
                    </ha-list-item>
                  </a>
                `;
              })}</mwc-list
            >`
        : ""}
      ${this._related.device
        ? html`<h3>
              ${this.hass.localize("ui.components.related-items.device")}
            </h3>
            ${this._related.device.map((relatedDeviceId) => {
              const device = this.hass.devices[relatedDeviceId];
              if (!device) {
                return "";
              }
              return html`
                <a
                  href="/config/devices/device/${relatedDeviceId}"
                  @click=${this._navigateAwayClose}
                >
                  <ha-list-item hasMeta graphic="icon">
                    <ha-svg-icon
                      .path=${mdiDevices}
                      slot="graphic"
                    ></ha-svg-icon>
                    ${device.name_by_user || device.name}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                </a>
              `;
            })}            </mwc-list>
            `
        : ""}
      ${this._related.area
        ? html`<h3>
              ${this.hass.localize("ui.components.related-items.area")}
            </h3>
            <mwc-list
              >${this._related.area.map((relatedAreaId) => {
                const area = this.hass.areas[relatedAreaId];
                if (!area) {
                  return "";
                }
                return html`
                  <a
                    href="/config/areas/area/${relatedAreaId}"
                    @click=${this._navigateAwayClose}
                  >
                    <ha-list-item
                      hasMeta
                      .graphic=${area.picture ? "avatar" : "icon"}
                    >
                      ${area.picture
                        ? html` <div
                            class="avatar"
                            style=${styleMap({
                              backgroundImage: `url(${area.picture})`,
                            })}
                            slot="graphic"
                          ></div>`
                        : html`<ha-svg-icon
                            .path=${mdiSofa}
                            slot="graphic"
                          ></ha-svg-icon>`}
                      ${area.name}
                      <ha-icon-next slot="meta"></ha-icon-next>
                    </ha-list-item>
                  </a>
                `;
              })}</mwc-list
            >`
        : ""}
      ${this._related.entity
        ? html`
            <h3>${this.hass.localize("ui.components.related-items.entity")}</h3>
            <mwc-list>
              ${this._related.entity.map((entityId) => {
                const entity: HassEntity | undefined =
                  this.hass.states[entityId];
                if (!entity) {
                  return "";
                }
                return html`
                  <ha-list-item
                    @click=${this._openMoreInfo}
                    .entityId=${entityId}
                    hasMeta
                    graphic="icon"
                  >
                    <ha-state-icon
                      .state=${entity}
                      slot="graphic"
                    ></ha-state-icon>
                    ${entity.attributes.friendly_name || entity.entity_id}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                `;
              })}
            </mwc-list>
          `
        : ""}
      ${this._related.group
        ? html`
            <h3>${this.hass.localize("ui.components.related-items.group")}</h3>
            <mwc-list>
              ${this._related.group.map((groupId) => {
                const group: HassEntity | undefined = this.hass.states[groupId];
                if (!group) {
                  return "";
                }
                return html`
                  <ha-list-item
                    @click=${this._openMoreInfo}
                    .entityId=${groupId}
                    hasMeta
                    graphic="icon"
                  >
                    <ha-state-icon
                      .state=${group}
                      slot="graphic"
                    ></ha-state-icon>
                    ${group.attributes.friendly_name || group.entity_id}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                `;
              })}
            </mwc-list>
          `
        : ""}
      ${this._related.scene
        ? html`
            <h3>${this.hass.localize("ui.components.related-items.scene")}</h3>
            <mwc-list>
              ${this._related.scene.map((sceneId) => {
                const scene: SceneEntity | undefined =
                  this.hass.states[sceneId];
                if (!scene) {
                  return "";
                }
                return html`
                  <ha-list-item
                    @click=${this._openMoreInfo}
                    .entityId=${sceneId}
                    hasMeta
                    graphic="icon"
                  >
                    <ha-state-icon
                      .state=${scene}
                      slot="graphic"
                    ></ha-state-icon>
                    ${scene.attributes.friendly_name || scene.entity_id}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                `;
              })}
            </mwc-list>
          `
        : ""}
      ${this._related.automation_blueprint
        ? html`
            <h3>
              ${this.hass.localize("ui.components.related-items.blueprint")}
            </h3>
            <mwc-list>
              ${this._related.automation_blueprint.map((path) => {
                const blueprintMeta = this._blueprints
                  ? this._blueprints.automation[path]
                  : undefined;
                return html`<a
                  href="/config/blueprint/dashboard"
                  @click=${this._navigateAwayClose}
                >
                  <ha-list-item hasMeta graphic="icon">
                    <ha-svg-icon
                      .path=${mdiPaletteSwatch}
                      slot="graphic"
                    ></ha-svg-icon>
                    ${!blueprintMeta || "error" in blueprintMeta
                      ? path
                      : blueprintMeta.metadata.name || path}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                </a>`;
              })}
            </mwc-list>
          `
        : ""}
      ${this._related.automation
        ? html`
            <h3>
              ${this.hass.localize("ui.components.related-items.automation")}
            </h3>
            <mwc-list>
              ${this._related.automation.map((automationId) => {
                const automation: HassEntity | undefined =
                  this.hass.states[automationId];
                if (!automation) {
                  return "";
                }
                return html`
                  <ha-list-item
                    @click=${this._openMoreInfo}
                    .entityId=${automationId}
                    hasMeta
                    graphic="icon"
                  >
                    <ha-state-icon
                      .state=${automation}
                      slot="graphic"
                    ></ha-state-icon>
                    ${automation.attributes.friendly_name ||
                    automation.entity_id}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                `;
              })}
            </mwc-list>
          `
        : ""}
      ${this._related.script_blueprint
        ? html`
            <h3>
              ${this.hass.localize("ui.components.related-items.blueprint")}
            </h3>
            <mwc-list>
              ${this._related.script_blueprint.map((path) => {
                const blueprintMeta = this._blueprints
                  ? this._blueprints.script[path]
                  : undefined;
                return html`<a
                  href="/config/blueprint/dashboard"
                  @click=${this._navigateAwayClose}
                >
                  <ha-list-item hasMeta graphic="icon">
                    <ha-svg-icon
                      .path=${mdiPaletteSwatch}
                      slot="graphic"
                    ></ha-svg-icon>
                    ${!blueprintMeta || "error" in blueprintMeta
                      ? path
                      : blueprintMeta.metadata.name || path}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                </a>`;
              })}
            </mwc-list>
          `
        : ""}
      ${this._related.script
        ? html`
            <h3>${this.hass.localize("ui.components.related-items.script")}</h3>
            <mwc-list>
              ${this._related.script.map((scriptId) => {
                const script: HassEntity | undefined =
                  this.hass.states[scriptId];
                if (!script) {
                  return "";
                }
                return html`
                  <ha-list-item
                    @click=${this._openMoreInfo}
                    .entityId=${scriptId}
                    hasMeta
                    graphic="icon"
                  >
                    <ha-state-icon
                      .state=${script}
                      slot="graphic"
                    ></ha-state-icon>
                    ${script.attributes.friendly_name || script.entity_id}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                `;
              })}
            </mwc-list>
          `
        : ""}
    `;
  }

  private async _navigateAwayClose() {
    // allow new page to open before closing dialog
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    fireEvent(this, "close-dialog");
  }

  private async _findRelated() {
    this._related = await findRelated(this.hass, this.itemType, this.itemId);
    if (this._related.config_entry) {
      this._fetchConfigEntries();
    }
    if (this._related.script_blueprint || this._related.automation_blueprint) {
      this._fetchBlueprints();
    }
  }

  private _openMoreInfo(ev: CustomEvent) {
    const entityId = (ev.target as any).entityId;
    fireEvent(this, "hass-more-info", { entityId });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        a {
          color: var(--primary-color);
          text-decoration: none;
        }
        ha-list-item {
          --mdc-list-side-padding: 24px;
        }
        h3 {
          padding: 0 24px;
          margin-bottom: 0;
        }
        h3:first-child {
          margin-top: 0;
        }
        .avatar {
          background-position: center center;
          background-size: cover;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-related-items": HaRelatedItems;
  }
}
