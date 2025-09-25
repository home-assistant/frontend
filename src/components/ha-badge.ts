import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import "./ha-ripple";

type BadgeType = "badge" | "button";

@customElement("ha-badge")
export class HaBadge extends LitElement {
  @property() public type: BadgeType = "badge";

  @property() public label?: string;

  @property({ type: Boolean, attribute: "icon-only" }) iconOnly = false;

  protected render() {
    const label = this.label;

    return html`
      <div
        class="badge ${classMap({
          "icon-only": this.iconOnly,
        })}"
        role=${ifDefined(this.type === "button" ? "button" : undefined)}
        tabindex=${ifDefined(this.type === "button" ? "0" : undefined)}
      >
        <ha-ripple .disabled=${this.type !== "button"}></ha-ripple>
        <slot name="icon"></slot>
        ${this.iconOnly
          ? nothing
          : html`<span class="info">
              ${label ? html`<span class="label">${label}</span>` : nothing}
              <span class="content"><slot></slot></span>
            </span>`}
      </div>
    `;
  }

  static styles = css`
    :host {
      --badge-color: var(--secondary-text-color);
      -webkit-tap-highlight-color: transparent;
    }
    .badge {
      position: relative;
      --ha-ripple-color: var(--badge-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
      transition:
        box-shadow 180ms ease-in-out,
        border-color 180ms ease-in-out;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: var(--ha-badge-size, 36px);
      min-width: var(--ha-badge-size, 36px);
      padding: 0px 12px;
      box-sizing: border-box;
      width: auto;
      border-radius: var(
        --ha-badge-border-radius,
        calc(var(--ha-badge-size, 36px) / 2)
      );
      background: var(
        --ha-card-background,
        var(--card-background-color, white)
      );
      -webkit-backdrop-filter: var(--ha-card-backdrop-filter, none);
      backdrop-filter: var(--ha-card-backdrop-filter, none);
      border-width: var(--ha-card-border-width, 1px);
      box-shadow: var(--ha-card-box-shadow, none);
      border-style: solid;
      border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
    }
    .badge:focus-visible {
      --shadow-default: var(--ha-card-box-shadow, 0 0 0 0 transparent);
      --shadow-focus: 0 0 0 1px var(--badge-color);
      border-color: var(--badge-color);
      box-shadow: var(--shadow-default), var(--shadow-focus);
    }
    [role="button"] {
      cursor: pointer;
    }
    [role="button"]:focus {
      outline: none;
    }
    .info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding-inline-start: initial;
      text-align: center;
    }
    .label {
      font-size: var(--ha-font-size-xs);
      font-style: normal;
      font-weight: var(--ha-font-weight-medium);
      line-height: 10px;
      letter-spacing: 0.1px;
      color: var(--secondary-text-color);
    }
    .content {
      font-size: var(--ha-badge-font-size, var(--ha-font-size-s));
      font-style: normal;
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-condensed);
      letter-spacing: 0.1px;
      color: var(--primary-text-color);
    }
    ::slotted([slot="icon"]) {
      --mdc-icon-size: var(--ha-badge-icon-size, 18px);
      color: var(--badge-color);
      line-height: 0;
      margin-left: -4px;
      margin-right: 0;
      margin-inline-start: -4px;
      margin-inline-end: 0;
    }
    ::slotted(img[slot="icon"]) {
      width: 30px;
      height: 30px;
      border-radius: var(--ha-border-radius-circle);
      object-fit: cover;
      overflow: hidden;
      margin-left: -10px;
      margin-right: 0;
      margin-inline-start: -10px;
      margin-inline-end: 0;
    }
    .badge.icon-only {
      padding: 0;
    }
    .badge.icon-only ::slotted([slot="icon"]) {
      margin-left: 0;
      margin-right: 0;
      margin-inline-start: 0;
      margin-inline-end: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-badge": HaBadge;
  }
}
