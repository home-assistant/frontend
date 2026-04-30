import "@home-assistant/webawesome/dist/components/animation/animation";
import { mdiInformationOutline } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import "../animation/ha-fade-in";
import "../animation/ha-fade-out";
import "../ha-icon-button";

@customElement("ha-automation-row-event-chip")
export class HaAutomationRowEventChip extends LitElement {
  @property({ reflect: true })
  public variant: "info" | "warning" | "success" | "danger" = "info";

  @property({ type: Boolean })
  public interactive = false;

  @property({ type: Boolean })
  public show = false;

  @state()
  private _hide = false;

  @state()
  private _highlight = 0;

  willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("show")) {
      this._highlight = 0;

      if (!this.show && this.hasUpdated) {
        this._hide = true;
      }
    }
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.show && !this._hide) {
      return nothing;
    }

    let base = html`<div><slot></slot></div>`;

    if (this.interactive) {
      base = html`<button>
        <slot></slot>
        <ha-svg-icon .path=${mdiInformationOutline}></ha-svg-icon>
      </button>`;
    }

    if (this.show && this._highlight) {
      return keyed(
        this._highlight,
        html`
          <wa-animation fill="both" .iterations=${1} name="tada" play
            >${base}</wa-animation
          >
        `
      );
    }

    if (!this.show && this._hide) {
      return html`
        <ha-fade-out @wa-finish=${this._handleHideFinish}>${base}</ha-fade-out>
      `;
    }

    return html`<ha-fade-in .duration=${250}>${base}</ha-fade-in>`;
  }

  public highlight() {
    this._highlight += 1;
  }

  private _handleHideFinish() {
    this._hide = false;
  }

  static styles = css`
    :host {
      --background-color: var(--ha-color-fill-primary-normal-resting);
      --background-color-hover: var(--ha-color-fill-primary-normal-hover);
      --text-color: var(--ha-color-on-primary-normal);
      border-radius: var(--ha-border-radius-pill);
    }

    :host([variant="warning"]) {
      --background-color: var(--ha-color-fill-warning-normal-resting);
      --background-color-hover: var(--ha-color-fill-warning-normal-hover);
      --text-color: var(--ha-color-on-warning-normal);
    }

    :host([variant="success"]) {
      --background-color: var(--ha-color-fill-success-normal-resting);
      --background-color-hover: var(--ha-color-fill-success-normal-hover);
      --text-color: var(--ha-color-on-success-normal);
    }

    :host([variant="danger"]) {
      --background-color: var(--ha-color-fill-danger-normal-resting);
      --background-color-hover: var(--ha-color-fill-danger-normal-hover);
      --text-color: var(--ha-color-on-danger-normal);
    }

    button,
    div {
      background: var(--background-color);
      border-radius: var(--ha-border-radius-pill);
      color: var(--text-color);
      display: inline-flex;
      gap: var(--ha-space-2);
      padding: var(--ha-space-1) var(--ha-space-2);
      align-items: center;
      --mdc-icon-size: 16px;
      line-height: 1;
    }

    button {
      border: none;
      cursor: pointer;
    }

    button:hover {
      background: var(--background-color-hover);
    }

    button:focus-visible {
      outline: var(--wa-focus-ring);
      outline-offset: var(--wa-focus-ring-offset);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-row-event-chip": HaAutomationRowEventChip;
  }

  interface HASSDomEvents {
    "toggle-collapsed": undefined;
    "stop-sort-selection": undefined;
    "copy-row": undefined;
    "cut-row": undefined;
    "delete-row": undefined;
  }
}
