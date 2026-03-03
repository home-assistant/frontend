import { preventDefault } from "@fullcalendar/core/internal";
import { HasSlotController } from "@home-assistant/webawesome/dist/internal/slot";
import { mdiInformationOutline } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-icon-button";
import "../ha-tooltip";

@customElement("ha-input-label")
export class HaInputLabel extends LitElement {
  @property() label?: string;

  @property() hint?: string;

  @property({ type: Boolean, reflect: true }) inline = false;

  private readonly _hasSlotController = new HasSlotController(this, "label");

  render() {
    const hasLabel = this.label || this._hasSlotController.test("label");

    return html`
      <div class="text">
        ${hasLabel
          ? html`<div class="label-content">
              <span>
                <slot name="label">${this.label}</slot>
              </span>
            </div>`
          : nothing}
      </div>
      <slot name="end">
        ${this.hint
          ? html`<ha-icon-button
                @click=${preventDefault}
                .path=${mdiInformationOutline}
                .label=${"Hint"}
                hide-title
                id="hint"
              ></ha-icon-button>
              <ha-tooltip for="hint">${this.hint}</ha-tooltip> `
          : nothing}
      </slot>
    `;
  }

  static styles = css`
    :host {
      height: 24px;
      display: flex;
      width: 100%;
      align-items: center;
      color: var(--ha-color-text-secondary);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
      gap: var(--ha-space-1);
    }

    .text {
      height: 100%;
      display: flex;
      flex: 1;
      padding-inline-end: calc(var(--ha-border-radius-xl) / 2);
      max-width: calc(100% - var(--ha-border-radius-xl));
    }

    .label-content {
      height: 100%;
      display: flex;
      max-width: 100%;
      align-items: center;
      position: relative;
      --input-label-background: var(
        --ha-input-label-background,
        var(--ha-color-fill-neutral-quiet-resting)
      );
      background-color: var(--input-label-background);
      border-top-left-radius: var(--ha-border-radius-xl);
      border-top-right-radius: var(--ha-border-radius-xl);
      transition: background-color 0.15s ease-in-out;
    }

    .label-content span {
      padding: 0 var(--ha-space-2);
      min-width: 0;
      overflow-x: clip;
      overflow-y: visible;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host([required]) .label-content span::after {
      margin-inline-start: 1px;
      content: var(--ha-input-required-marker, "*");
    }

    .label-content::before {
      content: "";
      position: absolute;
      inset-inline-start: 0;
      top: 100%;
      background-color: var(--input-label-background);
      transition: background-color 0.15s ease-in-out;
      height: calc(var(--ha-border-radius-xl) / 2 + 4px);
      width: calc(var(--ha-border-radius-xl) / 2 + 4px);
      mask: radial-gradient(
        calc(var(--ha-border-radius-lg) / 2) at 100% 100%,
        transparent 98%,
        black 100%
      );
    }

    :dir(rtl) .label-content::before {
      mask: radial-gradient(
        calc(var(--ha-border-radius-lg) / 2) at 0 100%,
        transparent 98%,
        black 100%
      );
    }

    .label-content::after {
      content: "";
      position: absolute;
      inset-inline-end: calc(-1 * var(--ha-border-radius-xl) / 2);
      top: var(--ha-border-radius-xl);
      height: calc(var(--ha-border-radius-xl) / 2);
      width: calc(var(--ha-border-radius-xl) / 2);
      background-color: var(--input-label-background);
      transition: background-color 0.15s ease-in-out;
      mask: radial-gradient(
        calc(var(--ha-border-radius-xl) / 2) at 100% 0,
        transparent 98%,
        black 100%
      );
    }

    :dir(rtl) .label-content::after {
      mask: radial-gradient(
        calc(var(--ha-border-radius-xl) / 2) at 0 0,
        transparent 98%,
        black 100%
      );
    }

    #hint {
      --ha-icon-button-size: 16px;
      --mdc-icon-size: 16px;
      color: var(--ha-color-on-disabled-normal);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input-label": HaInputLabel;
  }
}
