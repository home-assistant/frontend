import type { TemplateResult } from "lit";
import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-bar";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-spinner";
import type { HomeAssistant } from "../../../../src/types";

@customElement("demo-components-ha-spinner")
export class DemoHaCircularProgress extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`<ha-card header="Basic circular progress">
        <div class="card-content">
          <ha-spinner></ha-spinner></div
      ></ha-card>
      <ha-card header="Different circular progress sizes">
        <div class="card-content">
          <ha-spinner indeterminate size="tiny"></ha-spinner>
          <ha-spinner indeterminate size="small"></ha-spinner>
          <ha-spinner indeterminate size="medium"></ha-spinner>
          <ha-spinner indeterminate size="large"></ha-spinner></div
      ></ha-card>
      <ha-card header="Circular progress with an aria-label">
        <div class="card-content">
          <ha-spinner
            indeterminate
            aria-label="Doing something..."
          ></ha-spinner>
          <ha-spinner
            indeterminate
            .ariaLabel=${"Doing something..."}
          ></ha-spinner></div
      ></ha-card>`;
  }

  static styles = css`
    ha-card {
      max-width: 600px;
      margin: 24px auto;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-spinner": DemoHaCircularProgress;
  }
}
