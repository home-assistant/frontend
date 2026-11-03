import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { until } from "lit/directives/until";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/item/ha-list-item-button";
import "../../../../components/list/ha-list-base";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { computeEntityEntryName } from "../../../../common/entity/compute_entity_name_display";
import type { EntityRegistryEntry } from "../../../../data/entity/entity_registry";
import { entryIcon } from "../../../../data/icons";
import { showMoreInfoDialog } from "../../../../dialogs/more-info/show-ha-more-info-dialog";
import type { HomeAssistant } from "../../../../types";
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

    // Main entities (those without their own name, shown as the device name)
    // are listed first, separated from the additional entities by a divider.
    const mainEntities: EntityRegistryStateEntry[] = [];
    const additionalEntities: EntityRegistryStateEntry[] = [];
    enabledEntities.forEach((entry) => {
      if (computeEntityEntryName(entry)) {
        additionalEntities.push(entry);
      } else {
        mainEntities.push(entry);
      }
    });

    return html`
      <ha-card outlined .header=${this.header}>
        ${
          enabledEntities.length
            ? html`
                <div id="entities" class="move-up">
                  <ha-list-base .ariaLabel=${this.header}>
                    ${this._renderEntities(mainEntities)}
                    ${
                      mainEntities.length && additionalEntities.length
                        ? html`<div class="divider" aria-hidden="true"></div>`
                        : nothing
                    }
                    ${this._renderEntities(additionalEntities)}
                  </ha-list-base>
                </div>
              `
            : nothing
        }
        ${
          disabledEntities.length
            ? html`<div
                class=${classMap({ "move-up": !enabledEntities.length })}
              >
                ${
                  !this.showHidden
                    ? html`
                        <button
                          class="show-more"
                          @click=${this._toggleShowHidden}
                        >
                          ${this.hass.localize(
                            "ui.panel.config.devices.entities.disabled_entities",
                            { count: disabledEntities.length }
                          )}
                        </button>
                      `
                    : html`
                        <ha-list-base
                          .ariaLabel=${this.hass.localize(
                            "ui.panel.config.devices.entities.disabled_entities_list"
                          )}
                        >
                          ${disabledEntities.map((entry) =>
                            this._renderUnavailableEntity(entry)
                          )}
                        </ha-list-base>
                        <button
                          class="show-more"
                          @click=${this._toggleShowHidden}
                        >
                          ${this.hass.localize(
                            "ui.panel.config.devices.entities.show_less"
                          )}
                        </button>
                      `
                }
              </div>`
            : nothing
        }
      </ha-card>
    `;
  }

  private _toggleShowHidden() {
    this.showHidden = !this.showHidden;
  }

  private _renderEntities(entries: EntityRegistryStateEntry[]) {
    return repeat(
      entries,
      (entry) => entry.entity_id,
      (entry) =>
        this.hass.states[entry.entity_id]
          ? this._renderEntity(entry)
          : this._renderUnavailableEntity(entry)
    );
  }

  private _renderEntity(entry: EntityRegistryStateEntry): TemplateResult {
    let name = entry.stateName || this.deviceName;
    if (entry.hidden_by) {
      name += ` (${this.hass.localize(
        "ui.panel.config.devices.entities.hidden"
      )})`;
    }
    return html`<div role="listitem" @keydown=${stopPropagation}>
      ${entityRowElement(entry.entity_id, name, this.hass)}
    </div>`;
  }

  private _renderUnavailableEntity(
    entry: EntityRegistryStateEntry
  ): TemplateResult {
    const name = entry.stateName || this.deviceName;

    const icon = until(entryIcon(this.hass, entry));

    return html`
      <ha-list-item-button
        class="disabled-entry"
        .entry=${entry}
        @click=${this._openEditEntry}
      >
        <ha-icon slot="start" .icon=${icon}></ha-icon>
        <span slot="headline" class="name">${name}</span>
      </ha-list-item-button>
    `;
  }

  private _openEditEntry(ev: Event): void {
    const entry = (ev.currentTarget! as any).entry;
    showMoreInfoDialog(this, { entityId: entry.entity_id });
  }

  static styles = css`
    :host {
      display: block;
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
    .divider {
      height: 1px;
      background-color: var(--divider-color);
      margin: var(--ha-space-2) var(--ha-space-4);
    }
    .move-up {
      margin-top: -13px;
    }
    .move-up:has(> ha-list-base) {
      margin-top: -24px;
    }
    :not(.move-up) > ha-list-base {
      margin-top: -24px;
    }
    ha-list-base + button.show-more,
    .move-up + :not(:has(ha-list-base)) > button.show-more {
      margin-top: -12px;
    }
    ha-list-base {
      --ha-list-padding: var(--ha-space-4) 0;
      --ha-list-gap: var(--ha-space-2);
    }
    #entities > ha-list-base {
      margin: 0 16px 0 8px;
    }
    #entities ha-list-item-button {
      --ha-row-item-padding-inline: var(--ha-space-2) var(--ha-space-4);
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
    ha-list-item-button {
      --ha-row-item-min-height: 40px;
      --ha-row-item-padding-block: 0;
      --ha-row-item-gap: var(--ha-space-6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-entities-card": HaDeviceEntitiesCard;
  }
}
