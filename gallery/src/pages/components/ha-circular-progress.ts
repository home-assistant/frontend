import { html, css, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-bar";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-circular-progress";
import "@material/web/progress/circular-progress";

@customElement("demo-components-ha-circular-progress")
export class DemoHaCircularProgress extends LitElement {
  protected render(): TemplateResult {
    return html` <ha-circular-progress indeterminate></ha-circular-progress>
      <ha-circular-progress indeterminate size="tiny"></ha-circular-progress>
      <ha-circular-progress indeterminate size="small"></ha-circular-progress>
      <ha-circular-progress indeterminate size="large"></ha-circular-progress>
      <ha-circular-progress
        indeterminate
        aria-label="Doing something..."
      ></ha-circular-progress>
      <md-circular-progress
        value="0.5"
        aria-label="Page refresh progress"
      ></md-circular-progress>

      <md-linear-progress
        value="0.5"
        aria-label="Download progress"
      ></md-linear-progress>`;
  }

  static get styles() {
    return css``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-circular-progress": DemoHaCircularProgress;
  }
}
