import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { HassEntity } from "home-assistant-js-websocket";
import { TemplateResult } from "lit-html";
import { fireEvent } from "../../../common/dom/fire_event";
import { fetchEntitiesForZhaNode } from "../../../data/zha";
import "../../../resources/ha-style";
import { HomeAssistant } from "../../../types";
import { ItemSelectedEvent } from "./types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "zha-entity-selected": {
      entity?: HassEntity;
    };
  }
}

export class ZHAEntities extends LitElement {
  public hass?: HomeAssistant;
  public showHelp?: boolean;
  public selectedNode?: HassEntity;
  private _selectedEntityIndex: number;
  private _entities: HassEntity[];
  private _haStyle?: DocumentFragment;
  private _ironFlex?: DocumentFragment;

  constructor() {
    super();
    this._entities = [];
    this._selectedEntityIndex = -1;
  }

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      showHelp: {},
      selectedNode: {},
      _selectedEntityIndex: {},
      _entities: {},
    };
  }

  protected update(changedProperties: PropertyValues): void {
    if (changedProperties.has("selectedNode")) {
      this._entities = [];
      this._selectedEntityIndex = -1;
      fireEvent(this, "zha-entity-selected", {
        entity: undefined,
      });
      this._fetchEntitiesForZhaNode();
    }
    super.update(changedProperties);
  }

  protected render(): TemplateResult {
    return html`
      ${this._renderStyle()}
      <div class="node-picker">
        <paper-dropdown-menu dynamic-align="" label="Entities" class="flex">
          <paper-listbox
            slot="dropdown-content"
            .selected="${this._selectedEntityIndex}"
            @iron-select="${this._selectedEntityChanged}"
          >
            ${
              this._entities.map(
                (entry) => html`
                  <paper-item>${entry.entity_id}</paper-item>
                `
              )
            }
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
      ${
        this.showHelp
          ? html`
              <div class="helpText">
                Select entity to view per-entity options
              </div>
            `
          : ""
      }
      ${
        this._selectedEntityIndex !== -1
          ? html`
              <div class="actions">
                <paper-button @click="${this._showEntityInformation}"
                  >Entity Information</paper-button
                >
              </div>
            `
          : ""
      }
    `;
  }

  private async _fetchEntitiesForZhaNode(): Promise<void> {
    if (this.hass) {
      const fetchedEntities = await fetchEntitiesForZhaNode(this.hass);
      this._entities = fetchedEntities[this.selectedNode!.attributes.ieee];
    }
  }

  private _selectedEntityChanged(event: ItemSelectedEvent): void {
    this._selectedEntityIndex = event.target!.selected;
    fireEvent(this, "zha-entity-selected", {
      entity: this._entities[this._selectedEntityIndex],
    });
  }

  private _showEntityInformation(): void {
    fireEvent(this, "hass-more-info", {
      entityId: this._entities[this._selectedEntityIndex].entity_id,
    });
  }

  private _renderStyle(): TemplateResult {
    if (!this._haStyle) {
      this._haStyle = document.importNode(
        (document.getElementById("ha-style")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }
    if (!this._ironFlex) {
      this._ironFlex = document.importNode(
        (document.getElementById("iron-flex")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }
    return html`
      ${this._ironFlex} ${this._haStyle}
      <style>
        .node-picker {
          @apply --layout-horizontal;
          @apply --layout-center-center;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 10px;
        }
        .actions {
          border-top: 1px solid #e8e8e8;
          padding: 5px 16px;
          position: relative;
        }
        .actions paper-button:not([disabled]) {
          color: var(--primary-color);
          font-weight: 500;
        }
        .helpText {
          color: grey;
          padding: 16px;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-entities": ZHAEntities;
  }
}

customElements.define("zha-entities", ZHAEntities);
