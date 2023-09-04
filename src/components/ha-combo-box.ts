import { mdiClose, mdiMenuDown, mdiMenuUp } from "@mdi/js";
import { ComboBoxLitRenderer, comboBoxRenderer } from "@vaadin/combo-box/lit";
import "@vaadin/combo-box/theme/material/vaadin-combo-box-light";
import type {
  ComboBoxDataProvider,
  ComboBoxLight,
  ComboBoxLightFilterChangedEvent,
  ComboBoxLightOpenedChangedEvent,
  ComboBoxLightValueChangedEvent,
} from "@vaadin/combo-box/vaadin-combo-box-light";
import { registerStyles } from "@vaadin/vaadin-themable-mixin/register-styles";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant } from "../types";
import "./ha-icon-button";
import "./ha-list-item";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";

registerStyles(
  "vaadin-combo-box-item",
  css`
    :host {
      padding: 0 !important;
    }
    :host([focused]:not([disabled])) {
      background-color: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.12);
    }
    :host([selected]:not([disabled])) {
      background-color: transparent;
      color: var(--mdc-theme-primary);
      --mdc-ripple-color: var(--mdc-theme-primary);
      --mdc-theme-text-primary-on-background: var(--mdc-theme-primary);
    }
    :host([selected]:not([disabled])):before {
      background-color: var(--mdc-theme-primary);
      opacity: 0.12;
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    :host([selected][focused]:not([disabled])):before {
      opacity: 0.24;
    }
    :host(:hover:not([disabled])) {
      background-color: transparent;
    }
    [part="content"] {
      width: 100%;
    }
    [part="checkmark"] {
      display: none;
    }
  `
);

@customElement("ha-combo-box")
export class HaComboBox extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public placeholder?: string;

  @property() public validationMessage?: string;

  @property() public helper?: string;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  @property({ type: Boolean }) public invalid = false;

  @property({ type: Boolean }) public icon = false;

  @property({ attribute: false }) public items?: any[];

  @property({ attribute: false }) public filteredItems?: any[];

  @property({ attribute: false })
  public dataProvider?: ComboBoxDataProvider<any>;

  @property({ attribute: "allow-custom-value", type: Boolean })
  public allowCustomValue = false;

  @property({ attribute: "item-value-path" }) public itemValuePath = "value";

  @property({ attribute: "item-label-path" }) public itemLabelPath = "label";

  @property({ attribute: "item-id-path" }) public itemIdPath?: string;

  @property() public renderer?: ComboBoxLitRenderer<any>;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, reflect: true, attribute: "opened" })
  public opened?: boolean;

  @query("vaadin-combo-box-light", true) private _comboBox!: ComboBoxLight;

  @query("ha-textfield", true) private _inputElement!: HaTextField;

  private _overlayMutationObserver?: MutationObserver;

  private _bodyMutationObserver?: MutationObserver;

  public async open() {
    await this.updateComplete;
    this._comboBox?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this._inputElement?.updateComplete;
    this._inputElement?.focus();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this._overlayMutationObserver) {
      this._overlayMutationObserver.disconnect();
      this._overlayMutationObserver = undefined;
    }
    if (this._bodyMutationObserver) {
      this._bodyMutationObserver.disconnect();
      this._bodyMutationObserver = undefined;
    }
  }

  public get selectedItem() {
    return this._comboBox.selectedItem;
  }

  public setInputValue(value: string) {
    this._comboBox.value = value;
  }

  protected render(): TemplateResult {
    return html`
      <vaadin-combo-box-light
        .itemValuePath=${this.itemValuePath}
        .itemIdPath=${this.itemIdPath}
        .itemLabelPath=${this.itemLabelPath}
        .items=${this.items}
        .value=${this.value || ""}
        .filteredItems=${this.filteredItems}
        .dataProvider=${this.dataProvider}
        .allowCustomValue=${this.allowCustomValue}
        .disabled=${this.disabled}
        .required=${this.required}
        ${comboBoxRenderer(this.renderer || this._defaultRowRenderer)}
        @opened-changed=${this._openedChanged}
        @filter-changed=${this._filterChanged}
        @value-changed=${this._valueChanged}
        attr-for-value="value"
      >
        <ha-textfield
          label=${ifDefined(this.label)}
          placeholder=${ifDefined(this.placeholder)}
          ?disabled=${this.disabled}
          ?required=${this.required}
          validationMessage=${ifDefined(this.validationMessage)}
          .errorMessage=${this.errorMessage}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          input-spellcheck="false"
          .suffix=${html`<div
            style="width: 28px;"
            role="none presentation"
          ></div>`}
          .icon=${this.icon}
          .invalid=${this.invalid}
          helper=${ifDefined(this.helper)}
          helperPersistent
        >
          <slot name="icon" slot="leadingIcon"></slot>
        </ha-textfield>
        ${this.value
          ? html`<ha-svg-icon
              role="button"
              tabindex="-1"
              aria-label=${ifDefined(this.hass?.localize("ui.common.clear"))}
              class="clear-button"
              .path=${mdiClose}
              @click=${this._clearValue}
            ></ha-svg-icon>`
          : ""}
        <ha-svg-icon
          role="button"
          tabindex="-1"
          aria-label=${ifDefined(this.label)}
          aria-expanded=${this.opened ? "true" : "false"}
          class="toggle-button"
          .path=${this.opened ? mdiMenuUp : mdiMenuDown}
          @click=${this._toggleOpen}
        ></ha-svg-icon>
      </vaadin-combo-box-light>
    `;
  }

  private _defaultRowRenderer: ComboBoxLitRenderer<
    string | Record<string, any>
  > = (item) =>
    html`<ha-list-item>
      ${this.itemLabelPath ? item[this.itemLabelPath] : item}
    </ha-list-item>`;

  private _clearValue(ev: Event) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: undefined });
  }

  private _toggleOpen(ev: Event) {
    if (this.opened) {
      this._comboBox?.close();
      ev.stopPropagation();
    } else {
      this._comboBox?.inputElement.focus();
    }
  }

  private _openedChanged(ev: ComboBoxLightOpenedChangedEvent) {
    ev.stopPropagation();
    const opened = ev.detail.value;
    // delay this so we can handle click event for toggle button before setting _opened
    setTimeout(() => {
      this.opened = opened;
    }, 0);
    fireEvent(this, "opened-changed", { value: ev.detail.value });

    if (opened) {
      const overlay = document.querySelector<HTMLElement>(
        "vaadin-combo-box-overlay"
      );

      if (overlay) {
        this._removeInert(overlay);
      }
      this._observeBody();
    } else {
      this._bodyMutationObserver?.disconnect();
      this._bodyMutationObserver = undefined;
    }
  }

  private _observeBody() {
    if ("MutationObserver" in window && !this._bodyMutationObserver) {
      this._bodyMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === "VAADIN-COMBO-BOX-OVERLAY") {
              this._removeInert(node as HTMLElement);
            }
          });
          mutation.removedNodes.forEach((node) => {
            if (node.nodeName === "VAADIN-COMBO-BOX-OVERLAY") {
              this._overlayMutationObserver?.disconnect();
              this._overlayMutationObserver = undefined;
            }
          });
        });
      });

      this._bodyMutationObserver.observe(document.body, {
        childList: true,
      });
    }
  }

  private _removeInert(overlay: HTMLElement) {
    if (overlay.inert) {
      overlay.inert = false;
      this._overlayMutationObserver?.disconnect();
      this._overlayMutationObserver = undefined;
      return;
    }
    if ("MutationObserver" in window && !this._overlayMutationObserver) {
      this._overlayMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === "inert") {
            const target = mutation.target as HTMLElement;
            if (target.inert) {
              this._overlayMutationObserver?.disconnect();
              this._overlayMutationObserver = undefined;
              target.inert = false;
            }
          }
        });
      });

      this._overlayMutationObserver.observe(overlay, {
        attributes: true,
      });
    }
  }

  private _filterChanged(ev: ComboBoxLightFilterChangedEvent) {
    ev.stopPropagation();
    fireEvent(this, "filter-changed", { value: ev.detail.value });
  }

  private _valueChanged(ev: ComboBoxLightValueChangedEvent) {
    ev.stopPropagation();
    if (!this.allowCustomValue) {
      // @ts-ignore
      this._comboBox._closeOnBlurIsPrevented = true;
    }
    const newValue = ev.detail.value;

    if (newValue !== this.value) {
      fireEvent(this, "value-changed", { value: newValue || undefined });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        width: 100%;
      }
      vaadin-combo-box-light {
        position: relative;
        --vaadin-combo-box-overlay-max-height: calc(45vh - 56px);
      }
      ha-textfield {
        width: 100%;
      }
      ha-textfield > ha-icon-button {
        --mdc-icon-button-size: 24px;
        padding: 2px;
        color: var(--secondary-text-color);
      }
      ha-svg-icon {
        color: var(--input-dropdown-icon-color);
        position: absolute;
        cursor: pointer;
      }
      .toggle-button {
        right: 12px;
        top: -10px;
        inset-inline-start: initial;
        inset-inline-end: 12px;
        direction: var(--direction);
      }
      :host([opened]) .toggle-button {
        color: var(--primary-color);
      }
      .clear-button {
        --mdc-icon-size: 20px;
        top: -7px;
        right: 36px;
        inset-inline-start: initial;
        inset-inline-end: 36px;
        direction: var(--direction);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-combo-box": HaComboBox;
  }
}

declare global {
  interface HASSDomEvents {
    "filter-changed": { value: string };
    "opened-changed": { value: boolean };
  }
}
