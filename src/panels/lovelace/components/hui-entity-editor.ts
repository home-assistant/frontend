import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { EntityConfig } from "../entity-rows/types";

import "../../../components/entity/ha-entity-picker";
import { EditorTarget } from "../editor/types";

@customElement("hui-entity-editor")
export class HuiEntityEditor extends LitElement {
  @property() protected hass?: HomeAssistant;

  @property() protected entities?: EntityConfig[];

  protected render(): TemplateResult | void {
    if (!this.entities) {
      return html``;
    }

    return html`
      <h3>Entities</h3>
      <div class="entities">
        ${this.entities.map((entityConf, index) => {
          return html`
            <ha-entity-picker
              .hass="${this.hass}"
              .value="${entityConf.entity}"
              .index="${index}"
              @change="${this._valueChanged}"
              allow-custom-entity
            ></ha-entity-picker>
          `;
        })}
        <ha-entity-picker
          .hass="${this.hass}"
          @change="${this._addEntity}"
        ></ha-entity-picker>
      </div>
    `;
  }

  private _addEntity(ev: Event): void {
    const target = ev.target! as EditorTarget;
    if (target.value === "") {
      return;
    }
    const newConfigEntities = this.entities!.concat({
      entity: target.value as string,
    });
    target.value = "";
    fireEvent(this, "entities-changed", { entities: newConfigEntities });
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

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  static get styles(): CSSResult {
    return css`
      .entities {
        padding-left: 20px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-editor": HuiEntityEditor;
  }
}
