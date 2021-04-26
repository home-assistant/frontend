import "@material/mwc-button/mwc-button";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { domainIcon } from "../../../common/entity/domain_icon";
import "../../../components/ha-dialog";
import { createCounter } from "../../../data/counter";
import { createInputBoolean } from "../../../data/input_boolean";
import { createInputDateTime } from "../../../data/input_datetime";
import { createInputNumber } from "../../../data/input_number";
import { createInputSelect } from "../../../data/input_select";
import { createInputText } from "../../../data/input_text";
import { createTimer } from "../../../data/timer";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { Helper } from "./const";
import "./forms/ha-counter-form";
import "./forms/ha-input_boolean-form";
import "./forms/ha-input_datetime-form";
import "./forms/ha-input_number-form";
import "./forms/ha-input_select-form";
import "./forms/ha-input_text-form";
import "./forms/ha-timer-form";

const HELPERS = {
  input_boolean: createInputBoolean,
  input_text: createInputText,
  input_number: createInputNumber,
  input_datetime: createInputDateTime,
  input_select: createInputSelect,
  counter: createCounter,
  timer: createTimer,
};

@customElement("dialog-helper-detail")
export class DialogHelperDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _item?: Helper;

  @internalProperty() private _opened = false;

  @internalProperty() private _platform?: string;

  @internalProperty() private _error?: string;

  @internalProperty() private _submitting = false;

  @query(".form") private _form?: HTMLDivElement;

  public async showDialog(): Promise<void> {
    this._platform = undefined;
    this._item = undefined;
    this._opened = true;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._opened = false;
    this._error = "";
  }

  protected render(): TemplateResult {
    return html`
      <ha-dialog
        .open=${this._opened}
        @closing=${this.closeDialog}
        class=${classMap({ "button-left": !this._platform })}
        scrimClickAction
        escapeKeyAction
        .heading=${this._platform
          ? this.hass.localize(
              "ui.panel.config.helpers.dialog.add_platform",
              "platform",
              this.hass.localize(
                `ui.panel.config.helpers.types.${this._platform}`
              ) || this._platform
            )
          : this.hass.localize("ui.panel.config.helpers.dialog.add_helper")}
      >
        ${this._platform
          ? html`
              <div class="form" @value-changed=${this._valueChanged}>
                ${this._error
                  ? html` <div class="error">${this._error}</div> `
                  : ""}
                ${dynamicElement(`ha-${this._platform}-form`, {
                  hass: this.hass,
                  item: this._item,
                  new: true,
                })}
              </div>
              <mwc-button
                slot="primaryAction"
                @click="${this._createItem}"
                .disabled=${this._submitting}
              >
                ${this.hass!.localize("ui.panel.config.helpers.dialog.create")}
              </mwc-button>
              <mwc-button
                slot="secondaryAction"
                @click="${this._goBack}"
                .disabled=${this._submitting}
              >
                ${this.hass!.localize("ui.common.back")}
              </mwc-button>
            `
          : html`
              ${Object.keys(HELPERS).map((platform: string) => {
                const isLoaded = isComponentLoaded(this.hass, platform);
                return html`
                  <div class="form">
                    <paper-icon-item
                      .disabled=${!isLoaded}
                      @click=${this._platformPicked}
                      @keydown=${this._handleEnter}
                      .platform=${platform}
                      dialogInitialFocus
                    >
                      <ha-icon
                        slot="item-icon"
                        .icon=${domainIcon(platform)}
                      ></ha-icon>
                      <span class="item-text">
                        ${this.hass.localize(
                          `ui.panel.config.helpers.types.${platform}`
                        ) || platform}
                      </span>
                    </paper-icon-item>
                    ${!isLoaded
                      ? html`
                          <paper-tooltip animation-delay="0"
                            >${this.hass.localize(
                              "ui.dialogs.helper_settings.platform_not_loaded",
                              "platform",
                              platform
                            )}</paper-tooltip
                          >
                        `
                      : ""}
                  </div>
                `;
              })}
              <mwc-button slot="primaryAction" @click="${this.closeDialog}">
                ${this.hass!.localize("ui.common.cancel")}
              </mwc-button>
            `}
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    this._item = ev.detail.value;
  }

  private async _createItem(): Promise<void> {
    if (!this._platform || !this._item) {
      return;
    }
    this._submitting = true;
    this._error = "";
    try {
      await HELPERS[this._platform](this.hass, this._item);
      this.closeDialog();
    } catch (err) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private _handleEnter(ev: KeyboardEvent) {
    if (ev.keyCode !== 13) {
      return;
    }
    ev.stopPropagation();
    ev.preventDefault();
    this._platformPicked(ev);
  }

  private _platformPicked(ev: Event): void {
    this._platform = (ev.currentTarget! as any).platform;
    this._focusForm();
  }

  private async _focusForm(): Promise<void> {
    await this.updateComplete;
    (this._form?.lastElementChild as HTMLElement).focus();
  }

  private _goBack() {
    this._platform = undefined;
    this._item = undefined;
    this._error = undefined;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-dialog.button-left {
          --justify-action-buttons: flex-start;
        }
        paper-icon-item {
          cursor: pointer;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-helper-detail": DialogHelperDetail;
  }
}
