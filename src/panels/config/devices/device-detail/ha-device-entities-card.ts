import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { until } from "lit/directives/until";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { stripPrefixFromEntityName } from "../../../../common/entity/strip_prefix_from_entity_name";
import "../../../../components/ha-button";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-list";
import "../../../../components/ha-list-item";
import type { ExtEntityRegistryEntry } from "../../../../data/entity_registry";
import { getExtendedEntityRegistryEntry } from "../../../../data/entity_registry";
import { entryIcon } from "../../../../data/icons";
import { showMoreInfoDialog } from "../../../../dialogs/more-info/show-ha-more-info-dialog";
import type { HomeAssistant } from "../../../../types";
import type { HuiErrorCard } from "../../../lovelace/cards/hui-error-card";
import {
  computeCards,
  computeSection,
} from "../../../lovelace/common/generate-lovelace-config";
import { createRowElement } from "../../../lovelace/create-element/create-row-element";
import { addEntitiesToLovelaceView } from "../../../lovelace/editor/add-entities-to-view";
import type {
  LovelaceRow,
  LovelaceRowConfig,
} from "../../../lovelace/entity-rows/types";
import type { EntityRegistryStateEntry } from "../ha-config-device-page";

@customElement("ha-device-entities-card")
export class HaDeviceEntitiesCard extends LitElement {
  @property() public header!: string;

  @property({ attribute: false }) public deviceName!: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entities!: EntityRegistryStateEntry[];

  @property({ attribute: "show-hidden", type: Boolean })
  public showHidden = false;

  @state() private _extDisabledEntityEntries?: Record<
    string,
    ExtEntityRegistryEntry
  >;

  private _entityRows: (LovelaceRow | HuiErrorCard)[] = [];

  protected shouldUpdate(changedProps: PropertyValues) {
    if (changedProps.has("hass") && changedProps.size === 1) {
      this._entityRows.forEach((element) => {
        element.hass = this.hass;
      });
      return false;
    }
    this._entityRows = [];
    return true;
  }

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

    const shownEntities: EntityRegistryStateEntry[] = [];
    const hiddenEntities: EntityRegistryStateEntry[] = [];

    this.entities.forEach((entry) => {
      if (entry.disabled_by) {
        if (this._extDisabledEntityEntries) {
          hiddenEntities.push(
            this._extDisabledEntityEntries[entry.entity_id] || entry
          );
        } else {
          hiddenEntities.push(entry);
        }
      } else {
        shownEntities.push(entry);
      }
    });

    return html`
      <ha-card outlined .header=${this.header}>
        ${shownEntities.length
          ? html`
              <div id="entities" class="move-up">
                <ha-list>
                  ${shownEntities.map((entry) =>
                    this.hass.states[entry.entity_id]
                      ? this._renderEntity(entry)
                      : this._renderEntry(entry)
                  )}
                </ha-list>
              </div>
            `
          : nothing}
        ${hiddenEntities.length
          ? html`<div class=${classMap({ "move-up": !shownEntities.length })}>
              ${!this.showHidden
                ? html`
                    <button class="show-more" @click=${this._toggleShowHidden}>
                      ${this.hass.localize(
                        "ui.panel.config.devices.entities.disabled_entities",
                        { count: hiddenEntities.length }
                      )}
                    </button>
                  `
                : html`
                    <ha-list>
                      ${hiddenEntities.map((entry) => this._renderEntry(entry))}
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
    if (!this.showHidden || this._extDisabledEntityEntries !== undefined) {
      return;
    }
    this._extDisabledEntityEntries = {};
    const toFetch = this.entities.filter((entry) => entry.disabled_by);

    const worker = async () => {
      if (toFetch.length === 0) {
        return;
      }

      const entityId = toFetch.pop()!.entity_id;
      const entry = await getExtendedEntityRegistryEntry(this.hass, entityId);
      this._extDisabledEntityEntries![entityId] = entry;
      this.requestUpdate("_extDisabledEntityEntries");
      worker();
    };

    // Fetch 3 in parallel
    worker();
    worker();
    worker();
  }

  private _renderEntity(entry: EntityRegistryStateEntry): TemplateResult {
    const config: LovelaceRowConfig = {
      entity: entry.entity_id,
    };

    const element = createRowElement(config);
    if (this.hass) {
      element.hass = this.hass;
      const stateObj = this.hass.states[entry.entity_id];

      let name = computeEntityName(stateObj, this.hass) || this.deviceName;

      if (entry.hidden_by) {
        name += ` (${this.hass.localize(
          "ui.panel.config.devices.entities.hidden"
        )})`;
      }

      config.name = name;
    }
    // @ts-ignore
    element.entry = entry;
    this._entityRows.push(element);
    return html` <div>${element}</div> `;
  }

  private _renderEntry(entry: EntityRegistryStateEntry): TemplateResult {
    const name =
      entry.stateName ||
      entry.name ||
      (entry as ExtEntityRegistryEntry).original_name;

    const icon = until(entryIcon(this.hass, entry));

    return html`
      <ha-list-item
        graphic="icon"
        class="disabled-entry"
        .entry=${entry}
        @click=${this._openEditEntry}
      >
        <ha-icon slot="graphic" .icon=${icon}></ha-icon>
        <div class="name">
          ${name
            ? stripPrefixFromEntityName(name, this.deviceName) || name
            : entry.entity_id}
        </div>
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
      computeCards(this.hass.states, entities, {
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
