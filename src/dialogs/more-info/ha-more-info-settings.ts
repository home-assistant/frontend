import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import "../../components/ha-alert";
import {
  EntityRegistryEntry,
  ExtEntityRegistryEntry,
} from "../../data/entity_registry";
import { PLATFORMS_WITH_SETTINGS_TAB } from "../../panels/config/entities/const";
import "../../panels/config/entities/entity-registry-settings";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";

@customElement("ha-more-info-settings")
export class HaMoreInfoSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @state() private entry?: EntityRegistryEntry | ExtEntityRegistryEntry | null;

  @state() private _settingsElementTag?: string;

  protected render() {
    // loading.
    if (this.entry === undefined) {
      return nothing;
    }

    // No unique ID
    if (this.entry === null) {
      return html`
        <div class="content">
          <ha-alert alert-type="warning">
            ${this.hass.localize("ui.dialogs.entity_registry.no_unique_id", {
              entity_id: this.entityId,
              faq_link: html`<a
                href=${documentationUrl(this.hass, "/faq/unique_id")}
                target="_blank"
                rel="noreferrer"
                >${this.hass.localize("ui.dialogs.entity_registry.faq")}</a
              >`,
            })}
          </ha-alert>
        </div>
      `;
    }

    if (!this._settingsElementTag) {
      return nothing;
    }

    return html`
      ${dynamicElement(this._settingsElementTag, {
        hass: this.hass,
        entry: this.entry,
        entityId: this.entityId,
      })}
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("entry")) {
      this._loadPlatformSettingTabs();
    }
  }

  private async _loadPlatformSettingTabs(): Promise<void> {
    if (!this.entry) {
      return;
    }
    if (
      !Object.keys(PLATFORMS_WITH_SETTINGS_TAB).includes(this.entry.platform)
    ) {
      this._settingsElementTag = "entity-registry-settings";
      return;
    }
    const tag = PLATFORMS_WITH_SETTINGS_TAB[this.entry.platform];
    await import(`../../panels/config/entities/editor-tabs/settings/${tag}`);
    this._settingsElementTag = tag;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .content {
          padding: 8px 24px 24px 24px;
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
