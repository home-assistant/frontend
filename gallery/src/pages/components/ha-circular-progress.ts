import { html, css, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-bar";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-circular-progress";
import "@material/web/progress/circular-progress";
import { HomeAssistant } from "../../../../src/types";

@customElement("demo-components-ha-circular-progress")
export class DemoHaCircularProgress extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`<ha-card header="Basic circular progress">
        <div class="card-content">
          <ha-circular-progress indeterminate></ha-circular-progress></div
      ></ha-card>
      <ha-card header="Different circular progress sizes">
        <div class="card-content">
          <ha-circular-progress
            indeterminate
            size="tiny"
          ></ha-circular-progress>
          <ha-circular-progress
            indeterminate
            size="small"
          ></ha-circular-progress>
          <ha-circular-progress
            indeterminate
            size="medium"
          ></ha-circular-progress>
          <ha-circular-progress
            indeterminate
            size="large"
          ></ha-circular-progress></div
      ></ha-card>
      <ha-card header="Circular progress with an aria-label">
        <div class="card-content">
          <ha-circular-progress
            indeterminate
            aria-label="Doing something..."
          ></ha-circular-progress>
          <ha-circular-progress
            indeterminate
            .ariaLabel=${"Doing something..."}
          ></ha-circular-progress></div
      ></ha-card>`;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-circular-progress": DemoHaCircularProgress;
  }
}
