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
  @property({ type: Boolean, attribute: "disabled" })
  public disabled = false;

  @property({ type: Boolean })
  public vertical = false;

  @property({ type: Boolean })
  public reversed = false;

  @property({ type: Boolean, reflect: true })
  public checked?: boolean;

  // SVG icon path (if you need a non SVG icon instead, use the provided on icon slot to pass an <ha-icon slot="icon-on"> in)
  @property({ type: String }) pathOn?: string;

  // SVG icon path (if you need a non SVG icon instead, use the provided off icon slot to pass an <ha-icon slot="icon-off"> in)
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
    if (this.disabled) return;
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
          ${this.checked
            ? this.pathOn
              ? html`<ha-svg-icon .path=${this.pathOn}></ha-svg-icon>`
              : html`<slot name="icon-on"></slot>`
            : this.pathOff
            ? html`<ha-svg-icon .path=${this.pathOff}></ha-svg-icon>`
            : html`<slot name="icon-off"></slot>`}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        --switch-bar-color-on: var(--rgb-primary-color);
        --switch-bar-color-off: var(--rgb-disabled-color);
        --switch-bar-thickness: 40px;
        --switch-bar-border-radius: 12px;
        --switch-bar-padding: 4px;
        --mdc-icon-size: 20px;
        height: var(--switch-bar-thickness);
        width: 100%;
        box-sizing: border-box;
        user-select: none;
        cursor: pointer;
      }
      .switch {
        box-sizing: border-box;
        position: relative;
        height: 100%;
        width: 100%;
        border-radius: var(--switch-bar-border-radius);
        background-color: rgba(var(--switch-bar-color-off), 0.3);
        padding: var(--switch-bar-padding);
        transition: background-color 180ms ease-in-out;
        display: flex;
      }
      .switch .button {
        width: 50%;
        height: 100%;
        background: lightgrey;
        border-radius: calc(
          var(--switch-bar-border-radius) - var(--switch-bar-padding)
        );
        transition: transform 180ms ease-in-out,
          background-color 180ms ease-in-out;
        background-color: rgb(var(--switch-bar-color-off));
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      :host([checked]) .switch {
        background-color: rgba(var(--switch-bar-color-on), 0.3);
      }
      :host([checked]) .switch .button {
        transform: translateX(100%);
        background-color: rgb(var(--switch-bar-color-on));
      }
      :host([reversed]) .switch {
        flex-direction: row-reverse;
      }
      :host([reversed][checked]) .switch .button {
        transform: translateX(-100%);
      }
      :host([vertical]) {
        width: var(--switch-bar-thickness);
        height: 100%;
      }
      :host([vertical][checked]) .switch .button {
        transform: translateY(100%);
      }
      :host([vertical]) .switch .button {
        width: 100%;
        height: 50%;
      }
      :host([vertical][reversed]) .switch {
        flex-direction: column-reverse;
      }
      :host([vertical][reversed][checked]) .switch .button {
        transform: translateY(-100%);
      }
      :host([disabled]) {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bar-switch": HaBarSwitch;
  }
}
