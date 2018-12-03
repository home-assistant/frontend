import { html, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import { HuiEntityEditor } from "../../../components/hui-entity-editor";
import { HomeAssistant } from "../../../../../types";
import { ConfigEntity } from "../../../cards/hui-glance-card";
import { GlanceOptions } from "./glance-options";
import { EditorTarget } from "../../types";

export class HuiGlanceEntityEditor extends HuiEntityEditor {
  protected hass?: HomeAssistant;
  protected entities?: ConfigEntity[];

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      entities: {},
    };
  }

  protected renderOptions(
    entityConf: ConfigEntity,
    index: number
  ): TemplateResult {
    const glanceOptions = new GlanceOptions(entityConf);

    return html`
      <paper-toggle-button>Options</paper-toggle-button>
      <div class="options" .index="${index}">
        <paper-input
          label="Name"
          .value="${glanceOptions.name}"
          .configValue="${"name"}"
          @value-changed="${this._optionChanged}"
        ></paper-input>
        <paper-input
          label="Icon"
          .value="${glanceOptions.icon}"
          .configValue="${"icon"}"
          @value-changed="${this._optionChanged}"
        ></paper-input>
        <paper-dropdown-menu label="Toggle Action">
          <paper-listbox
            slot="dropdown-content"
            .selected="${glanceOptions.tap_action}"
            attr-for-selected="action"
            .configValue="${"tap_action"}"
            @selected-item-changed="${this._optionChanged}"
          >
            <paper-item action="more-info">More Info Dialog</paper-item>
            <paper-item action="toggle">Toggle</paper-item>
            <paper-item action="call-service">Call Service</paper-item>
          </paper-listbox>
        </paper-dropdown-menu>
        <paper-dropdown-menu label="Hold Action">
          <paper-listbox
            slot="dropdown-content"
            .selected="${glanceOptions.hold_action}"
            attr-for-selected="action"
            .configValue="${"hold_action"}"
            @selected-item-changed="${this._optionChanged}"
          >
            <paper-item action="">No Action</paper-item>
            <paper-item action="more-info">More Info Dialog</paper-item>
            <paper-item action="toggle">Toggle</paper-item>
            <paper-item action="call-service">Call Service</paper-item>
          </paper-listbox>
        </paper-dropdown-menu>
        ${
          glanceOptions.hold_action === "call-service" ||
          glanceOptions.tap_action === "call-service"
            ? html`
                <paper-input
                  label="Service"
                  .value="${glanceOptions.service}"
                  .configValue="${"service"}"
                  @value-changed="${this._optionChanged}"
                ></paper-input>
              `
            : ""
        }
      </div>
    `;
  }

  protected _optionChanged(ev: Event): void {
    const target = ev.currentTarget! as EditorTarget;
    const value = target.value || target.selected;
    const index = target.parentElement!.index!;
    let entity = this.entities![index];
    const glanceOptions = new GlanceOptions(entity);

    if (glanceOptions[target.configValue!] === value) {
      return;
    }

    entity = {
      ...entity,
      [target.configValue!]: value,
    };

    this._commitChangedOptions(entity, index);
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
        .entity {
          display: flex;
          align-items: flex-end;
          flex-direction: row;
          flex-wrap: wrap;
        }
        ha-entity-picker {
          flex: 3;
        }
        .entity paper-toggle-button {
          flex: 1;
          padding: 0 0 8px 16px;
        }
        .options {
          display: none;
          width: 100%;
          padding-left: 16px;
          flex-direction: row;
          flex-wrap: wrap;
        }
        .options > * {
          flex: 1 0 30%;
          padding-right: 4px;
        }
        .entity paper-toggle-button[checked] ~ .options {
          display: flex;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-glance-entity-editor": HuiGlanceEntityEditor;
  }
}

customElements.define("hui-glance-entity-editor", HuiGlanceEntityEditor);
