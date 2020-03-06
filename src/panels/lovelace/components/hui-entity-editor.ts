import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { EntityConfig } from "../entity-rows/types";

import "../../../components/entity/ha-entity-picker";
import { EditorTarget } from "../editor/types";

@customElement("hui-entity-editor")
export class HuiEntityEditor extends LitElement {
  @property() protected hass?: HomeAssistant;

  @property() protected entities?: EntityConfig[];

  @property() protected label?: string;

  protected render(): TemplateResult {
    if (!this.entities) {
      return html``;
    }

    return html`
      <h3>
        ${this.label ||
          this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.entities"
          ) +
            " (" +
            this.hass!.localize(
              "ui.panel.lovelace.editor.card.config.required"
            ) +
            ")"}
      </h3>
      <div class="entities">
        ${this.entities.map((entityConf, index) => {
          return html`
            <div class="entity">
              <ha-entity-picker
                .hass=${this.hass}
                .value="${entityConf.entity}"
                .index="${index}"
                @change="${this._valueChanged}"
                allow-custom-entity
              ></ha-entity-picker>
              <paper-icon-button
                title="Move entity down"
                icon="hass:arrow-down"
                .index="${index}"
                @click="${this._entityDown}"
                ?disabled="${index === this.entities!.length - 1}"
              ></paper-icon-button>
              <paper-icon-button
                title="Move entity up"
                icon="hass:arrow-up"
                .index="${index}"
                @click="${this._entityUp}"
                ?disabled="${index === 0}"
              ></paper-icon-button>
            </div>
          `;
        })}
        <ha-entity-picker
          .hass=${this.hass}
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

  private _entityUp(ev: Event): void {
    const target = ev.target! as EditorTarget;
    const newEntities = this.entities!.concat();

    [newEntities[target.index! - 1], newEntities[target.index!]] = [
      newEntities[target.index!],
      newEntities[target.index! - 1],
    ];

    fireEvent(this, "entities-changed", { entities: newEntities });
  }

  private _entityDown(ev: Event): void {
    const target = ev.target! as EditorTarget;
    const newEntities = this.entities!.concat();

    [newEntities[target.index! + 1], newEntities[target.index!]] = [
      newEntities[target.index!],
      newEntities[target.index! + 1],
    ];

    fireEvent(this, "entities-changed", { entities: newEntities });
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
      .entity {
        display: flex;
        align-items: flex-end;
      }
      .entity ha-entity-picker {
        flex-grow: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-editor": HuiEntityEditor;
  }
}
