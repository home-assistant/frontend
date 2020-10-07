import "@polymer/paper-input/paper-input";
import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import { configElementStyle } from "../config-elements/config-elements-style";
import { EditorTarget } from "../types";
import type { HaSwitch } from "../../../../components/ha-switch";
import "../../../../components/ha-formfield";
import "../../../../components/ha-switch";

declare global {
  interface HASSDomEvents {
    "lovelace-config-changed": {
      config: LovelaceConfig;
    };
  }
}

@customElement("hui-lovelace-editor")
export class HuiLovelaceEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public config?: LovelaceConfig;

  get _title(): string {
    if (!this.config) {
      return "";
    }
    return this.config.title || "";
  }

  get _append_view_title(): boolean {
    if (!this.config) {
      return false;
    }
    return this.config.append_view_title || false;
  }

  protected render(): TemplateResult {

    return html`
      <div class="card-config">
        <paper-input
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.edit_lovelace.title"
          )}
          .value="${this._title}"
          .configValue="${"title"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.edit_lovelace.append_view_title"
          )}
          .dir=${computeRTLDirection(this.hass)}
        >
          <ha-switch
            .checked=${this._append_view_title !== false}
            .configValue=${"append_view_title"}
            @change=${this._appendViewTitleChanged}
          ></ha-switch
        ></ha-formfield>
      </div>
    `;
  }

  private _appendViewTitleChanged(ev: Event) {
    if (!this.config) {
      return;
    }

    let newConfig = {
      ...this.config,
      append_view_title: (ev.target as HaSwitch).checked,
    };

    fireEvent(this, "lovelace-config-changed", { config: newConfig });
  }

  private _valueChanged(ev: Event): void {
    if (!this.config) {
      return;
    }

    const target = ev.currentTarget! as EditorTarget;

    if (this[`_${target.configValue}`] === target.value) {
      return;
    }

    let newConfig;

    if (target.configValue) {
      newConfig = {
        ...this.config,
        [target.configValue]: target.value,
      };
    }

    fireEvent(this, "lovelace-config-changed", { config: newConfig });
  }

  static get styles(): CSSResult {
    return configElementStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-lovelace-editor": HuiLovelaceEditor;
  }
}
