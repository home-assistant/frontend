import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { HassEntity } from "home-assistant-js-websocket";
import { fireEvent } from "../../../common/dom/fire_event";
import { fetchEntitiesForZhaNode } from "../../../data/zha";
import { haStyle } from "../../../resources/ha-style";
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

  protected updated(changedProperties: PropertyValues): void {
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

  protected render(): TemplateResult | void {
    return html`
      <div class="node-picker">
        <paper-dropdown-menu label="Entities" class="flex">
          <paper-listbox
            slot="dropdown-content"
            .selected="${this._selectedEntityIndex}"
            @iron-select="${this._selectedEntityChanged}"
          >
            ${this._entities.map(
              (entry) => html`
                <paper-item>${entry.entity_id}</paper-item>
              `
            )}
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
      ${this.showHelp
        ? html`
            <div class="helpText">
              Select entity to view per-entity options
            </div>
          `
        : ""}
      ${this._selectedEntityIndex !== -1
        ? html`
            <div class="actions">
              <paper-button @click="${this._showEntityInformation}"
                >Entity Information</paper-button
              >
            </div>
          `
        : ""}
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

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .flex {
          -ms-flex: 1 1 0.000000001px;
          -webkit-flex: 1;
          flex: 1;
          -webkit-flex-basis: 0.000000001px;
          flex-basis: 0.000000001px;
        }

        .node-picker {
          display: -ms-flexbox;
          display: -webkit-flex;
          display: flex;
          -ms-flex-direction: row;
          -webkit-flex-direction: row;
          flex-direction: row;
          -ms-flex-align: center;
          -webkit-align-items: center;
          align-items: center;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-entities": ZHAEntities;
  }
}

customElements.define("zha-entities", ZHAEntities);
