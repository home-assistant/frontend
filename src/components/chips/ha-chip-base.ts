import { LocalizeController } from "@home-assistant/webawesome/dist/utilities/localize.js";
import { mdiClose } from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, nothing } from "lit";
import { property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import { HaButton } from "../ha-button";
import "../ha-svg-icon";

export interface ChipFocusOptions extends FocusOptions {
  trailing?: boolean;
}

export class HaChipBase extends HaButton {
  @property() label = "";

  @property({ type: Boolean }) removable = false;

  @property({ type: Boolean, attribute: "remove-only" }) removeOnly = false;

  @property({ type: Boolean, reflect: true, attribute: "soft-disabled" })
  softDisabled = false;

  @property({ type: Boolean, attribute: "always-focusable" })
  alwaysFocusable = false;

  @property({ type: Boolean, reflect: true, attribute: "has-icon" })
  hasIcon = false;

  @property({ type: Number, reflect: true, attribute: "tabindex" })
  override tabIndex = 0;

  @property({ attribute: "aria-label-remove" }) ariaLabelRemove: string | null =
    null;

  @query(".primary") private _primary?: HTMLButtonElement | HTMLAnchorElement;

  @query(".remove") private _remove?: HTMLButtonElement;

  @state() private _trailingFocused = false;

  @state() private _hasTrailingIcon = false;

  private _chipLocalize = new LocalizeController(this);

  override variant: HaButton["variant"] = "neutral";

  override appearance: HaButton["appearance"] = "outlined";

  override size: HaButton["size"] = "s";

  protected get pressed(): boolean | undefined {
    return undefined;
  }

  get focusable() {
    return !this.disabled || this.alwaysFocusable;
  }

  constructor() {
    super();
    this.addEventListener("click", this._blockDisabledClick);
    this.addEventListener("keydown", this._handleKeyDown);
  }

  override focus(options?: ChipFocusOptions) {
    if (!this.focusable) {
      return;
    }

    if (
      (options?.trailing || (this.removeOnly && !this.href)) &&
      this._remove
    ) {
      this._remove.focus(options);
    } else {
      this._primary?.focus(options);
    }
  }

  override click() {
    if (this.removeOnly && !this.href) {
      this._remove?.click();
    } else {
      this._primary?.click();
    }
  }

  override blur() {
    this._primary?.blur();
    this._remove?.blur();
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);

    if (changed.has("disabled") || changed.has("alwaysFocusable")) {
      fireEvent(this, "update-focus", undefined, { composed: false });
    }
  }

  override render() {
    return html`
      <div class=${classMap({ container: true, "has-remove": this.removable })}>
        ${this._renderPrimaryAction()}
        ${
          this.removable
            ? html`
                <span id="remove-label" hidden>
                  ${this._chipLocalize.term("remove")}
                </span>
                <span id="accessible-label" hidden>${this.ariaLabel}</span>
                <button
                  class="button remove trailing action"
                  part="remove-button"
                  type="button"
                  ?disabled=${this.disabled && !this.alwaysFocusable}
                  aria-disabled=${this.softDisabled ? "true" : nothing}
                  aria-label=${this.ariaLabelRemove || nothing}
                  aria-labelledby=${
                    this.ariaLabelRemove
                      ? nothing
                      : this.ariaLabel
                        ? "remove-label accessible-label"
                        : "remove-label label"
                  }
                  tabindex=${this.removeOnly && !this.href ? this.tabIndex : -1}
                  @click=${this._handleRemove}
                  @focus=${this._handleRemoveFocus}
                  @blur=${this._handleRemoveBlur}
                >
                  <span class="icon" aria-hidden="true">
                    <slot name="remove-trailing-icon">
                      <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                    </slot>
                  </span>
                </button>
              `
            : nothing
        }
      </div>
    `;
  }

  private _renderPrimaryAction() {
    if (this.href) {
      return html`<a
        class="button primary action"
        part="base"
        title=${this.title || nothing}
        href=${this.href}
        target=${this.target || nothing}
        download=${this.download || nothing}
        rel=${this.rel || nothing}
        aria-label=${this.ariaLabel || nothing}
        tabindex=${this._trailingFocused ? -1 : this.tabIndex}
        @click=${this.handlePrimaryClick}
        >${this.renderPrimaryContent()}</a
      >`;
    }

    if (this.removeOnly) {
      return html`<span class="content" title=${this.title || nothing}>
        ${this.renderPrimaryContent()}
      </span>`;
    }

    return html`<button
      class=${classMap({
        button: true,
        primary: true,
        action: true,
        disabled: this.disabled || this.softDisabled,
      })}
      part="base"
      type="button"
      title=${this.title || nothing}
      ?disabled=${this.disabled && !this.alwaysFocusable}
      aria-disabled=${
        this.softDisabled || (this.disabled && this.alwaysFocusable)
          ? "true"
          : nothing
      }
      aria-label=${this.ariaLabel || nothing}
      aria-pressed=${this.pressed ?? nothing}
      tabindex=${this._trailingFocused ? -1 : this.tabIndex}
      @click=${this.handlePrimaryClick}
    >
      ${this.renderPrimaryContent()}
    </button>`;
  }

  protected renderPrimaryContent() {
    return html`
      ${this.renderLeadingIcon()}
      <span class="label" id="label" part="label">
        ${this.label || html`<slot></slot>`}
      </span>
      <span class="icon" aria-hidden="true" ?hidden=${!this._hasTrailingIcon}>
        <slot name="trailing-icon" @slotchange=${this._iconChanged}></slot>
      </span>
    `;
  }

  protected renderLeadingIcon(): TemplateResult | typeof nothing {
    return html`<span class="icon leading" aria-hidden="true">
      <slot name="icon" @slotchange=${this._iconChanged}></slot>
    </span>`;
  }

  protected handlePrimaryClick(event: MouseEvent) {
    this._blockDisabledClick(event);
  }

  private _iconChanged(event: Event) {
    if (!(event.target instanceof HTMLSlotElement)) {
      return;
    }

    const hasIcon = event.target.assignedElements({ flatten: true }).length > 0;

    if (event.target.name === "icon") {
      this.hasIcon = hasIcon;
    } else {
      this._hasTrailingIcon = hasIcon;
    }
  }

  private _blockDisabledClick(event: MouseEvent) {
    if (
      this.softDisabled ||
      (this.disabled && (!this.href || this.alwaysFocusable))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  private _handleRemove(event: MouseEvent) {
    event.stopPropagation();

    if (this.disabled || this.softDisabled) {
      return;
    }

    if (
      !fireEvent(this, "remove", undefined, {
        bubbles: false,
        composed: false,
        cancelable: true,
      }).defaultPrevented
    ) {
      this.remove();
    }
  }

  private _handleRemoveFocus() {
    this._trailingFocused = true;
  }

  private _handleRemoveBlur() {
    this._trailingFocused = false;
  }

  private _handleKeyDown(event: KeyboardEvent) {
    if (
      (event.key !== "ArrowLeft" && event.key !== "ArrowRight") ||
      !this._primary ||
      !this._remove
    ) {
      return;
    }

    const forwards =
      (event.key === "ArrowRight") !==
      (getComputedStyle(this).direction === "rtl");

    if (
      (forwards && this.shadowRoot?.activeElement === this._primary) ||
      (!forwards && this.shadowRoot?.activeElement === this._remove)
    ) {
      event.preventDefault();
      event.stopPropagation();
      (forwards ? this._remove : this._primary).focus();
    }
  }

  static override get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        :host {
          display: inline-flex;
          max-width: 100%;
          vertical-align: middle;
          --ha-button-height: 32px;
          --ha-button-border-radius: var(--ha-border-radius-pill);
          --wa-font-weight-action: var(--ha-font-weight-normal);
          --wa-button-transform-hover: none;
          --wa-button-transform-active: none;
        }
        :host([variant]) {
          --wa-color-on-quiet: var(
            --ha-chip-label-color,
            var(--primary-text-color)
          );
          --wa-color-fill-quiet: color-mix(
            in srgb,
            var(--ha-chip-label-color, var(--primary-text-color)) 8%,
            transparent
          );
        }
        .container {
          display: flex;
          align-items: center;
          min-width: 0;
          max-width: 100%;
          height: var(--ha-button-height);
          position: relative;
          border-radius: var(--ha-button-border-radius);
        }
        .container::before,
        .container::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
        }
        .container::before {
          background: var(--ha-chip-container-color, transparent);
          opacity: var(--ha-chip-container-opacity, 1);
        }
        .container::after {
          border: var(--ha-chip-outline-width, 1px) solid
            var(--ha-chip-outline-color, var(--outline-color));
        }
        .button,
        .content {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--ha-chip-icon-label-space, var(--ha-space-2));
          min-width: 0;
          border: 0;
          border-radius: inherit;
          color: var(--ha-chip-label-color, var(--primary-text-color));
          background: transparent;
          font-family: var(--ha-font-family-body);
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          padding-inline: var(--ha-space-4);
          position: relative;
          box-shadow: none;
        }
        .button.primary,
        .content {
          flex: 1;
          height: var(--ha-button-height);
          min-height: var(--ha-button-height);
        }
        .label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
          font-size: var(--ha-chip-label-size, 0.875rem);
          font-weight: var(
            --ha-chip-label-weight,
            var(--ha-font-weight-normal)
          );
          line-height: var(--ha-chip-label-line-height, 1.25rem);
          color: var(--ha-chip-label-color, var(--primary-text-color));
        }
        .button.remove {
          flex: none;
          padding: 0;
          width: calc(var(--ha-chip-icon-size, 18px) + 2 * var(--ha-space-2));
          height: var(--ha-button-height);
          min-height: var(--ha-button-height);
          border-start-start-radius: 0;
          border-end-start-radius: 0;
        }
        .has-remove .primary,
        .has-remove .content {
          border-start-end-radius: 0;
          border-end-end-radius: 0;
          padding-inline-end: 0;
        }
        :host([has-icon]) .primary,
        :host([has-icon]) .content {
          padding-inline-start: var(--ha-space-2);
        }
        .button::after {
          content: "";
          position: absolute;
          inset: -8px 0;
        }
        slot:not([name]),
        slot[name="icon"],
        slot[name="trailing-icon"],
        slot[name="selected-icon"],
        slot[name="remove-trailing-icon"] {
          display: contents;
        }
        .icon {
          display: flex;
          flex: none;
          color: var(--ha-chip-label-color, var(--primary-text-color));
        }
        :host(:not([has-icon])) .leading {
          display: none;
        }
        .icon[hidden] {
          display: none;
        }
        ha-svg-icon,
        ::slotted([slot]) {
          flex: none;
          display: flex;
          --mdc-icon-size: var(--ha-chip-icon-size, 18px);
        }
        :host([disabled]),
        :host([soft-disabled]) {
          opacity: 1;
        }
        :host([disabled]) .label,
        :host([disabled]) .icon,
        :host([soft-disabled]) .label,
        :host([soft-disabled]) .icon {
          opacity: 0.38;
        }
        :host([disabled][selected]) .container::before,
        :host([soft-disabled][selected]) .container::before {
          background-color: var(--primary-text-color);
          opacity: 0.12;
        }
        :host([elevated]) .container {
          box-shadow: var(--ha-box-shadow-s);
        }
      `,
    ];
  }
}

declare global {
  interface HASSDomEvents {
    remove: undefined;
    "update-focus": undefined;
  }
}
