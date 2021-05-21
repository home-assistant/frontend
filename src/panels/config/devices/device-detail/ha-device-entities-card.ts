import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { domainIcon } from "../../../../common/entity/domain_icon";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import { HomeAssistant } from "../../../../types";
import { HuiErrorCard } from "../../../lovelace/cards/hui-error-card";
import { createRowElement } from "../../../lovelace/create-element/create-row-element";
import { addEntitiesToLovelaceView } from "../../../lovelace/editor/add-entities-to-view";
import { LovelaceRow } from "../../../lovelace/entity-rows/types";
import { showEntityEditorDialog } from "../../entities/show-dialog-entity-editor";
import { EntityRegistryStateEntry } from "../ha-config-device-page";

@customElement("ha-device-entities-card")
export class HaDeviceEntitiesCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entities!: EntityRegistryStateEntry[];

  @property() public showDisabled = false;

  private _entityRows: Array<LovelaceRow | HuiErrorCard> = [];

  protected shouldUpdate(changedProps: PropertyValues) {
    if (changedProps.has("hass") && changedProps.size === 1) {
      this._entityRows.forEach((element) => {
        element.hass = this.hass;
      });
      return false;
    }
    return true;
  }

  protected render(): TemplateResult {
    const disabledEntities: EntityRegistryStateEntry[] = [];
    this._entityRows = [];
    return html`
      <ha-card
        .header=${this.hass.localize(
          "ui.panel.config.devices.entities.entities"
        )}
      >
        ${this.entities.length
          ? html`
              <div id="entities" @hass-more-info=${this._overrideMoreInfo}>
                ${this.entities.map((entry: EntityRegistryStateEntry) => {
                  if (entry.disabled_by) {
                    disabledEntities.push(entry);
                    return "";
                  }
                  return this.hass.states[entry.entity_id]
                    ? this._renderEntity(entry)
                    : this._renderEntry(entry);
                })}
              </div>
              ${disabledEntities.length
                ? !this.showDisabled
                  ? html`
                      <button
                        class="show-more"
                        @click=${this._toggleShowDisabled}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.devices.entities.disabled_entities",
                          "count",
                          disabledEntities.length
                        )}
                      </button>
                    `
                  : html`
                      ${disabledEntities.map((entry) =>
                        this._renderEntry(entry)
                      )}
                      <button
                        class="show-more"
                        @click=${this._toggleShowDisabled}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.devices.entities.hide_disabled"
                        )}
                      </button>
                    `
                : ""}
              <div class="card-actions">
                <mwc-button @click=${this._addToLovelaceView}>
                  ${this.hass.localize(
                    "ui.panel.config.devices.entities.add_entities_lovelace"
                  )}
                </mwc-button>
              </div>
            `
          : html`
              <div class="config-entry-row">
                <paper-item-body two-line>
                  <div>
                    ${this.hass.localize(
                      "ui.panel.config.devices.entities.none"
                    )}
                  </div>
                </paper-item-body>
              </div>
            `}
      </ha-card>
    `;
  }

  private _toggleShowDisabled() {
    this.showDisabled = !this.showDisabled;
  }

  private _renderEntity(entry: EntityRegistryStateEntry): TemplateResult {
    const element = createRowElement({ entity: entry.entity_id });
    if (this.hass) {
      element.hass = this.hass;
    }
    // @ts-ignore
    element.entry = entry;
    this._entityRows.push(element);
    return html` <div>${element}</div> `;
  }

  private _renderEntry(entry: EntityRegistryStateEntry): TemplateResult {
    return html`
      <paper-icon-item .entry=${entry} @click=${this._openEditEntry}>
        <ha-icon
          slot="item-icon"
          .icon=${domainIcon(computeDomain(entry.entity_id))}
        ></ha-icon>
        <paper-item-body>
          <div class="name">${entry.stateName || entry.entity_id}</div>
        </paper-item-body>
      </paper-icon-item>
    `;
  }

  private _overrideMoreInfo(ev: Event): void {
    ev.stopPropagation();
    const entry = (ev.target! as any).entry;
    showEntityEditorDialog(this, {
      entry,
      entity_id: entry.entity_id,
    });
  }

  private _openEditEntry(ev: Event): void {
    const entry = (ev.currentTarget! as any).entry;
    showEntityEditorDialog(this, {
      entry,
      entity_id: entry.entity_id,
    });
  }

  private _addToLovelaceView(): void {
    addEntitiesToLovelaceView(
      this,
      this.hass,
      this.entities
        .filter((entity) => !entity.disabled_by)
        .map((entity) => entity.entity_id)
    );
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
      ha-icon {
        margin-left: 8px;
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
      #entities > * {
        margin: 8px 16px 8px 8px;
      }
      #entities > paper-icon-item {
        margin: 0;
      }
      paper-icon-item {
        min-height: 40px;
        padding: 0 8px;
        cursor: pointer;
      }
      .name {
        font-size: 14px;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-entities-card": HaDeviceEntitiesCard;
  }
}
