import { mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../../components/ha-fab";
import "../../../../components/ha-svg-icon";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { HomeAssistant } from "../../../../types";
import { computeUnusedEntities } from "../../common/compute-unused-entities";
import {
  computeCards,
  computeSection,
} from "../../common/generate-lovelace-config";
import type { Lovelace } from "../../types";
import "../card-editor/hui-entity-picker-table";
import { showSuggestCardDialog } from "../card-editor/show-suggest-card-dialog";
import { showSelectViewDialog } from "../select-view/show-select-view-dialog";

@customElement("hui-unused-entities")
export class HuiUnusedEntities extends LitElement {
  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

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
          .entities=${this._unusedEntities}
          @selected-changed=${this._handleSelectedChanged}
        ></hui-entity-picker-table>
      </div>
      <div
        class="fab ${classMap({
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
    const cardConfig = computeCards(
      this.hass.states,
      this._selectedEntities,
      {}
    );
    const sectionConfig = computeSection(this._selectedEntities, {});

    if (this.lovelace.config.views.length === 1) {
      showSuggestCardDialog(this, {
        lovelaceConfig: this.lovelace.config!,
        saveConfig: this.lovelace.saveConfig,
        path: [0],
        entities: this._selectedEntities,
        cardConfig,
        sectionConfig,
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
          cardConfig,
          sectionConfig,
        });
      },
    });
  }

  static styles = css`
    :host {
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
      float: var(--float-end);
      right: calc(16px + var(--safe-area-inset-right));
      bottom: calc(16px + var(--safe-area-inset-bottom));
      inset-inline-end: calc(16px + var(--safe-area-inset-right));
      inset-inline-start: initial;
      z-index: 1;
    }
    ha-fab {
      position: relative;
      bottom: calc(-80px - var(--safe-area-inset-bottom));
      transition: bottom 0.3s;
    }
    .fab.selected ha-fab {
      bottom: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-unused-entities": HuiUnusedEntities;
  }
}
