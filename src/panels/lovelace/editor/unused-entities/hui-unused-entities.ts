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

import "./hui-select-row";

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

  @property() private _unusedEntities: string[] = [];

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
        <div
          class="table-container"
          role="table"
          aria-label="Unused Entities"
          @entity-selection-changed=${this._handleSelectionChanged}
        >
          <div class="flex-row header" role="rowgroup">
            <div class="flex-cell" role="columnheader">Entity</div>
            <div class="flex-cell" role="columnheader">Entity id</div>
            <div class="flex-cell" role="columnheader">Domain</div>
            <div class="flex-cell" role="columnheader">Last Changed</div>
          </div>
          ${this._unusedEntities.map((entity) => {
            return html`
              <hui-select-row
                .selectable=${this.lovelace!.mode === "storage"}
                .hass=${this.hass}
                .entity=${entity}
              ></hui-select-row>
            `;
          })}
        </div>
      </ha-card>
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
  }

  private _handleSelectionChanged(ev: any): void {
    if (ev.detail.selected) {
      this._selectedEntities.push(ev.detail.entity);
    } else {
      const index = this._selectedEntities.indexOf(ev.detail.entity);
      if (index !== -1) {
        this._selectedEntities.splice(index, 1);
      }
    }
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

      div {
        box-sizing: border-box;
      }

      .table-container {
        display: block;
        margin: auto;
      }

      .flex-row {
        display: flex;
        flex-flow: row wrap;
      }
      .flex-row .flex-cell {
        font-weight: bold;
      }

      .flex-cell {
        width: calc(100% / 4);
        padding: 12px 24px;
        border-bottom: 1px solid #e0e0e0;
        vertical-align: middle;
      }

      @media all and (max-width: 767px) {
        .flex-cell {
          width: calc(100% / 3);
        }
        .flex-cell:first-child {
          width: 100%;
          border-bottom: 0;
        }
      }
      @media all and (max-width: 430px) {
        .flex-cell {
          border-bottom: 0;
        }

        .flex-cell:last-child {
          border-bottom: 1px solid #e0e0e0;
        }

        .flex-cell {
          width: 100%;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-unused-entities": HuiUnusedEntities;
  }
}
