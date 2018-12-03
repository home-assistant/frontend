import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-toggle-button/paper-toggle-button";

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
                ${this.renderOptions(entityConf, index)}
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

  protected renderOptions(
    _entityConf: EntityConfig,
    _index: number
  ): TemplateResult {
    return html``;
  }

  protected renderStyle(): TemplateResult {
    return html`
      <style>
        .entities {
          padding-left: 16px;
        }
        paper-button {
          margin: 8px 0;
        }
      </style>
    `;
  }

  protected _commitChangedOptions(entity: EntityConfig, index: number): void {
    const newConfigEntities = this.entities!.concat();

    newConfigEntities[index] = {
      ...newConfigEntities[index],
      ...entity,
    };

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  private _addEntity() {
    const newConfigEntities = this.entities!.concat({ entity: "" });

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  private _valueChanged(ev: Event): void {
    const target = ev.currentTarget! as EditorTarget;
    const newConfigEntities = this.entities!.concat();

    if (target.value === "") {
      newConfigEntities.splice(target.index!, 1);
    } else {
      newConfigEntities[target.index!] = {
        ...newConfigEntities[target.index!],
        entity: target.value!,
      };
    }

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-editor": HuiEntityEditor;
  }
}

customElements.define("hui-entity-editor", HuiEntityEditor);
