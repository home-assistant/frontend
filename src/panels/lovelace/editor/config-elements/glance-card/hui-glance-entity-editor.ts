import { html, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import { HuiEntityEditor } from "../../../components/hui-entity-editor";
import { HomeAssistant } from "../../../../../types";
import { ConfigEntity } from "../../../cards/hui-glance-card";
import { GlanceOptions } from "./glance-options-class";

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
      <div class="options">
        <paper-input
          label="Name"
          .value="${glanceOptions._name}"
          .configValue="${"name"}"
          .index="${index}"
          @value-changed="${this._optionChanged}"
        ></paper-input>
        <paper-input
          label="Icon"
          .value="${glanceOptions._icon}"
          .configValue="${"icon"}"
          .index="${index}"
          @value-changed="${this._optionChanged}"
        ></paper-input>
        <paper-dropdown-menu label="Toggle Action">
          <paper-listbox
            slot="dropdown-content"
            .selected="${glanceOptions._tapaction}"
            attr-for-selected="action"
            .configValue="${"tap_action"}"
            .index="${index}"
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
            .selected="${glanceOptions._holdaction}"
            attr-for-selected="action"
            .configValue="${"hold_action"}"
            .index="${index}"
            @selected-item-changed="${this._optionChanged}"
          >
            <paper-item action="">No Action</paper-item>
            <paper-item action="more-info">More Info Dialog</paper-item>
            <paper-item action="toggle">Toggle</paper-item>
            <paper-item action="call-service">Call Service</paper-item>
          </paper-listbox>
        </paper-dropdown-menu>
        <paper-input
          label="Service"
          .value="${glanceOptions._service}"
          .configValue="${"service"}"
          .index="${index}"
          @value-changed="${this._optionChanged}"
        ></paper-input>
      </div>
    `;
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
