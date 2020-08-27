import "@material/mwc-fab";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { mdiPlus } from "@mdi/js";
import { classMap } from "lit-html/directives/class-map";

import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { computeRTL } from "../../../../common/util/compute_rtl";
import { computeUnusedEntities } from "../../common/compute-unused-entities";
import { showSuggestCardDialog } from "../card-editor/show-suggest-card-dialog";
import { showSelectViewDialog } from "../select-view/show-select-view-dialog";

import type { DataTableRowData } from "../../../../components/data-table/ha-data-table";
import type { LovelaceConfig } from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import type { Lovelace } from "../../types";

import "../card-editor/hui-entity-picker-table";
import "../../../../components/ha-svg-icon";

@customElement("hui-unused-entities")
export class HuiUnusedEntities extends LitElement {
  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow?: boolean;

  @internalProperty() private _unusedEntities: string[] = [];

  @internalProperty() private _selectedEntities: string[] = [];

  private get _config(): LovelaceConfig {
    return this.lovelace.config;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("lovelace")) {
      this._getUnusedEntities();
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.lovelace) {
      return html``;
    }

    if (this.lovelace.mode === "storage" && this.lovelace.editMode === false) {
      return html``;
    }

    return html`
      <div class="container">
        ${!this.narrow
          ? html`
              <ha-card
                header="${this.hass.localize(
                  "ui.panel.lovelace.unused_entities.title"
                )}"
              >
                <div class="card-content">
                  ${this.hass.localize(
                    "ui.panel.lovelace.unused_entities.available_entities"
                  )}
                  ${this.lovelace.mode === "storage"
                    ? html`
                        <br />${this.hass.localize(
                          "ui.panel.lovelace.unused_entities.select_to_add"
                        )}
                      `
                    : ""}
                </div>
              </ha-card>
            `
          : ""}
        <hui-entity-picker-table
          .hass=${this.hass}
          .narrow=${this.narrow}
          .entities=${this._unusedEntities.map((entity) => {
            const stateObj = this.hass!.states[entity];
            return {
              icon: "",
              entity_id: entity,
              stateObj,
              name: computeStateName(stateObj),
              domain: computeDomain(entity),
              last_changed: stateObj!.last_changed,
            };
          }) as DataTableRowData[]}
          @selected-changed=${this._handleSelectedChanged}
        ></hui-entity-picker-table>
      </div>
      <div
        class="fab ${classMap({
          rtl: computeRTL(this.hass),
          selected: this._selectedEntities.length,
        })}"
      >
        <mwc-fab
          .label=${this.hass.localize("ui.panel.lovelace.editor.edit_card.add")}
          @click=${this._addToLovelaceView}
        >
          <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
        </mwc-fab>
      </div>
    `;
  }

  private _getUnusedEntities(): void {
    if (!this.hass || !this.lovelace) {
      return;
    }
    this._selectedEntities = [];
    const unusedEntities = computeUnusedEntities(this.hass, this._config!);
    this._unusedEntities = [...unusedEntities].sort();
  }

  private _handleSelectedChanged(ev: CustomEvent): void {
    this._selectedEntities = ev.detail.selectedEntities;
  }

  private _addToLovelaceView(): void {
    if (this.lovelace.config.views.length === 1) {
      showSuggestCardDialog(this, {
        lovelaceConfig: this.lovelace.config!,
        saveConfig: this.lovelace.saveConfig,
        path: [0],
        entities: this._selectedEntities,
      });
      return;
    }
    showSelectViewDialog(this, {
      lovelaceConfig: this.lovelace.config,
      allowDashboardChange: false,
      viewSelectedCallback: (_urlPath, _selectedDashConfig, viewIndex) => {
        showSuggestCardDialog(this, {
          lovelaceConfig: this.lovelace.config!,
          saveConfig: this.lovelace.saveConfig,
          path: [viewIndex],
          entities: this._selectedEntities,
        });
      },
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        background: var(--lovelace-background);
      }
      .container {
        display: flex;
        flex-direction: column;
        /* min-height: calc(100vh - 112px); */
        height: 100%;
      }
      ha-card {
        --ha-card-box-shadow: none;
        --ha-card-border-radius: 0;
      }
      hui-entity-picker-table {
        flex-grow: 1;
        margin-top: -20px;
      }
      .fab {
        position: sticky;
        float: right;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 1;
      }
      .fab.rtl {
        right: initial;
        left: 0;
        bottom: 0;
        padding-right: 16px;
        padding-left: calc(16px + env(safe-area-inset-left));
      }
      mwc-fab {
        position: relative;
        bottom: calc(-80px - env(safe-area-inset-bottom));
        transition: bottom 0.3s;
      }
      .fab.selected mwc-fab {
        bottom: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-unused-entities": HuiUnusedEntities;
  }
}
