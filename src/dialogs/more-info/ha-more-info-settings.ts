import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
  getExtendedEntityRegistryEntry,
} from "../../data/entity_registry";
import { PLATFORMS_WITH_SETTINGS_TAB } from "../../panels/config/entities/const";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import "../../panels/config/entities/entity-registry-settings";

@customElement("ha-more-info-settings")
export class HaMoreInfoSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @state() private _entry?: EntityRegistryEntry | ExtEntityRegistryEntry | null;

  @state() private _settingsElementTag?: string;

  protected render() {
    // loading.
    if (this._entry === undefined) {
      return html``;
    }

    // No unique ID
    if (this._entry === null) {
      return html`
        <div class="content">
          ${this.hass.localize(
            "ui.dialogs.entity_registry.no_unique_id",
            "entity_id",
            this.entityId,
            "faq_link",
            html`<a
              href=${documentationUrl(this.hass, "/faq/unique_id")}
              target="_blank"
              rel="noreferrer"
              >${this.hass.localize("ui.dialogs.entity_registry.faq")}</a
            >`
          )}
        </div>
      `;
    }

    if (!this._settingsElementTag) {
      return html``;
    }

    return html`
      ${dynamicElement(this._settingsElementTag, {
        hass: this.hass,
        entry: this._entry,
        entityId: this.entityId,
      })}
    `;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has("entityId")) {
      this._entry = undefined;
      if (this.entityId) {
        this._getEntityReg();
      }
    }
  }

  private async _getEntityReg() {
    try {
      this._entry = await getExtendedEntityRegistryEntry(
        this.hass,
        this.entityId
      );
      this._loadPlatformSettingTabs();
    } catch {
      this._entry = null;
    }
  }

  private async _loadPlatformSettingTabs(): Promise<void> {
    if (!this._entry) {
      return;
    }
    if (
      !Object.keys(PLATFORMS_WITH_SETTINGS_TAB).includes(this._entry.platform)
    ) {
      this._settingsElementTag = "entity-registry-settings";
      return;
    }
    const tag = PLATFORMS_WITH_SETTINGS_TAB[this._entry.platform];
    await import(`../../panels/config/entities/editor-tabs/settings/${tag}`);
    this._settingsElementTag = tag;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .content {
          padding: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-settings": HaMoreInfoSettings;
  }
}
