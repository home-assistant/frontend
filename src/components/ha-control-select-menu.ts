import { Ripple } from "@material/mwc-ripple";
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { SelectBase } from "@material/mwc-select/mwc-select-base";
import { css, html, nothing } from "lit";
import {
  customElement,
  eventOptions,
  query,
  queryAsync,
  state,
} from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { debounce } from "../common/util/debounce";
import { nextRender } from "../common/util/render-status";
import "./ha-icon";
import type { HaIcon } from "./ha-icon";
import "./ha-svg-icon";
import type { HaSvgIcon } from "./ha-svg-icon";

@customElement("ha-control-select-menu")
export class HaControlSelectMenu extends SelectBase {
  @query(".select") protected mdcRoot!: HTMLElement;

  @query(".select-anchor") protected anchorElement!: HTMLDivElement | null;

  @queryAsync("mwc-ripple") private _ripple!: Promise<Ripple | null>;

  @state() private _shouldRenderRipple = false;

  public override render() {
    const classes = {
      "select-disabled": this.disabled,
      "select-required": this.required,
      "select-invalid": !this.isUiValid,
      "select-no-value": !this.selectedText,
    };

    const labelledby = this.label ? "label" : undefined;

    return html`
      <div class="select ${classMap(classes)}">
        <input
          class="formElement"
          .name=${this.name}
          .value=${this.value}
          hidden
          ?disabled=${this.disabled}
          ?required=${this.required}
        />
        <!-- @ts-ignore -->
        <div
          class="select-anchor"
          aria-autocomplete="none"
          role="combobox"
          aria-expanded=${this.menuOpen}
          aria-invalid=${!this.isUiValid}
          aria-haspopup="listbox"
          aria-labelledby=${ifDefined(labelledby)}
          aria-required=${this.required}
          @click=${this.onClick}
          @focus=${this.onFocus}
          @blur=${this.onBlur}
          @keydown=${this.onKeydown}
          @mousedown=${this.handleRippleActivate}
          @mouseup=${this.handleRippleDeactivate}
          @mouseenter=${this.handleRippleMouseEnter}
          @mouseleave=${this.handleRippleMouseLeave}
          @touchstart=${this.handleRippleActivate}
          @touchend=${this.handleRippleDeactivate}
          @touchcancel=${this.handleRippleDeactivate}
        >
          ${this.renderIcon()}
          <div class="content">
            <p id="label" class="label">${this.label}</p>
            ${this.selectedText
              ? html`<p class="value">${this.selectedText}</p>`
              : nothing}
          </div>
          ${this._shouldRenderRipple && !this.disabled
            ? html` <mwc-ripple></mwc-ripple> `
            : nothing}
        </div>
        ${this.renderMenu()}
      </div>
    `;
  }

  private renderIcon() {
    const index = this.mdcFoundation?.getSelectedIndex();
    const items = this.menuElement?.items ?? [];
    const item = index != null ? items[index] : undefined;
    const icon =
      item?.querySelector("[slot='graphic']") ??
      (null as HaSvgIcon | HaIcon | null);

    return html`
      <div class="icon">
        ${icon && "path" in icon
          ? html`<ha-svg-icon .path=${icon.path}></ha-svg-icon>`
          : icon && "icon" in icon
          ? html`<ha-icon .path=${icon.icon}></ha-icon>`
          : html`<slot name="icon"></slot>`}
      </div>
    `;
  }

  protected onFocus() {
    this.handleRippleFocus();
    super.onFocus();
  }

  protected onBlur() {
    this.handleRippleBlur();
    super.onBlur();
  }

  private _rippleHandlers: RippleHandlers = new RippleHandlers(() => {
    this._shouldRenderRipple = true;
    return this._ripple;
  });

  @eventOptions({ passive: true })
  private handleRippleActivate(evt?: Event) {
    this._rippleHandlers.startPress(evt);
  }

  private handleRippleDeactivate() {
    this._rippleHandlers.endPress();
  }

  private handleRippleMouseEnter() {
    this._rippleHandlers.startHover();
  }

  private handleRippleMouseLeave() {
    this._rippleHandlers.endHover();
  }

  private handleRippleFocus() {
    this._rippleHandlers.startFocus();
  }

  private handleRippleBlur() {
    this._rippleHandlers.endFocus();
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("translations-updated", this._translationsUpdated);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      "translations-updated",
      this._translationsUpdated
    );
  }

  private _translationsUpdated = debounce(async () => {
    await nextRender();
    this.layoutOptions();
  }, 500);

  static override styles = [
    css`
      :host {
        display: inline-block;
        --control-select-menu-text-color: var(--primary-text-color);
        --control-select-menu-background-color: var(--disabled-color);
        --control-select-menu-background-opacity: 0.2;
        --control-select-menu-border-radius: 16px;
        --control-select-menu-min-width: 120px;
        --control-select-menu-max-width: 200px;
        --control-select-menu-width: 100%;
        --mdc-icon-size: 24px;
        color: var(--primary-text-color);
        -webkit-tap-highlight-color: transparent;
      }
      .select-anchor {
        color: var(--control-select-menu-text-color);
        height: 56px;
        padding: 8px 12px;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        display: flex;
        flex-direction: row;
        align-items: center;
        border-radius: var(--control-select-menu-border-radius);
        box-sizing: border-box;
        outline: none;
        overflow: hidden;
        background: none;
        --mdc-ripple-color: var(--control-select-menu-background-color);
        /* For safari border-radius overflow */
        z-index: 0;
        font-size: inherit;
        transition: color 180ms ease-in-out;
        color: var(--control-text-icon-color);
        gap: 12px;
        min-width: var(--control-select-menu-min-width);
        max-width: var(--control-select-menu-max-width);
        width: var(--control-select-menu-width);
        user-select: none;
      }
      .content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        flex: 1;
        overflow: hidden;
      }

      .content p {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        min-width: 0;
        width: 100%;
        margin: auto;
      }

      .label {
        font-size: 12px;
        font-style: normal;
        font-weight: 400;
        line-height: 16px;
        letter-spacing: 0.4px;
      }

      .select-no-value .label {
        font-size: 16px;
        line-height: 24px;
        letter-spacing: 0.5px;
      }

      .value {
        font-size: 16px;
        font-style: normal;
        font-weight: 400;
        line-height: 24px;
        letter-spacing: 0.5px;
      }

      .select-anchor::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        background-color: var(--control-select-menu-background-color);
        transition:
          background-color 180ms ease-in-out,
          opacity 180ms ease-in-out;
        opacity: var(--control-select-menu-background-opacity);
      }

      .select-disabled .select-anchor {
        cursor: not-allowed;
        color: var(--disabled-color);
      }

      mwc-menu {
        --mdc-shape-medium: 8px;
      }
      mwc-list {
        --mdc-list-vertical-padding: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-select-menu": HaControlSelectMenu;
  }
}
