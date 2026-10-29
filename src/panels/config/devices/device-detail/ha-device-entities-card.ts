import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { until } from "lit/directives/until";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-list";
import "../../../../components/ha-list-item";
import { computeEntityEntryName } from "../../../../common/entity/compute_entity_name_display";
import type { EntityRegistryEntry } from "../../../../data/entity/entity_registry";
import { entryIcon } from "../../../../data/icons";
import { showMoreInfoDialog } from "../../../../dialogs/more-info/show-ha-more-info-dialog";
import type { HomeAssistant } from "../../../../types";
import type {
  ChildDeviceEntities,
  EntityRegistryStateEntry,
} from "../ha-config-device-page";
import { entityRowElement } from "../../../lovelace/entity-rows/entity-row-element-directive";

@customElement("ha-device-entities-card")
export class HaDeviceEntitiesCard extends LitElement {
  @property() public header!: string;

  @property({ attribute: false }) public deviceName!: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public entities!: EntityRegistryStateEntry[];

  @property({ attribute: false })
  public childDeviceEntities?: ChildDeviceEntities[];

  @property({ attribute: "show-hidden", type: Boolean })
  public showHidden = false;

  protected render(): TemplateResult {
    if (!this.entities.length && !this.childDeviceEntities?.length) {
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
        ${
          enabledEntities.length
            ? html`
                <div class="entities move-up">
                  ${this._renderEntityList(enabledEntities)}
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
                        <ha-list>
                          ${disabledEntities.map((entry) =>
                            this._renderUnavailableEntity(entry)
                          )}
                        </ha-list>
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
        ${this.childDeviceEntities?.map(
          (childDevice) => html`
            <div class="child-device">
              <h3 class="section-header">
                <a href="/config/devices/device/${childDevice.id}">
                  <span>${childDevice.name}</span>
                  <ha-icon-next></ha-icon-next>
                </a>
              </h3>
              <div class="entities">
                ${this._renderEntityList(childDevice.entities)}
              </div>
            </div>
          `
        )}
      </ha-card>
    `;
  }

  private _toggleShowHidden() {
    this.showHidden = !this.showHidden;
  }

  private _renderEntityList(entries: EntityRegistryStateEntry[]) {
    // Main entities (those without their own name, shown as the device name)
    // are listed first, separated from the additional entities by a divider.
    const mainEntities: EntityRegistryStateEntry[] = [];
    const additionalEntities: EntityRegistryStateEntry[] = [];
    entries.forEach((entry) => {
      if (computeEntityEntryName(entry)) {
        additionalEntities.push(entry);
      } else {
        mainEntities.push(entry);
      }
    });

    return html`
      <ha-list>
        ${this._renderEntities(mainEntities)}
        ${
          mainEntities.length && additionalEntities.length
            ? html`<div class="divider" role="separator"></div>`
            : nothing
        }
        ${this._renderEntities(additionalEntities)}
      </ha-list>
    `;
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
    .divider {
      height: 1px;
      background-color: var(--divider-color);
      margin: var(--ha-space-2) var(--ha-space-4);
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
    .entities > ha-list {
      margin: 0 16px 0 8px;
    }
    .entities > ha-list > ha-list-item {
      padding: 0 16px 0 12px;
    }
    .child-device > .entities > ha-list {
      margin-top: calc(-1 * var(--ha-space-2));
    }
    ha-card > .child-device:first-child {
      margin-top: calc(-1 * var(--ha-space-4));
    }
    .section-header {
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-normal);
      color: var(--secondary-text-color);
      margin: 0;
      padding: var(--ha-space-2) var(--ha-space-4) 0;
    }
    .section-header a {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-1);
      color: inherit;
      text-decoration: none;
      --mdc-icon-size: 20px;
    }
    .section-header a:hover,
    .section-header a:focus {
      text-decoration: underline;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-entities-card": HaDeviceEntitiesCard;
  }
}
