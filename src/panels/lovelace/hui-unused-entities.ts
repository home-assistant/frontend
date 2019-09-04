import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  PropertyValues,
} from "lit-element";

import "./cards/hui-entities-card";

import "@polymer/paper-fab/paper-fab";

import { computeUnusedEntities } from "./common/compute-unused-entities";
import { createCardElement } from "./common/create-card-element";
import { HomeAssistant } from "../../types";
import { LovelaceCard, Lovelace } from "./types";
import { LovelaceConfig } from "../../data/lovelace";
import computeDomain from "../../common/entity/compute_domain";
import { showSelectViewDialog } from "./editor/card-editor/show-select-view-dialog";
import { showEditCardDialog } from "./editor/card-editor/show-edit-card-dialog";

export class HuiUnusedEntities extends LitElement {
  public lovelace?: Lovelace;

  private _hass?: HomeAssistant;

  private _config?: LovelaceConfig;

  private _elements?: LovelaceCard[];

  private _selectedEntities: string[] = [];

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
      this._createElements();
      return;
    }
    for (const element of this._elements) {
      element.hass = this._hass;
    }
  }

  public setConfig(config: LovelaceConfig): void {
    this._config = config;
    this._createElements();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const lovelace = this.lovelace!;

    let editModeChanged = false;

    if (changedProperties.has("lovelace")) {
      const oldLovelace = changedProperties.get("lovelace") as Lovelace;
      editModeChanged =
        !oldLovelace || lovelace.editMode !== oldLovelace.editMode;
    }

    if (editModeChanged) {
      this._createElements();
    }
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this._hass || !this.lovelace) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <div id="root">
        ${this.lovelace.editMode
          ? html`
              <ha-card header="Edit mode" style="width: 100%;">
                <div class="card-content">
                  Select the entities you want to add to a card and then click
                  the add card button.
                </div>
              </ha-card>
            `
          : ""}
        ${this._elements}
      </div>
      ${this.lovelace.editMode
        ? html`
            <paper-fab
              elevated="2"
              icon="hass:plus"
              title="${this._hass.localize(
                "ui.panel.lovelace.editor.edit_card.add"
              )}"
              @click="${this._selectView}"
            ></paper-fab>
          `
        : ""}
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
          background: var(--lovelace-background);
        }
        #root {
          padding: 4px;
          display: flex;
          flex-wrap: wrap;
        }
        hui-entities-card {
          max-width: 400px;
          padding: 4px;
          flex: 1 auto;
        }

        paper-fab {
          position: sticky;
          float: right;
          bottom: 16px;
          right: 16px;
          z-index: 1;
        }

        paper-fab.rtl {
          float: left;
          right: auto;
          left: 16px;
        }
      </style>
    `;
  }

  private _createElements(): void {
    if (!this._hass) {
      return;
    }
    this._selectedEntities = [];
    const domains: { [domain: string]: string[] } = {};
    computeUnusedEntities(this._hass, this._config!).forEach((entity) => {
      const domain = computeDomain(entity);

      if (!(domain in domains)) {
        domains[domain] = [];
      }
      domains[domain].push(entity);
    });
    this._elements = Object.keys(domains)
      .sort()
      .map((domain) => {
        const el = createCardElement({
          type: "entities",
          title: this._hass!.localize(`domain.${domain}`) || domain,
          entities: domains[domain].map((entity) => ({
            entity,
            secondary_info: "entity-id",
            type: this.lovelace!.editMode ? "select" : "default",
          })),
          show_header_toggle: false,
        });
        el.hass = this._hass;
        if (this.lovelace!.editMode) {
          el.addEventListener("entity-selection-changed", (ev: any) =>
            this._handleSelectionChanged(ev)
          );
        }
        return el;
      });
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
    showSelectViewDialog(this, { lovelace: this.lovelace! });
    window.addEventListener("view-selected", (e) => this._addCard(e));
  }

  private _addCard(ev: any): void {
    showEditCardDialog(this, {
      lovelace: this.lovelace!,
      path: [ev.detail.view],
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
