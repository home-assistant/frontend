import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-svg-icon";

@customElement("ha-bar-switch")
export class HaBarSwitch extends LitElement {
  @property({ type: Boolean })
  public disabled = false;

  @property({ type: Boolean })
  public vertical = false;

  @property({ type: Boolean, reflect: true })
  public checked?: boolean;

  // SVG icon path (if you need a non SVG icon instead, use the provided on-icon slot to pass an <ha-icon> in)
  @property({ type: String }) pathOn?: string;

  // SVG icon path (if you need a non SVG icon instead, use the provided off-icon slot to pass an <ha-icon> in)
  @property({ type: String }) pathOff?: string;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.setAttribute("role", "switch");
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("value")) {
      this.setAttribute("aria-checked", this.checked ? "true" : "false");
    }
  }

  private _toggle() {
    this.checked = !this.checked;
    fireEvent(this, "change");
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("keydown", this._keydown);
    this.addEventListener("click", this._toggle);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._keydown);
    this.removeEventListener("click", this._toggle);
  }

  private _keydown(ev: any) {
    if (ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.preventDefault();
    this._toggle();
  }

  protected render(): TemplateResult {
    return html`
      <div class="switch">
        <div class="button" aria-hidden="true">
          ${this.pathOn && this.checked
            ? html`<ha-svg-icon .path=${this.pathOn}></ha-svg-icon>`
            : html`<slot name="icon-on"></slot>`}
          ${this.pathOff && !this.checked
            ? html`<ha-svg-icon .path=${this.pathOff}></ha-svg-icon>`
            : html`<slot name="icon-on"></slot>`}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        --switch-bar-thickness: 40px;
        --switch-bar-border-radius: 12px;
        --switch-bar-padding: 4px;
        --mdc-icon-size: 20px;
        height: var(--switch-bar-thickness);
        width: 100%;
        box-sizing: border-box;
      }
      :host([vertical]) {
        width: var(--switch-bar-thickness);
        height: 100%;
      }
      :host([vertical]) .switch .button {
        width: 100%;
        height: 50%;
      }
      .switch {
        box-sizing: border-box;
        position: relative;
        height: 100%;
        width: 100%;
        border-radius: var(--switch-bar-border-radius);
        transform: translateZ(0);
        overflow: hidden;
        cursor: pointer;
        background: rgba(65, 71, 77, 0.08);
        padding: var(--switch-bar-padding);
      }
      .switch .button {
        width: 50%;
        height: 100%;
        background: lightgrey;
        border-radius: calc(
          var(--switch-bar-border-radius) - var(--switch-bar-padding)
        );
        transition: transform 180ms ease-in-out;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      :host([checked]) .switch .button {
        transform: translateX(100%);
      }
      :host([vertical][checked]) .switch .button {
        transform: translateY(100%);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bar-switch": HaBarSwitch;
  }
}
