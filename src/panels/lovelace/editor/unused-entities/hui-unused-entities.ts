import { mdiPlus } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { computeRTL } from "../../../../common/util/compute_rtl";
import type { DataTableRowData } from "../../../../components/data-table/ha-data-table";
import "../../../../components/ha-fab";
import "../../../../components/ha-svg-icon";
import type { LovelaceConfig } from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import { computeUnusedEntities } from "../../common/compute-unused-entities";
import type { Lovelace } from "../../types";
import "../card-editor/hui-entity-picker-table";
import { showSuggestCardDialog } from "../card-editor/show-suggest-card-dialog";
import { showSelectViewDialog } from "../select-view/show-select-view-dialog";

@customElement("hui-unused-entities")
export class HuiUnusedEntities extends LitElement {
  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow?: boolean;

  @state() private _unusedEntities: string[] = [];

  @state() private _selectedEntities: string[] = [];

  private get _config(): LovelaceConfig {
    return this.lovelace.config;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("lovelace")) {
      this._getUnusedEntities();
    }
  }

  protected render() {
    if (!this.hass || !this.lovelace) {
      return nothing;
    }

    if (this.lovelace.mode === "storage" && this.lovelace.editMode === false) {
      return nothing;
    }

    return html`
      <div class="container">
        ${!this.narrow
          ? html`
              <ha-card
                header=${this.hass.localize(
                  "ui.panel.lovelace.unused_entities.title"
                )}
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
              name: stateObj ? computeStateName(stateObj) : "Unavailable",
              domain: computeDomain(entity),
              last_changed: stateObj?.last_changed,
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
        <ha-fab
          .label=${this.hass.localize("ui.panel.lovelace.editor.edit_card.add")}
          extended
          @click=${this._addToLovelaceView}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        background: var(--lovelace-background);
        overflow: hidden;
      }
      .container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      ha-card {
        --ha-card-box-shadow: none;
        --ha-card-border-radius: 0;
      }
      hui-entity-picker-table {
        flex-grow: 1;
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
      ha-fab {
        position: relative;
        bottom: calc(-80px - env(safe-area-inset-bottom));
        transition: bottom 0.3s;
      }
      .fab.selected ha-fab {
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
