import {
  mdiDevices,
  mdiPaletteSwatch,
  mdiTextureBox,
  mdiTransitConnectionVariant,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import type { HASSDomCurrentTargetEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import type { Blueprints } from "../data/blueprint";
import { fetchBlueprints } from "../data/blueprint";
import type { ConfigEntry } from "../data/config_entries";
import { getConfigEntries } from "../data/config_entries";
import type { ItemType, RelatedResult } from "../data/search";
import { findRelated } from "../data/search";
import type { HomeAssistant } from "../types";
import { brandsUrl } from "../util/brands-url";
import "./ha-icon";
import "./ha-icon-next";
import "./ha-state-icon";
import "./ha-svg-icon";
import "./item/ha-list-item-button";
import type { HaListItemButton } from "./item/ha-list-item-button";
import "./list/ha-grouped-list";

@customElement("ha-related-items")
export class HaRelatedItems extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public itemType!: ItemType;

  @property({ attribute: false }) public itemId!: string;

  @property({ attribute: false }) public exclude?: (keyof RelatedResult)[];

  @property({ type: Boolean, reflect: true }) public empty = true;

  @state() private _entries?: ConfigEntry[];

  @state() private _blueprints?: Record<"automation" | "script", Blueprints>;

  @state() private _related?: RelatedResult;

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

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("_related") || changedProps.has("exclude")) {
      this.empty =
        !this._related ||
        !Object.entries(this._related).some(
          ([section, items]) =>
            items?.length &&
            !this.exclude?.includes(section as keyof RelatedResult)
        );
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (
      (changedProps.has("itemId") || changedProps.has("itemType")) &&
      this.itemId &&
      this.itemType
    ) {
      this._findRelated();
    }
  }

  private _relatedEntities = memoizeOne((entityIds: string[]) =>
    this._toEntities(entityIds)
  );

  private _relatedAutomations = memoizeOne((automationEntityIds: string[]) =>
    this._toEntities(automationEntityIds)
  );

  private _relatedScripts = memoizeOne((scriptEntityIds: string[]) =>
    this._toEntities(scriptEntityIds)
  );

  private _relatedGroups = memoizeOne((groupEntityIds: string[]) =>
    this._toEntities(groupEntityIds)
  );

  private _relatedScenes = memoizeOne((sceneEntityIds: string[]) =>
    this._toEntities(sceneEntityIds)
  );

  private _toEntities = (entityIds: string[]) =>
    entityIds
      .map((entityId) => this.hass.states[entityId])
      .filter((entity) => entity)
      .sort((a, b) =>
        caseInsensitiveStringCompare(
          a.attributes.friendly_name ?? a.entity_id,
          b.attributes.friendly_name ?? b.entity_id,
          this.hass.language
        )
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

  private _isExcluded(section: keyof RelatedResult) {
    return this.exclude?.includes(section) ?? false;
  }

  protected render() {
    if (!this._related) {
      return nothing;
    }

    const { configEntries, configEntryDomains } = this._getConfigEntries(
      this._related.config_entry,
      this._entries
    );

    return html`
      ${
        this._related.entity && !this._isExcluded("entity")
          ? html`
              <ha-grouped-list
                .header=${this.hass.localize(
                  "ui.components.related-items.entity"
                )}
              >
                ${this._relatedEntities(this._related.entity).map((entity) =>
                  this._renderEntityRow(entity)
                )}
              </ha-grouped-list>
            `
          : nothing
      }
      ${
        this._related.device && !this._isExcluded("device")
          ? html`
              <ha-grouped-list
                .header=${this.hass.localize(
                  "ui.components.related-items.device"
                )}
              >
                ${this._related.device.map((relatedDeviceId) => {
                  const device = this.hass.devices[relatedDeviceId];
                  if (!device) {
                    return nothing;
                  }
                  return html`
                    <ha-list-item-button
                      .href=${`/config/devices/device/${relatedDeviceId}`}
                      .headline=${device.name_by_user || device.name || ""}
                    >
                      <ha-svg-icon
                        slot="start"
                        .path=${
                          device.entry_type === "service"
                            ? mdiTransitConnectionVariant
                            : mdiDevices
                        }
                      ></ha-svg-icon>
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>
                  `;
                })}
              </ha-grouped-list>
            `
          : nothing
      }
      ${
        (configEntries || this._related.integration) &&
        !this._isExcluded("integration")
          ? html`
              <ha-grouped-list
                .header=${this.hass.localize(
                  "ui.components.related-items.integration"
                )}
              >
                ${configEntries?.map((entry) => {
                  if (!entry) {
                    return nothing;
                  }
                  return html`
                    <ha-list-item-button
                      .href=${`/config/integrations/integration/${entry.domain}#config_entry=${entry.entry_id}`}
                      .headline=${`${this.hass.localize(
                        `component.${entry.domain}.title`
                      )}: ${entry.title}`}
                    >
                      ${this._renderBrandIcon(entry.domain)}
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>
                  `;
                })}
                ${this._related.integration
                  ?.filter(
                    (integration) => !configEntryDomains.has(integration)
                  )
                  .map(
                    (integration) => html`
                      <ha-list-item-button
                        .href=${`/config/integrations/integration/${integration}`}
                        .headline=${this.hass.localize(
                          `component.${integration}.title`
                        )}
                      >
                        ${this._renderBrandIcon(integration)}
                        <ha-icon-next slot="end"></ha-icon-next>
                      </ha-list-item-button>
                    `
                  )}
              </ha-grouped-list>
            `
          : nothing
      }
      ${
        this._related.area && !this._isExcluded("area")
          ? html`
              <ha-grouped-list
                .header=${this.hass.localize("ui.components.related-items.area")}
              >
                ${this._related.area.map((relatedAreaId) => {
                  const area = this.hass.areas[relatedAreaId];
                  if (!area) {
                    return nothing;
                  }
                  return html`
                    <ha-list-item-button
                      .href=${`/config/areas/area/${relatedAreaId}`}
                      .headline=${area.name}
                    >
                      ${
                        area.picture
                          ? html`
                              <div
                                class="avatar"
                                style=${styleMap({
                                  backgroundImage: `url(${area.picture})`,
                                })}
                                slot="start"
                              ></div>
                            `
                          : area.icon
                            ? html`
                                <ha-icon
                                  slot="start"
                                  .icon=${area.icon}
                                ></ha-icon>
                              `
                            : html`
                                <ha-svg-icon
                                  slot="start"
                                  .path=${mdiTextureBox}
                                ></ha-svg-icon>
                              `
                      }
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>
                  `;
                })}
              </ha-grouped-list>
            `
          : nothing
      }
      ${
        this._related.group && !this._isExcluded("group")
          ? html`
              <ha-grouped-list
                .header=${this.hass.localize("ui.components.related-items.group")}
              >
                ${this._relatedGroups(this._related.group).map((group) =>
                  this._renderEntityRow(group)
                )}
              </ha-grouped-list>
            `
          : nothing
      }
      ${
        this._related.scene && !this._isExcluded("scene")
          ? html`
              <ha-grouped-list
                .header=${this.hass.localize("ui.components.related-items.scene")}
              >
                ${this._relatedScenes(this._related.scene).map((scene) =>
                  this._renderEntityRow(scene)
                )}
              </ha-grouped-list>
            `
          : nothing
      }
      ${
        this._related.automation_blueprint &&
        !this._isExcluded("automation_blueprint")
          ? html`
              <ha-grouped-list
                .header=${this.hass.localize(
                  "ui.components.related-items.blueprint"
                )}
              >
                ${this._related.automation_blueprint.map((path) =>
                  this._renderBlueprintRow(path, "automation")
                )}
              </ha-grouped-list>
            `
          : nothing
      }
      ${
        this._related.automation && !this._isExcluded("automation")
          ? html`
              <ha-grouped-list
                .header=${this.hass.localize(
                  "ui.components.related-items.automation"
                )}
              >
                ${this._relatedAutomations(this._related.automation).map(
                  (automation) => this._renderEntityRow(automation)
                )}
              </ha-grouped-list>
            `
          : nothing
      }
      ${
        this._related.script_blueprint && !this._isExcluded("script_blueprint")
          ? html`
              <ha-grouped-list
                .header=${this.hass.localize(
                  "ui.components.related-items.blueprint"
                )}
              >
                ${this._related.script_blueprint.map((path) =>
                  this._renderBlueprintRow(path, "script")
                )}
              </ha-grouped-list>
            `
          : nothing
      }
      ${
        this._related.script && !this._isExcluded("script")
          ? html`
              <ha-grouped-list
                .header=${this.hass.localize(
                  "ui.components.related-items.script"
                )}
              >
                ${this._relatedScripts(this._related.script).map((script) =>
                  this._renderEntityRow(script)
                )}
              </ha-grouped-list>
            `
          : nothing
      }
    `;
  }

  private _renderEntityRow(entity: HassEntity) {
    return html`
      <ha-list-item-button
        .headline=${entity.attributes.friendly_name || entity.entity_id}
        data-entity-id=${entity.entity_id}
        @click=${this._openMoreInfo}
      >
        <ha-state-icon slot="start" .stateObj=${entity}></ha-state-icon>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private _renderBrandIcon(domain: string) {
    return html`
      <img
        slot="start"
        alt=""
        loading="lazy"
        crossorigin="anonymous"
        referrerpolicy="no-referrer"
        src=${brandsUrl(
          {
            domain,
            type: "icon",
            darkOptimized: this.hass.themes?.darkMode,
          },
          this.hass.auth.data.hassUrl
        )}
      />
    `;
  }

  private _renderBlueprintRow(path: string, type: "automation" | "script") {
    const blueprintMeta = this._blueprints
      ? this._blueprints[type][path]
      : undefined;
    return html`
      <ha-list-item-button
        href="/config/blueprint/dashboard"
        .headline=${
          !blueprintMeta || "error" in blueprintMeta
            ? path
            : blueprintMeta.metadata.name || path
        }
      >
        <ha-svg-icon slot="start" .path=${mdiPaletteSwatch}></ha-svg-icon>
        <ha-icon-next slot="end"></ha-icon-next>
      </ha-list-item-button>
    `;
  }

  private async _findRelated() {
    this._related = await findRelated(this.hass, this.itemType, this.itemId);
    if (this._related.config_entry && !this._isExcluded("integration")) {
      this._fetchConfigEntries();
    }
    if (this._related.script_blueprint || this._related.automation_blueprint) {
      this._fetchBlueprints();
    }
  }

  private _openMoreInfo(ev: HASSDomCurrentTargetEvent<HaListItemButton>) {
    const entityId = ev.currentTarget.dataset.entityId;
    if (!entityId) {
      return;
    }
    fireEvent(this, "hass-more-info", { entityId });
  }

  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-6);
    }

    :host([empty]) {
      display: none;
    }

    ha-list-item-button {
      --ha-row-item-padding-block: var(--ha-space-2);
      --ha-row-item-min-height: 40px;
      --ha-row-item-gap: var(--ha-space-3);
      --mdc-icon-size: 20px;
    }

    img[slot="start"],
    .avatar {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }

    .avatar {
      border-radius: var(--ha-border-radius-circle);
      background-position: center center;
      background-size: cover;
    }

    ha-icon-next {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-related-items": HaRelatedItems;
  }
}
