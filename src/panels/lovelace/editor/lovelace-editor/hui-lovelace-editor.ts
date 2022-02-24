import "../../../../components/ha-textfield";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import { EditorTarget } from "../types";

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

  protected render(): TemplateResult {
    return html`
      <ha-textfield
        .label=${this.hass.localize(
          "ui.panel.lovelace.editor.edit_lovelace.title"
        )}
        .value=${this._title}
        .configValue=${"title"}
        @change=${this._valueChanged}
      ></ha-textfield>
    `;
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

  static styles: CSSResultGroup = css`
    ha-textfield {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-lovelace-editor": HuiLovelaceEditor;
  }
}
