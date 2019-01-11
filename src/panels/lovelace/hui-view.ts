import {
  html,
  LitElement,
  PropertyValues,
  PropertyDeclarations,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../../components/entity/ha-state-label-badge";
// This one is for types
// tslint:disable-next-line
import { HaStateLabelBadge } from "../../components/entity/ha-state-label-badge";

import applyThemesOnElement from "../../common/dom/apply_themes_on_element";

import { hassLocalizeLitMixin } from "../../mixins/lit-localize-mixin";
import { LovelaceViewConfig } from "../../data/lovelace";
import { HomeAssistant } from "../../types";

import { Lovelace, LovelaceCard } from "./types";
import { createCardElement } from "./common/create-card-element";
import { computeCardSize } from "./common/compute-card-size";
import { showEditCardDialog } from "./editor/card-editor/show-edit-card-dialog";

declare global {
  // tslint:disable-next-line
  interface HASSDomEvents {
    "rebuild-card": {};
  }
}

let editCodeLoaded = false;

// Find column with < 5 entities, else column with lowest count
const getColumnIndex = (columnEntityCount: number[], size: number) => {
  let minIndex = 0;
  for (let i = 0; i < columnEntityCount.length; i++) {
    if (columnEntityCount[i] < 5) {
      minIndex = i;
      break;
    }
    if (columnEntityCount[i] < columnEntityCount[minIndex]) {
      minIndex = i;
    }
  }

  columnEntityCount[minIndex] += size;

  return minIndex;
};

export class HUIView extends hassLocalizeLitMixin(LitElement) {
  public hass?: HomeAssistant;
  public lovelace?: Lovelace;
  public columns?: number;
  public index?: number;
  private _cards: LovelaceCard[];
  private _badges: Array<{ element: HaStateLabelBadge; entityId: string }>;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      lovelace: {},
      columns: {},
      index: {},
      _cards: {},
      _badges: {},
    };
  }

  constructor() {
    super();
    this._cards = [];
    this._badges = [];
  }

  protected render(): TemplateResult {
    return html`
      ${this.renderStyles()}
      <div id="badges"></div>
      <div id="columns" @rebuild-card="${this._rebuildCard}"></div>
      ${
        this.lovelace!.editMode
          ? html`
              <paper-fab
                elevated="2"
                icon="hass:plus"
                title="${
                  this.localize("ui.panel.lovelace.editor.edit_card.add")
                }"
                @click="${this._addCard}"
              ></paper-fab>
            `
          : ""
      }
    `;
  }

  protected renderStyles(): TemplateResult {
    return html`
      <style>
        :host {
          display: block;
          padding: 4px 4px 0;
          transform: translateZ(0);
          position: relative;
          min-height: calc(100vh - 155px);
        }

        #badges {
          margin: 8px 16px;
          font-size: 85%;
          text-align: center;
        }

        #columns {
          display: flex;
          flex-direction: row;
          justify-content: center;
        }

        .column {
          flex-basis: 0;
          flex-grow: 1;
          max-width: 500px;
          overflow-x: hidden;
        }

        .column > * {
          display: block;
          margin: 4px 4px 8px;
        }

        paper-fab {
          position: sticky;
          float: right;
          bottom: 16px;
          right: 16px;
          z-index: 1;
        }

        @media (max-width: 500px) {
          :host {
            padding-left: 0;
            padding-right: 0;
          }

          .column > * {
            margin-left: 0;
            margin-right: 0;
          }
        }

        @media (max-width: 599px) {
          .column {
            max-width: 600px;
          }
        }
      </style>
    `;
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const lovelace = this.lovelace!;

    if (lovelace.editMode && !editCodeLoaded) {
      editCodeLoaded = true;
      import(/* webpackChunkName: "hui-view-editable" */ "./hui-view-editable");
    }

    let editModeChanged = false;
    let configChanged = false;

    if (changedProperties.has("lovelace")) {
      const oldLovelace = changedProperties.get("lovelace") as Lovelace;
      editModeChanged =
        !oldLovelace || lovelace.editMode !== oldLovelace.editMode;
      configChanged = !oldLovelace || lovelace.config !== oldLovelace.config;
    }

    if (configChanged) {
      this._createBadges(lovelace.config.views[this.index!]);
    } else if (changedProperties.has("hass")) {
      this._badges.forEach((badge) => {
        const { element, entityId } = badge;
        element.hass = this.hass!;
        element.state = this.hass!.states[entityId];
      });
    }

    if (configChanged || editModeChanged || changedProperties.has("columns")) {
      this._createCards(lovelace.config.views[this.index!]);
    } else if (changedProperties.has("hass")) {
      this._cards.forEach((element) => {
        element.hass = this.hass;
      });
    }
  }

  private _addCard(): void {
    showEditCardDialog(this, {
      lovelace: this.lovelace!,
      path: [this.index!],
    });
  }

  private _createBadges(config: LovelaceViewConfig): void {
    const root = this.shadowRoot!.getElementById("badges")!;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (!config || !config.badges || !Array.isArray(config.badges)) {
      root.style.display = "none";
      this._badges = [];
      return;
    }

    const elements: HUIView["_badges"] = [];
    for (const entityId of config.badges) {
      const element = document.createElement("ha-state-label-badge");
      element.hass = this.hass;
      element.state = this.hass!.states[entityId];
      elements.push({ element, entityId });
      root.appendChild(element);
    }
    this._badges = elements;
    root.style.display = elements.length > 0 ? "block" : "none";
  }

  private _rebuildCard(event: CustomEvent): void {
    const element = createCardElement(event.detail) as LovelaceCard;
    element.hass = this.hass;
    this._cards.push(element);
    (event.composedPath()[0] as HTMLElement).replaceWith(element);
  }

  private _createCards(config: LovelaceViewConfig): void {
    const root = this.shadowRoot!.getElementById("columns")!;

    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }

    if (!config || !config.cards || !Array.isArray(config.cards)) {
      this._cards = [];
      return;
    }

    const elements: LovelaceCard[] = [];
    const elementsToAppend: HTMLElement[] = [];
    config.cards.forEach((cardConfig, cardIndex) => {
      const element = createCardElement(cardConfig) as LovelaceCard;
      element.hass = this.hass;
      elements.push(element);

      if (!this.lovelace!.editMode) {
        elementsToAppend.push(element);
        return;
      }

      const wrapper = document.createElement("hui-card-options");
      wrapper.hass = this.hass;
      wrapper.lovelace = this.lovelace;
      wrapper.path = [this.index!, cardIndex];
      wrapper.appendChild(element);
      elementsToAppend.push(wrapper);
    });

    let columns: HTMLElement[][] = [];
    const columnEntityCount: number[] = [];
    for (let i = 0; i < this.columns!; i++) {
      columns.push([]);
      columnEntityCount.push(0);
    }

    elements.forEach((el, index) => {
      const cardSize = computeCardSize(el);
      // Element to append might be the wrapped card when we're editing.
      columns[getColumnIndex(columnEntityCount, cardSize)].push(
        elementsToAppend[index]
      );
    });

    // Remove empty columns
    columns = columns.filter((val) => val.length > 0);

    columns.forEach((column) => {
      const columnEl = document.createElement("div");
      columnEl.classList.add("column");
      column.forEach((el) => columnEl.appendChild(el));
      root.appendChild(columnEl);
    });

    this._cards = elements;

    if ("theme" in config) {
      applyThemesOnElement(root, this.hass!.themes, config.theme);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view": HUIView;
  }
}

customElements.define("hui-view", HUIView);
