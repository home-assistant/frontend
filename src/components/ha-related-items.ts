import "@material/mwc-list/mwc-list";
import {
  mdiAlertCircleOutline,
  mdiDevices,
  mdiPaletteSwatch,
  mdiTextureBox,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import type { Blueprints } from "../data/blueprint";
import { fetchBlueprints } from "../data/blueprint";
import type { ConfigEntry } from "../data/config_entries";
import { getConfigEntries } from "../data/config_entries";
import type { ItemType, RelatedResult } from "../data/search";
import { findRelated } from "../data/search";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";
import { brandsUrl } from "../util/brands-url";
import "./ha-icon-next";
import "./ha-list-item";
import "./ha-state-icon";
import "./ha-switch";

@customElement("ha-related-items")
export class HaRelatedItems extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public itemType!: ItemType;

  @property({ attribute: false }) public itemId!: string;

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

  private _toEntities = memoizeOne((entityIds: string[]) =>
    entityIds.map((entityId) => this.hass.states[entityId])
  );

  private _getConfigEntries = memoizeOne(
    (
      relatedConfigEntries: string[] | undefined,
      entries: ConfigEntry[] | undefined
    ) => {
      const configEntries =
        relatedConfigEntries && entries
          ? relatedConfigEntries.map((entryId) =>
              entries!.find((configEntry) => configEntry.entry_id === entryId)
            )
          : undefined;

      const configEntryDomains = new Set(
        configEntries?.map((entry) => entry?.domain)
      );

      return { configEntries, configEntryDomains };
    }
  );

  protected render() {
    if (!this._related) {
      return nothing;
    }
    if (Object.keys(this._related).length === 0) {
      return html`
        <mwc-list>
          <ha-list-item hasMeta graphic="icon" noninteractive>
            <ha-svg-icon
              .path=${mdiAlertCircleOutline}
              slot="graphic"
            ></ha-svg-icon>
            ${this.hass.localize(
              "ui.components.related-items.no_related_found"
            )}
          </ha-list-item>
        </mwc-list>
      `;
    }

    const { configEntries, configEntryDomains } = this._getConfigEntries(
      this._related.config_entry,
      this._entries
    );

    return html`
      ${configEntries || this._related.integration
        ? html`<h3>
              ${this.hass.localize("ui.components.related-items.integration")}
            </h3>
            <mwc-list
              >${configEntries?.map((entry) => {
                if (!entry) {
                  return nothing;
                }
                return html`
                  <a
                    href=${`/config/integrations/integration/${entry.domain}#config_entry=${entry.entry_id}`}
                  >
                    <ha-list-item hasMeta graphic="icon">
                      <img
                        .src=${brandsUrl({
                          domain: entry.domain,
                          type: "icon",
                          useFallback: true,
                          darkOptimized: this.hass.themes?.darkMode,
                        })}
                        crossorigin="anonymous"
                        referrerpolicy="no-referrer"
                        alt=${entry.domain}
                        slot="graphic"
                      />
                      ${this.hass.localize(`component.${entry.domain}.title`)}:
                      ${entry.title} <ha-icon-next slot="meta"></ha-icon-next>
                    </ha-list-item>
                  </a>
                `;
              })}
              ${this._related.integration
                ?.filter((integration) => !configEntryDomains.has(integration))
                .map(
                  (integration) =>
                    html`<a
                      href=${`/config/integrations/integration/${integration}`}
                    >
                      <ha-list-item hasMeta graphic="icon">
                        <img
                          .src=${brandsUrl({
                            domain: integration,
                            type: "icon",
                            useFallback: true,
                            darkOptimized: this.hass.themes?.darkMode,
                          })}
                          crossorigin="anonymous"
                          referrerpolicy="no-referrer"
                          alt=${integration}
                          slot="graphic"
                        />
                        ${this.hass.localize(`component.${integration}.title`)}
                        <ha-icon-next slot="meta"></ha-icon-next>
                      </ha-list-item>
                    </a>`
                )}
            </mwc-list>`
        : nothing}
      ${this._related.area
        ? html`<h3>
              ${this.hass.localize("ui.components.related-items.area")}
            </h3>
            <mwc-list>
              ${this._related.area.map((relatedAreaId) => {
                const area = this.hass.areas[relatedAreaId];
                if (!area) {
                  return nothing;
                }
                return html`
                  <a href="/config/areas/area/${relatedAreaId}">
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
                        : area.icon
                          ? html`<ha-icon
                              slot="graphic"
                              .icon=${area.icon}
                            ></ha-icon>`
                          : html`<ha-svg-icon
                              slot="graphic"
                              .path=${mdiTextureBox}
                            ></ha-svg-icon>`}
                      ${area.name}
                      <ha-icon-next slot="meta"></ha-icon-next>
                    </ha-list-item>
                  </a>
                `;
              })}
            </mwc-list>`
        : nothing}
      ${this._related.device
        ? html`<h3>
              ${this.hass.localize("ui.components.related-items.device")}
            </h3>
            <mwc-list>
              ${this._related.device.map((relatedDeviceId) => {
                const device = this.hass.devices[relatedDeviceId];
                if (!device) {
                  return nothing;
                }
                return html`
                  <a href="/config/devices/device/${relatedDeviceId}">
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
              })}
            </mwc-list>`
        : nothing}
      ${this._related.entity
        ? html`
            <h3>${this.hass.localize("ui.components.related-items.entity")}</h3>
            <mwc-list>
              ${this._toEntities(this._related.entity).map(
                (entity) => html`
                  <ha-list-item
                    @click=${this._openMoreInfo}
                    .entityId=${entity.entity_id}
                    hasMeta
                    graphic="icon"
                  >
                    <ha-state-icon
                      .hass=${this.hass}
                      .stateObj=${entity}
                      slot="graphic"
                    ></ha-state-icon>
                    ${entity.attributes.friendly_name || entity.entity_id}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                `
              )}
            </mwc-list>
          `
        : nothing}
      ${this._related.group
        ? html`
            <h3>${this.hass.localize("ui.components.related-items.group")}</h3>
            <mwc-list>
              ${this._toEntities(this._related.group).map(
                (group) => html`
                  <ha-list-item
                    @click=${this._openMoreInfo}
                    .entityId=${group.entity_id}
                    hasMeta
                    graphic="icon"
                  >
                    <ha-state-icon
                      .hass=${this.hass}
                      .stateObj=${group}
                      slot="graphic"
                    ></ha-state-icon>
                    ${group.attributes.friendly_name || group.entity_id}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                `
              )}
            </mwc-list>
          `
        : nothing}
      ${this._related.scene
        ? html`
            <h3>${this.hass.localize("ui.components.related-items.scene")}</h3>
            <mwc-list>
              ${this._toEntities(this._related.scene).map(
                (scene) => html`
                  <ha-list-item
                    @click=${this._openMoreInfo}
                    .entityId=${scene.entity_id}
                    hasMeta
                    graphic="icon"
                  >
                    <ha-state-icon
                      .hass=${this.hass}
                      .stateObj=${scene}
                      slot="graphic"
                    ></ha-state-icon>
                    ${scene.attributes.friendly_name || scene.entity_id}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                `
              )}
            </mwc-list>
          `
        : nothing}
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
                return html`<a href="/config/blueprint/dashboard">
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
        : nothing}
      ${this._related.automation
        ? html`
            <h3>
              ${this.hass.localize("ui.components.related-items.automation")}
            </h3>
            <mwc-list>
              ${this._toEntities(this._related.automation).map(
                (automation) => html`
                  <ha-list-item
                    @click=${this._openMoreInfo}
                    .entityId=${automation.entity_id}
                    hasMeta
                    graphic="icon"
                  >
                    <ha-state-icon
                      .hass=${this.hass}
                      .stateObj=${automation}
                      slot="graphic"
                    ></ha-state-icon>
                    ${automation.attributes.friendly_name ||
                    automation.entity_id}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                `
              )}
            </mwc-list>
          `
        : nothing}
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
                return html`<a href="/config/blueprint/dashboard">
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
        : nothing}
      ${this._related.script
        ? html`
            <h3>${this.hass.localize("ui.components.related-items.script")}</h3>
            <mwc-list>
              ${this._toEntities(this._related.script).map(
                (script) => html`
                  <ha-list-item
                    @click=${this._openMoreInfo}
                    .entityId=${script.entity_id}
                    hasMeta
                    graphic="icon"
                  >
                    <ha-state-icon
                      .hass=${this.hass}
                      .stateObj=${script}
                      slot="graphic"
                    ></ha-state-icon>
                    ${script.attributes.friendly_name || script.entity_id}
                    <ha-icon-next slot="meta"></ha-icon-next>
                  </ha-list-item>
                `
              )}
            </mwc-list>
          `
        : nothing}
    `;
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
