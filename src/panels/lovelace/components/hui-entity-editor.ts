import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import "@polymer/paper-button/paper-button";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { EntityConfig } from "../entity-rows/types";

import "../../../components/entity/ha-entity-picker";

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
              <ha-entity-picker
                .hass="${this.hass}"
                .value="${entityConf.entity}"
                .index="${index}"
                @change="${this._valueChanged}"
                allow-custom-entity
              ></ha-entity-picker>
            `;
          })
        }
      </div>
      <br />
      <paper-button noink raised @click="${this._addEntity}"
        >Add Entity</paper-button
      >
    `;
  }

  private _addEntity() {
    const newConfigEntities = this.entities!.concat();

    newConfigEntities.push({ entity: "" });

    fireEvent(this, "change", { entities: newConfigEntities });
  }

  private _valueChanged(ev): void {
    const target = ev.target! as any;
    const newConfigEntities = this.entities!.concat();

    if (target.value === "") {
      newConfigEntities.splice(target.index, 1);
    } else {
      newConfigEntities[target.index].entity = target.value;
    }

    fireEvent(this, "change", { entities: newConfigEntities });
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        .entities {
          padding-left: 20px;
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
