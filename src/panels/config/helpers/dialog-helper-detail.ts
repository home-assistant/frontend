import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-dialog";
import { HomeAssistant } from "../../../types";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { createInputBoolean } from "../../../data/input_boolean";
import { createInputText } from "../../../data/input_text";
import { createInputNumber } from "../../../data/input_number";
import { createInputDateTime } from "../../../data/input_datetime";
import { createInputSelect } from "../../../data/input_select";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { Helper } from "./const";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-tooltip/paper-tooltip";
import "./forms/ha-input_boolean-form";
import "./forms/ha-input_text-form";
import "./forms/ha-input_datetime-form";
import "./forms/ha-input_select-form";
import "./forms/ha-input_number-form";
import { domainIcon } from "../../../common/entity/domain_icon";
import { classMap } from "lit-html/directives/class-map";
import { haStyleDialog } from "../../../resources/styles";

const HELPERS = {
  input_boolean: createInputBoolean,
  input_text: createInputText,
  input_number: createInputNumber,
  input_datetime: createInputDateTime,
  input_select: createInputSelect,
};

@customElement("dialog-helper-detail")
export class DialogHelperDetail extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _item?: Helper;
  @property() private _opened = false;
  @property() private _platform?: string;
  @property() private _error?: string;
  @property() private _submitting = false;

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
                  ? html`
                      <div class="error">${this._error}</div>
                    `
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
                Back
              </mwc-button>
            `
          : html`
              ${Object.keys(HELPERS).map((platform: string) => {
                const isLoaded = isComponentLoaded(this.hass, platform);
                return html`
                  <div>
                    <paper-icon-item
                      .disabled=${!isLoaded}
                      @click=${this._platformPicked}
                      .platform=${platform}
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
                          <paper-tooltip
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

  private _platformPicked(ev: Event): void {
    this._platform = (ev.currentTarget! as any).platform;
  }

  private _goBack() {
    this._platform = undefined;
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
