import type { TemplateResult } from "lit";
import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../src/components/ha-bar";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-spinner";
import type { HomeAssistant } from "../../../../src/types";

@customElement("demo-components-ha-spinner")
export class DemoHaSpinner extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`<ha-card header="Basic spinner">
        <div class="card-content">
          <ha-spinner></ha-spinner></div
      ></ha-card>
      <ha-card header="Different spinner sizes">
        <div class="card-content">
          <ha-spinner size="tiny"></ha-spinner>
          <ha-spinner size="small"></ha-spinner>
          <ha-spinner size="medium"></ha-spinner>
          <ha-spinner size="large"></ha-spinner></div
      ></ha-card>
      <ha-card header="Spinner with an aria-label">
        <div class="card-content">
          <ha-spinner aria-label="Doing something..."></ha-spinner>
          <ha-spinner .ariaLabel=${"Doing something..."}></ha-spinner></div
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
    "demo-components-ha-spinner": DemoHaSpinner;
  }
}
