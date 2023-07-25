import {
  DIRECTION_HORIZONTAL,
  DIRECTION_VERTICAL,
  Manager,
  Swipe,
  Tap,
} from "@egjs/hammerjs";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-svg-icon";

@customElement("ha-control-switch")
export class HaControlSwitch extends LitElement {
  @property({ type: Boolean, reflect: true })
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

  private _mc?: HammerManager;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.setupListeners();
    this.setAttribute("role", "switch");
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("checked")) {
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
    this.setupListeners();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.destroyListeners();
  }

  @query("#switch")
  private switch!: HTMLDivElement;

  setupListeners() {
    if (this.switch && !this._mc) {
      this._mc = new Manager(this.switch, {
        touchAction: this.vertical ? "pan-x" : "pan-y",
      });
      this._mc.add(
        new Swipe({
          direction: this.vertical ? DIRECTION_VERTICAL : DIRECTION_HORIZONTAL,
        })
      );

      this._mc.add(new Tap({ event: "singletap" }));

      if (this.vertical) {
        this._mc.on("swipeup", () => {
          if (this.disabled) return;
          this.checked = !!this.reversed;
          fireEvent(this, "change");
        });

        this._mc.on("swipedown", () => {
          if (this.disabled) return;
          this.checked = !this.reversed;
          fireEvent(this, "change");
        });
      } else {
        this._mc.on("swiperight", () => {
          if (this.disabled) return;
          this.checked = !this.reversed;
          fireEvent(this, "change");
        });

        this._mc.on("swipeleft", () => {
          if (this.disabled) return;
          this.checked = !!this.reversed;
          fireEvent(this, "change");
        });
      }

      this._mc.on("singletap", () => {
        if (this.disabled) return;
        this._toggle();
      });
      this.addEventListener("keydown", this._keydown);
    }
  }

  destroyListeners() {
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
    this.removeEventListener("keydown", this._keydown);
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
      <div id="switch" class="switch">
        <div class="background"></div>
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
        --control-switch-on-color: var(--primary-color);
        --control-switch-off-color: var(--disabled-color);
        --control-switch-background-opacity: 0.2;
        --control-switch-thickness: 40px;
        --control-switch-border-radius: 12px;
        --control-switch-padding: 4px;
        --mdc-icon-size: 20px;
        height: var(--control-switch-thickness);
        width: 100%;
        box-sizing: border-box;
        user-select: none;
        cursor: pointer;
        border-radius: var(--control-switch-border-radius);
        outline: none;
        transition: box-shadow 180ms ease-in-out;
        -webkit-tap-highlight-color: transparent;
      }
      :host(:focus-visible) {
        box-shadow: 0 0 0 2px var(--control-switch-off-color);
      }
      :host([checked]:focus-visible) {
        box-shadow: 0 0 0 2px var(--control-switch-on-color);
      }
      .switch {
        box-sizing: border-box;
        position: relative;
        height: 100%;
        width: 100%;
        border-radius: var(--control-switch-border-radius);
        overflow: hidden;
        padding: var(--control-switch-padding);
        display: flex;
      }
      .switch .background {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        background-color: var(--control-switch-off-color);
        transition: background-color 180ms ease-in-out;
        opacity: var(--control-switch-background-opacity);
      }
      .switch .button {
        width: 50%;
        height: 100%;
        background: lightgrey;
        border-radius: calc(
          var(--control-switch-border-radius) - var(--control-switch-padding)
        );
        transition:
          transform 180ms ease-in-out,
          background-color 180ms ease-in-out;
        background-color: var(--control-switch-off-color);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      :host([checked]) .switch .background {
        background-color: var(--control-switch-on-color);
      }
      :host([checked]) .switch .button {
        transform: translateX(100%);
        background-color: var(--control-switch-on-color);
      }
      :host([reversed]) .switch {
        flex-direction: row-reverse;
      }
      :host([reversed][checked]) .switch .button {
        transform: translateX(-100%);
      }
      :host([vertical]) {
        width: var(--control-switch-thickness);
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
    "ha-control-switch": HaControlSwitch;
  }
}
