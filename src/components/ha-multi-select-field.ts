import { SelectBase } from "@material/mwc-select/mwc-select-base";
import { styles } from "@material/mwc-select/mwc-select.css";
import { mdiClose } from "@mdi/js";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { debounce } from "../common/util/debounce";
import { nextRender } from "../common/util/render-status";
import "./ha-icon-button";
import "./ha-menu";

@customElement("ha-multi-select-field")
export class HaMultiSelectField extends SelectBase {
  // @ts-ignore
  @property({ type: Boolean }) public icon = false;

  @property({ type: Boolean, reflect: true }) public clearable = false;

  @property({ attribute: "inline-arrow", type: Boolean })
  public inlineArrow = false;

  @property() public options;

  protected override render() {
    return html`
      ${super.render()}
      ${this.clearable && !this.required && !this.disabled && this.value
        ? html`<ha-icon-button
            label="clear"
            @click=${this._clearValue}
            .path=${mdiClose}
          ></ha-icon-button>`
        : nothing}
    `;
  }

  protected override renderMenu() {
    const classes = this.getMenuClasses();
    return html`<ha-menu
      innerRole="listbox"
      wrapFocus
      class=${classMap(classes)}
      activatable
      .fullwidth=${this.fixedMenuPosition ? false : !this.naturalMenuWidth}
      .open=${this.menuOpen}
      .anchor=${this.anchorElement}
      .fixed=${this.fixedMenuPosition}
      @selected=${this.onSelected}
      @opened=${this.onOpened}
      @closed=${this.onClosed}
      @items-updated=${this.onItemsUpdated}
      @keydown=${this.handleTypeahead}
    >
      ${this.renderMenuContent()}
    </ha-menu>`;
  }

  protected override renderLeadingIcon() {
    if (!this.icon) {
      return nothing;
    }

    return html`<span class="mdc-select__icon"
      ><slot name="icon"></slot
    ></span>`;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("translations-updated", this._translationsUpdated);
  }

  protected async firstUpdated() {
    super.firstUpdated();

    if (this.inlineArrow) {
      this.shadowRoot
        ?.querySelector(".mdc-select__selected-text-container")
        ?.classList.add("inline-arrow");
    }
  }

  protected updated(changedProperties) {
    super.updated(changedProperties);

    if (changedProperties.has("inlineArrow")) {
      const textContainerElement = this.shadowRoot?.querySelector(
        ".mdc-select__selected-text-container"
      );
      if (this.inlineArrow) {
        textContainerElement?.classList.add("inline-arrow");
      } else {
        textContainerElement?.classList.remove("inline-arrow");
      }
    }
    if (changedProperties.get("options")) {
      this.layoutOptions();
      this.selectByValue(this.value);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      "translations-updated",
      this._translationsUpdated
    );
  }

  private _clearValue(): void {
    if (this.disabled || !this.value) {
      return;
    }
    this.valueSetDirectly = true;
    this.select(-1);
    this.mdcFoundation.handleChange();
  }

  private _translationsUpdated = debounce(async () => {
    await nextRender();
    this.layoutOptions();
  }, 500);

  static override styles = [
    styles,
    css`
      :host([clearable]) {
        position: relative;
      }
      .mdc-select:not(.mdc-select--disabled) .mdc-select__icon {
        color: var(--secondary-text-color);
      }
      .mdc-select__anchor {
        width: var(--ha-select-min-width, 200px);
      }
      .mdc-select--filled .mdc-select__anchor {
        height: var(--ha-select-height, 56px);
      }
      .mdc-select--filled .mdc-floating-label {
        inset-inline-start: 12px;
        inset-inline-end: initial;
        direction: var(--direction);
      }
      .mdc-select--filled.mdc-select--with-leading-icon .mdc-floating-label {
        inset-inline-start: 48px;
        inset-inline-end: initial;
        direction: var(--direction);
      }
      .mdc-select .mdc-select__anchor {
        padding-inline-start: 12px;
        padding-inline-end: 0px;
        direction: var(--direction);
      }
      .mdc-select__anchor .mdc-floating-label--float-above {
        transform-origin: var(--float-start);
      }
      .mdc-select__selected-text-container {
        padding-inline-end: var(--select-selected-text-padding-end, 0px);
      }
      :host([clearable]) .mdc-select__selected-text-container {
        padding-inline-end: var(--select-selected-text-padding-end, 12px);
      }
      ha-icon-button {
        position: absolute;
        top: 10px;
        right: 28px;
        --mdc-icon-button-size: 36px;
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        inset-inline-start: initial;
        inset-inline-end: 28px;
        direction: var(--direction);
      }
      .inline-arrow {
        flex-grow: 0;
      }
    `,
  ];
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-multi-select-field": HaMultiSelectField;
  }
}
