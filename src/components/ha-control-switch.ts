import {
  DIRECTION_HORIZONTAL,
  DIRECTION_VERTICAL,
  Manager,
  Press,
  Swipe,
  Tap,
} from "@egjs/hammerjs";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import { mainWindow } from "../common/dom/get_main_window";
import "./ha-svg-icon";

@customElement("ha-control-switch")
export class HaControlSwitch extends LitElement {
  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public vertical = false;

  @property({ type: Boolean }) public reversed = false;

  @property({ type: Boolean }) public checked = false;

  // SVG icon path (if you need a non SVG icon instead, use the provided on icon slot to pass an <ha-icon slot="icon-on"> in)
  @property({ attribute: false }) pathOn?: string;

  // SVG icon path (if you need a non SVG icon instead, use the provided off icon slot to pass an <ha-icon slot="icon-off"> in)
  @property({ attribute: false }) pathOff?: string;

  @property({ type: String })
  public label?: string;

  @property({ attribute: "touch-action" })
  public touchAction?: string;

  private _mc?: HammerManager;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.setupSwipeListeners();
  }

  private _toggle() {
    if (this.disabled) return;
    this.checked = !this.checked;
    fireEvent(this, "change");
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setupSwipeListeners();
  }

  updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    if (
      changedProperties.has("disabled") ||
      changedProperties.has("vertical") ||
      changedProperties.has("reversed")
    ) {
      this.destroyListeners();
      this.setupSwipeListeners();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.destroyListeners();
  }

  @query("#switch")
  private switch!: HTMLDivElement;

  setupSwipeListeners() {
    if (this.disabled) {
      return;
    }

    if (this.switch && !this._mc) {
      this._mc = new Manager(this.switch, {
        touchAction: this.touchAction ?? (this.vertical ? "pan-x" : "pan-y"),
      });
      this._mc.add(
        new Swipe({
          direction: this.vertical ? DIRECTION_VERTICAL : DIRECTION_HORIZONTAL,
        })
      );

      this._mc.add(new Tap({ event: "singletap" }));
      this._mc.add(new Press());

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
          const isRTL = mainWindow.document.dir === "rtl";
          this.checked = (!this.reversed && !isRTL) || (this.reversed && isRTL);
          fireEvent(this, "change");
        });

        this._mc.on("swipeleft", () => {
          if (this.disabled) return;
          const isRTL = mainWindow.document.dir === "rtl";
          this.checked = (this.reversed && !isRTL) || (!this.reversed && isRTL);
          fireEvent(this, "change");
        });
      }

      this._mc.on("singletap pressup", () => {
        if (this.disabled) return;
        this._toggle();
      });
    }
  }

  destroyListeners() {
    if (this._mc) {
      this._mc.destroy();
      this._mc = undefined;
    }
  }

  private _keydown(ev: any) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._toggle();
      return;
    }

    const rtl = !this.vertical && mainWindow.document.dir === "rtl";
    const flip = this.reversed !== rtl;
    const [forward, backward] = this.vertical
      ? ["ArrowDown", "ArrowUp"]
      : ["ArrowRight", "ArrowLeft"];
    const onKey = flip ? backward : forward;
    const offKey = flip ? forward : backward;

    if (ev.key !== onKey && ev.key !== offKey) {
      return;
    }

    ev.preventDefault();

    const wantOn = ev.key === onKey;
    if (wantOn !== this.checked) {
      this._toggle();
    }
  }

  protected render(): TemplateResult {
    return html`
      <div
        id="switch"
        class="switch"
        @keydown=${this._keydown}
        aria-checked=${this.checked ? "true" : "false"}
        aria-label=${ifDefined(this.label)}
        role="switch"
        tabindex=${ifDefined(this.disabled ? undefined : "0")}
        ?checked=${this.checked}
        ?disabled=${this.disabled}
      >
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

  static styles = css`
    :host {
      display: block;
      --control-switch-on-color: var(--primary-color);
      --control-switch-off-color: var(--disabled-color);
      --control-switch-background-opacity: 0.2;
      --control-switch-hover-background-opacity: 0.4;
      --control-switch-thickness: 40px;
      --control-switch-border-radius: var(--ha-border-radius-lg);
      --control-switch-padding: 4px;
      --mdc-icon-size: 20px;
      height: var(--control-switch-thickness);
      width: 100%;
      box-sizing: border-box;
      user-select: none;
      transition: box-shadow 180ms ease-in-out;
      -webkit-tap-highlight-color: transparent;
    }
    .switch:not([disabled]):focus-visible {
      box-shadow: 0 0 0 2px var(--control-switch-off-color);
    }
    .switch[checked]:not([disabled]):focus-visible {
      box-shadow: 0 0 0 2px var(--control-switch-on-color);
    }
    .switch {
      box-sizing: border-box;
      position: relative;
      height: 100%;
      width: 100%;
      border-radius: var(--control-switch-border-radius);
      outline: none;
      overflow: hidden;
      padding: var(--control-switch-padding);
      display: flex;
      cursor: pointer;
    }
    .switch[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
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
    .switch:not([disabled]):focus-visible .background,
    .switch:not([disabled]):hover .background {
      opacity: var(--control-switch-hover-background-opacity);
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
    .switch[checked] .background {
      background-color: var(--control-switch-on-color);
    }
    .switch[checked] .button {
      transform: translateX(100%);
      background-color: var(--control-switch-on-color);
    }
    .switch[checked] .button:dir(rtl) {
      transform: translateX(-100%);
      background-color: var(--control-switch-on-color);
    }
    :host([reversed]) .switch {
      flex-direction: row-reverse;
    }
    :host([reversed]) .switch[checked] .button {
      transform: translateX(-100%);
    }
    :host([reversed]) .switch[checked] .button:dir(rtl) {
      transform: translateX(100%);
    }
    :host([vertical]) {
      width: var(--control-switch-thickness);
      height: 100%;
    }
    :host([vertical]) .switch[checked] .button {
      transform: translateY(100%);
    }
    :host([vertical]) .switch .button {
      width: 100%;
      height: 50%;
    }
    :host([vertical][reversed]) .switch {
      flex-direction: column-reverse;
    }
    :host([vertical][reversed]) .switch[checked] .button {
      transform: translateY(-100%);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-switch": HaControlSwitch;
  }
}
