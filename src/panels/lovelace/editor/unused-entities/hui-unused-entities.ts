import {
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
  property,
  customElement,
  css,
  CSSResult,
} from "lit-element";

import { classMap } from "lit-html/directives/class-map";
import "../../../../components/ha-fab";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-relative-time";
import "../../../../components/ha-icon";
import "../../../../common/search/search-input";

import "../../../../components/ha-data-table";
// tslint:disable-next-line
import {
  SelectionChangedEvent,
  SortingChangedEvent,
} from "../../../../components/ha-data-table";

import computeStateName from "../../../../common/entity/compute_state_name";
import computeDomain from "../../../../common/entity/compute_domain";

import { computeRTL } from "../../../../common/util/compute_rtl";
import { computeUnusedEntities } from "../../common/compute-unused-entities";
import { showSelectViewDialog } from "../select-view/show-select-view-dialog";
import { showEditCardDialog } from "../card-editor/show-edit-card-dialog";

import { HomeAssistant } from "../../../../types";
import { Lovelace } from "../../types";
import { LovelaceConfig } from "../../../../data/lovelace";

@customElement("hui-unused-entities")
export class HuiUnusedEntities extends LitElement {
  @property() public lovelace?: Lovelace;

  @property() public hass?: HomeAssistant;

  private _unusedEntities: string[] = [];
  @property() private _filteredUnusedEntities: string[] = [];

  @property() private _filter = "";

  @property() private _sortColumn?: number;
  @property() private _sortDirection?: "asc" | "desc" | null;

  private _selectedEntities: string[] = [];

  private get _config(): LovelaceConfig {
    return this.lovelace!.config;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("lovelace")) {
      this._getUnusedEntities();
    }
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this.lovelace) {
      return html``;
    }

    if (this.lovelace.mode === "storage" && this.lovelace.editMode === false) {
      return html``;
    }

    return html`
      <ha-card header="Unused entities">
        <div class="card-content">
          These are the entities that you have available, but are not in your
          Lovelace UI yet.
          ${this.lovelace.mode === "storage"
            ? html`
                <br />Select the entities you want to add to a card and then
                click the add card button.
              `
            : ""}
        </div>
      </ha-card>
      <search-input @value-changed=${this._handleSearchChange}></search-input>
      <ha-data-table
        .headers=${[
          {
            name: "Entity",
            sortable: true,
            direction: this._sortColumn === 0 ? this._sortDirection : null,
          },
          {
            name: "Entity id",
            sortable: true,
            direction: this._sortColumn === 1 ? this._sortDirection : null,
          },
          {
            name: "Domain",
            sortable: true,
            direction: this._sortColumn === 2 ? this._sortDirection : null,
          },
          {
            name: "Last Changed",
            type: "numeric",
            sortable: true,
            direction: this._sortColumn === 3 ? this._sortDirection : null,
          },
        ]}
        .data=${this._filteredUnusedEntities.map((entity) => {
          const stateObj = entity ? this.hass!.states[entity] : undefined;
          return [
            html`
              <state-badge
                .hass=${this.hass!}
                .stateObj=${stateObj}
              ></state-badge>
              ${computeStateName(stateObj!)}
            `,
            entity,
            computeDomain(entity),
            html`
              <ha-relative-time
                .hass=${this.hass!}
                .datetime=${stateObj!.last_changed}
              ></ha-relative-time>
            `,
          ];
        })}
        .selectable=${this.lovelace!.mode === "storage"}
        @selection-changed=${this._handleSelectionChanged}
        @sorting-changed=${this._handleSortingChanged}
      ></ha-data-table>
      ${this.lovelace.mode === "storage"
        ? html`
            <ha-fab
              class="${classMap({
                rtl: computeRTL(this.hass),
              })}"
              icon="hass:plus"
              label="${this.hass.localize(
                "ui.panel.lovelace.editor.edit_card.add"
              )}"
              @click="${this._selectView}"
            ></ha-fab>
          `
        : ""}
    `;
  }

  private _getUnusedEntities(): void {
    if (!this.hass || !this.lovelace) {
      return;
    }
    this._selectedEntities = [];
    this._unusedEntities = computeUnusedEntities(this.hass, this._config!);
    this._filterUnusedEntities();
    this._sortUnusedEntities();
  }

  private _filterUnusedEntities(): void {
    this._filteredUnusedEntities = this._unusedEntities.filter((entity) => {
      const stateObj = entity ? this.hass!.states[entity] : undefined;
      return (
        entity.includes(this._filter) ||
        computeStateName(stateObj!).includes(this._filter)
      );
    });
  }

  private _sortUnusedEntities(): void {
    return;
  }

  private _handleSearchChange(ev: CustomEvent): void {
    this._filter = ev.detail.value;
    this._filterUnusedEntities();
  }

  private _handleSelectionChanged(ev: CustomEvent): void {
    const changedSelection = ev.detail as SelectionChangedEvent;
    const entity = this._filteredUnusedEntities[changedSelection.index];
    if (changedSelection.selected) {
      this._selectedEntities.push(entity);
    } else {
      const index = this._selectedEntities.indexOf(entity);
      if (index !== -1) {
        this._selectedEntities.splice(index, 1);
      }
    }
  }

  private _handleSortingChanged(ev: CustomEvent): void {
    const sort = ev.detail as SortingChangedEvent;
    this._sortColumn = sort.column;
    this._sortDirection = sort.direction;
    this._sortUnusedEntities();
  }

  private _selectView(): void {
    showSelectViewDialog(this, {
      lovelace: this.lovelace!,
      viewSelectedCallback: (view) => this._addCard(view),
    });
  }

  private _addCard(view: number): void {
    showEditCardDialog(this, {
      lovelace: this.lovelace!,
      path: [view],
      entities: this._selectedEntities,
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        background: var(--lovelace-background);
        padding: 16px;
      }
      ha-fab {
        position: sticky;
        float: right;
        bottom: 16px;
        z-index: 1;
      }
      ha-fab.rtl {
        float: left;
      }
      ha-card {
        margin-bottom: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-unused-entities": HuiUnusedEntities;
  }
}
