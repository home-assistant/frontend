import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import "@polymer/paper-button/paper-button";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { EntityConfig } from "../entity-rows/types";

import "../../../components/entity/ha-entity-picker";
import { EditorTarget } from "../editor/types";

export class HuiEntityEditor extends LitElement {
  protected hass?: HomeAssistant;
  protected entities?: EntityConfig[];

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      entities: {},
    };
  }

  protected render(): TemplateResult {
    if (!this.entities) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <h3>Entities</h3>
      <div class="entities">
        ${
          this.entities.map((entityConf, index) => {
            return html`
              <div class="entity">
                <ha-entity-picker
                  .hass="${this.hass}"
                  .value="${entityConf.entity}"
                  .index="${index}"
                  @change="${this._valueChanged}"
                  allow-custom-entity
                ></ha-entity-picker>
                <paper-checkbox>Options</paper-checkbox>
                <div class="options">
                  <paper-input
                    label="Name"
                    .value="${entityConf.name || ""}"
                    .configValue="${"name"}"
                    .index="${index}"
                    @value-changed="${this._optionChanged}"
                  ></paper-input>
                  <paper-input
                    label="icon"
                    .value="${entityConf.icon || ""}"
                    .configValue="${"icon"}"
                    .index="${index}"
                    @value-changed="${this._optionChanged}"
                  ></paper-input>
                </div>
              </div>
            `;
          })
        }
      </div>
      <paper-button noink raised @click="${this._addEntity}"
        >Add Entity</paper-button
      >
    `;
  }

  private _addEntity() {
    const newConfigEntities = this.entities!.concat({ entity: "" });

    fireEvent(this, "change", { entities: newConfigEntities });
  }

  private _valueChanged(ev: Event): void {
    const target = ev.target! as EditorTarget;
    const newConfigEntities = this.entities!.concat();

    if (target.value === "") {
      newConfigEntities.splice(target.index!, 1);
    } else {
      newConfigEntities[target.index!] = {
        ...newConfigEntities[target.index!],
        entity: target.value!,
      };
    }

    fireEvent(this, "change", { entities: newConfigEntities });
  }

  private _optionChanged(ev: Event): void {
    const target = ev.target! as any;
    const newConfigEntities = this.entities!.concat();
    newConfigEntities[target.index] = {
      ...newConfigEntities[target.index!],
      [target.configValue]: target.value,
    };

    fireEvent(this, "change", { entities: newConfigEntities });
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .entities {
          padding-left: 20px;
        }
        .entity {
          display: flex;
          align-items: flex-end;
          flex-direction: row;
          flex-wrap: wrap;
        }
        paper-button {
          margin: 8px 0;
        }
        ha-entity-picker {
          flex: 3;
        }
        .entity paper-checkbox {
          flex: 1;
          padding: 0 0 8px 16px;
        }
        .options {
          display: none;
          width: 100%;
        }
        .options > * {
          flex: 1;
          padding-right: 4px;
        }
        .entity paper-checkbox[checked] ~ .options {
          display: flex;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-editor": HuiEntityEditor;
  }
}

customElements.define("hui-entity-editor", HuiEntityEditor);
