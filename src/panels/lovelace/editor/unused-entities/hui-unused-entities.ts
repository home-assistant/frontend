import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  PropertyValues,
} from "lit-element";

import { classMap } from "lit-html/directives/class-map";
import "@polymer/paper-fab/paper-fab";

import "./hui-select-row";

import { computeRTL } from "../../../../common/util/compute_rtl";
import { computeUnusedEntities } from "../../common/compute-unused-entities";
import { navigate } from "../../../../common/navigate";

import { showSelectViewDialog } from "../select-view/show-select-view-dialog";
import { showEditCardDialog } from "../card-editor/show-edit-card-dialog";

import { HomeAssistant } from "../../../../types";
import { LovelaceCard, Lovelace } from "../../types";
import { LovelaceConfig } from "../../../../data/lovelace";

export class HuiUnusedEntities extends LitElement {
  public lovelace?: Lovelace;

  private _hass?: HomeAssistant;

  private _config?: LovelaceConfig;

  private _elements?: LovelaceCard[];

  private _selectedEntities: string[] = [];
  private _unusedEntities: string[] = [];

  static get properties(): PropertyDeclarations {
    return {
      _hass: {},
      _config: {},
      lovelace: {},
      _elements: {},
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (!this._elements) {
      this._getUnusedEntities();
      return;
    }
    for (const element of this._elements) {
      element.hass = this._hass;
    }
  }

  public setConfig(config: LovelaceConfig): void {
    this._config = config;
    this._getUnusedEntities();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const lovelace = this.lovelace!;

    if (changedProperties.has("lovelace")) {
      if (lovelace.editMode === false) {
        navigate(this, "/lovelace");
      }
    }
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this._hass || !this.lovelace) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-card header="Unused entities">
        <div class="card-content">
          These are the entities that you have available, but are not in your
          Lovelace UI yet.
          <br />Select the entities you want to add to a card and then click the
          add card button.
        </div>
        <table
          class="entities"
          @entity-selection-changed=${this._handleSelectionChanged}
        >
          <thead>
            <tr>
              <th>Entity</th>
              <th>Entity id</th>
              <th>Domain</th>
              <th>Last changed</th>
            </tr>
          </thead>
          <tbody>
            ${this._unusedEntities.map((entity) => {
              return html`
                <hui-select-row
                  .hass=${this._hass}
                  .entity=${entity}
                ></hui-select-row>
              `;
            })}
          </tbody>
        </table>
      </ha-card>
      <paper-fab
        elevated="2"
        class="${classMap({
          rtl: computeRTL(this._hass),
        })}"
        icon="hass:plus"
        title="${this._hass.localize("ui.panel.lovelace.editor.edit_card.add")}"
        @click="${this._selectView}"
      ></paper-fab>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
          background: var(--lovelace-background);
          padding: 16px;
        }
        paper-fab {
          position: sticky;
          float: right;
          bottom: 16px;
          z-index: 1;
        }
        paper-fab.rtl {
          float: left;
        }

        .entities {
          border-collapse: collapse;
          width: 100%;
          margin: auto;
          table-layout: fixed;
        }

        .entities th {
          text-align: left;
          padding: 12px 24px;
          vertical-align: middle;
          font-size: 13px;
          line-height: 17px;
        }

        .entities hui-select-row {
          border-bottom: 1px solid #e0e0e0;
        }

        .entities tbody hui-select-row:hover {
          background-color: #eee;
        }

        .entities td {
          padding: 4px;
        }

        .entities td:nth-child(3) {
          white-space: pre-wrap;
          word-break: break-word;
        }
      </style>
    `;
  }

  private _getUnusedEntities(): void {
    if (!this._hass) {
      return;
    }
    this._selectedEntities = [];
    this._unusedEntities = computeUnusedEntities(this._hass, this._config!);
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-unused-entities": HuiUnusedEntities;
  }
}
customElements.define("hui-unused-entities", HuiUnusedEntities);
