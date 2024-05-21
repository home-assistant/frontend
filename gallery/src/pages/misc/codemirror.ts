import "@material/mwc-button";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-code-editor";
import { HomeAssistant } from "../../../../src/types";

@customElement("demo-misc-codemirror")
export class DemoCodemirror extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() valueOld: string = "";

  @state() valueNew: string = "";

  protected render(): TemplateResult {
    return html`<div class="editor-container">
      <div class="editor-wrapper">
        <div class="editor-title">Codemirror 5</div>
        <ha-code-editor
          .hass=${this.hass}
          .value=${this.valueOld}
          mode="legacyyaml"
          autocomplete-entities
          autocomplete-icons
          dir="ltr"
        ></ha-code-editor>
      </div>
      <div class="editor-wrapper">
        <div class="editor-title">Codemirror 6</div>
        <ha-code-editor
          .hass=${this.hass}
          .value=${this.valueOld}
          mode="yaml"
          autocomplete-entities
          autocomplete-icons
          dir="ltr"
        ></ha-code-editor>
      </div>
    </div>`;
  }

  static styles = css`
    .editor-container {
      display: flex;
    }
    .editor-wrapper {
      width: 50%;
      box-sizing: border-box;
      padding: 10px;
    }
    .editor-title {
      text-align: center;
      font-weight: bold;
      margin-bottom: 5px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-misc-codemirror": DemoCodemirror;
  }
}
