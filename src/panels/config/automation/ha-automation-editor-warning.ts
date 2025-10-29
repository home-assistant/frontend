import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-alert";

@customElement("ha-automation-editor-warning")
export class HaAutomationEditorWarning extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: "alert-title" }) public alertTitle?: string;

  @property({ attribute: false }) public warnings: string[] = [];

  protected render() {
    return html`
      <ha-alert
        alert-type="warning"
        .title=${this.alertTitle ||
        this.localize("ui.errors.config.editor_not_supported")}
      >
        ${this.warnings.length && this.warnings[0] !== undefined
          ? html`<ul>
              ${this.warnings.map((warning) => html`<li>${warning}</li>`)}
            </ul>`
          : nothing}
        ${this.localize("ui.errors.config.edit_in_yaml_supported")}
      </ha-alert>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-editor-warning": HaAutomationEditorWarning;
  }
}
