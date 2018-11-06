import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-checkbox/paper-checkbox";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types";
import { LovelaceCardEditor } from "../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { Config } from "../cards/hui-glance-card";

import "../../../components/entity/state-badge";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-card";
import "../../../components/ha-icon";

export class HuiGlanceCardEditor extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCardEditor {
  public hass?: HomeAssistant;
  private _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public setConfig(config: Config): void {
    this._config = { type: "glance", ...config };
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <paper-input
        label="Title"
        value="${this._config!.title}"
        .configValue=${"title"}
        @value-changed="${this._valueChanged}"
      ></paper-input><br>
      <paper-checkbox
        ?checked="${this._config!.show_name !== false}"
        .configValue=${"show_name"}
        @change="${this._valueChanged}"
      >Show Entity's Name?</paper-checkbox><br><br>
      <paper-checkbox
        ?checked="${this._config!.show_state !== false}"
        .configValue=${"show_state"}
        @change="${this._valueChanged}"
      >Show Entity's State Text?</paper-checkbox><br>
    `;
  }

  private _valueChanged(ev: MouseEvent): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target! as any;

    const newValue =
      target.checked !== undefined ? target.checked : target.value;

    fireEvent(this, "config-changed", {
      config: { ...this._config, [target.configValue]: newValue },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-glance-card-editor": HuiGlanceCardEditor;
  }
}

customElements.define("hui-glance-card-editor", HuiGlanceCardEditor);
