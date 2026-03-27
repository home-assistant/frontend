import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { until } from "lit/directives/until";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-list";
import "../../../../components/ha-list-item";
import type { EntityRegistryEntry } from "../../../../data/entity/entity_registry";
import { entryIcon } from "../../../../data/icons";
import { showMoreInfoDialog } from "../../../../dialogs/more-info/show-ha-more-info-dialog";
import type { HomeAssistant } from "../../../../types";
import {
  computeCards,
  computeSection,
} from "../../../lovelace/common/generate-lovelace-config";
import { addEntitiesToLovelaceView } from "../../../lovelace/editor/add-entities-to-view";
import type { EntityRegistryStateEntry } from "../ha-config-device-page";
import { entityRowElement } from "../../../lovelace/entity-rows/entity-row-element-directive";

@customElement("ha-device-entities-card")
export class HaDeviceEntitiesCard extends LitElement {
  @property() public header!: string;

  @property({ attribute: false }) public deviceName!: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public entities!: EntityRegistryStateEntry[];

  @property({ attribute: "show-hidden", type: Boolean })
  public showHidden = false;

  protected render(): TemplateResult {
    if (!this.entities.length) {
      return html`
        <ha-card outlined .header=${this.header}>
          <div class="empty card-content">
            ${this.hass.localize("ui.panel.config.devices.entities.none")}
          </div>
        </ha-card>
      `;
    }

    const enabledEntities: EntityRegistryEntry[] = [];
    const disabledEntities: EntityRegistryEntry[] = [];

    this.entities.forEach((entry) => {
      if (entry.disabled_by) {
        disabledEntities.push(entry);
      } else {
        enabledEntities.push(entry);
      }
    });

    return html`
      <ha-card outlined .header=${this.header}>
        ${enabledEntities.length
          ? html`
              <div id="entities" class="move-up">
                <ha-list>
                  ${repeat(
                    enabledEntities,
                    (entry) => entry.entity_id,
                    (entry) =>
                      this.hass.states[entry.entity_id]
                        ? this._renderEntity(entry)
                        : this._renderUnavailableEntity(entry)
                  )}
                </ha-list>
              </div>
            `
          : nothing}
        ${disabledEntities.length
          ? html`<div class=${classMap({ "move-up": !enabledEntities.length })}>
              ${!this.showHidden
                ? html`
                    <button class="show-more" @click=${this._toggleShowHidden}>
                      ${this.hass.localize(
                        "ui.panel.config.devices.entities.disabled_entities",
                        { count: disabledEntities.length }
                      )}
                    </button>
                  `
                : html`
                    <ha-list>
                      ${disabledEntities.map((entry) =>
                        this._renderUnavailableEntity(entry)
                      )}
                    </ha-list>
                    <button class="show-more" @click=${this._toggleShowHidden}>
                      ${this.hass.localize(
                        "ui.panel.config.devices.entities.show_less"
                      )}
                    </button>
                  `}
            </div>`
          : nothing}
        <div class="card-actions">
          <ha-button appearance="plain" @click=${this._addToLovelaceView}>
            ${this.hass.localize(
              "ui.panel.config.devices.entities.add_entities_lovelace"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _toggleShowHidden() {
    this.showHidden = !this.showHidden;
  }

  private _renderEntity(entry: EntityRegistryStateEntry): TemplateResult {
    let name = entry.stateName || this.deviceName;
    if (entry.hidden_by) {
      name += ` (${this.hass.localize(
        "ui.panel.config.devices.entities.hidden"
      )})`;
    }
    return html`<div>
      ${entityRowElement(entry.entity_id, name, this.hass)}
    </div>`;
  }

  private _renderUnavailableEntity(
    entry: EntityRegistryStateEntry
  ): TemplateResult {
    const name = entry.stateName || this.deviceName;

    const icon = until(entryIcon(this.hass, entry));

    return html`
      <ha-list-item
        graphic="icon"
        class="disabled-entry"
        .entry=${entry}
        @click=${this._openEditEntry}
      >
        <ha-icon slot="graphic" .icon=${icon}></ha-icon>
        <div class="name">${name}</div>
      </ha-list-item>
    `;
  }

  private _openEditEntry(ev: Event): void {
    const entry = (ev.currentTarget! as any).entry;
    showMoreInfoDialog(this, { entityId: entry.entity_id });
  }

  private _addToLovelaceView(): void {
    const entities = this.entities
      .filter((entity) => !entity.disabled_by)
      .map((entity) => entity.entity_id);

    addEntitiesToLovelaceView(
      this,
      this.hass,
      computeCards(this.hass, entities, {
        title: this.deviceName,
      }),
      computeSection(entities, {
        title: this.deviceName,
      }),
      entities
    );
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-icon {
      margin-left: -8px;
    }
    .entity-id {
      color: var(--secondary-text-color);
    }
    .buttons {
      text-align: right;
      margin: 0 0 0 8px;
    }
    .disabled-entry {
      color: var(--secondary-text-color);
    }
    .move-up {
      margin-top: -13px;
    }
    .move-up:has(> ha-list) {
      margin-top: -24px;
    }
    :not(.move-up) > ha-list {
      margin-top: -24px;
    }
    ha-list + button.show-more,
    .move-up + :not(:has(ha-list)) > button.show-more {
      margin-top: -12px;
    }
    #entities > ha-list {
      margin: 0 16px 0 8px;
    }
    #entities > ha-list > ha-list-item {
      padding: 0 16px 0 12px;
    }
    .name {
      font-size: var(--ha-font-size-m);
    }
    .name:dir(rtl) {
      margin-inline-start: 8px;
    }
    .empty {
      text-align: center;
    }
    button.show-more {
      color: var(--primary-color);
      text-align: left;
      cursor: pointer;
      background: none;
      border-width: initial;
      border-style: none;
      border-color: initial;
      border-image: initial;
      padding: 16px;
      font: inherit;
    }
    button.show-more:focus {
      outline: none;
      text-decoration: underline;
    }
    ha-list > * {
      margin: 8px 0px;
    }
    ha-list-item {
      height: 40px;
      --mdc-ripple-color: transparent;
    }
    .card-actions {
      padding: 4px 16px 4px 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-entities-card": HaDeviceEntitiesCard;
  }
}
