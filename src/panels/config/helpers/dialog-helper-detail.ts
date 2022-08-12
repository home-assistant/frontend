import "@material/mwc-button/mwc-button";
import { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item-base";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-tooltip/paper-tooltip";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import "../../../components/ha-circular-progress";
import "../../../components/ha-dialog";
import { getConfigFlowHandlers } from "../../../data/config_flow";
import { createCounter } from "../../../data/counter";
import { createInputBoolean } from "../../../data/input_boolean";
import { createInputButton } from "../../../data/input_button";
import { createInputDateTime } from "../../../data/input_datetime";
import { createInputNumber } from "../../../data/input_number";
import { createInputSelect } from "../../../data/input_select";
import { createInputText } from "../../../data/input_text";
import { domainToName } from "../../../data/integration";
import { createSchedule } from "../../../data/schedule";
import { createTimer } from "../../../data/timer";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { Helper } from "./const";
import "./forms/ha-counter-form";
import "./forms/ha-input_boolean-form";
import "./forms/ha-input_button-form";
import "./forms/ha-input_datetime-form";
import "./forms/ha-input_number-form";
import "./forms/ha-input_select-form";
import "./forms/ha-input_text-form";
import "./forms/ha-schedule-form";
import "./forms/ha-timer-form";
import type { ShowDialogHelperDetailParams } from "./show-dialog-helper-detail";

const HELPERS = {
  input_boolean: createInputBoolean,
  input_button: createInputButton,
  input_text: createInputText,
  input_number: createInputNumber,
  input_datetime: createInputDateTime,
  input_select: createInputSelect,
  counter: createCounter,
  timer: createTimer,
  schedule: createSchedule,
};

@customElement("dialog-helper-detail")
export class DialogHelperDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _item?: Helper;

  @state() private _opened = false;

  @state() private _domain?: string;

  @state() private _error?: string;

  @state() private _submitting = false;

  @query(".form") private _form?: HTMLDivElement;

  @state() private _helperFlows?: string[];

  private _params?: ShowDialogHelperDetailParams;

  public async showDialog(params: ShowDialogHelperDetailParams): Promise<void> {
    this._params = params;
    this._domain = params.domain;
    this._item = undefined;
    this._opened = true;
    await this.updateComplete;
    Promise.all([
      getConfigFlowHandlers(this.hass, "helper"),
      // Ensure the titles are loaded before we render the flows.
      this.hass.loadBackendTranslation("title", undefined, true),
    ]).then(([flows]) => {
      this._helperFlows = flows;
    });
  }

  public closeDialog(): void {
    this._opened = false;
    this._error = undefined;
    this._domain = undefined;
    this._params = undefined;
  }

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }
    let content: TemplateResult;

    if (this._domain) {
      content = html`
        <div class="form" @value-changed=${this._valueChanged}>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          ${dynamicElement(`ha-${this._domain}-form`, {
            hass: this.hass,
            item: this._item,
            new: true,
          })}
        </div>
        <mwc-button
          slot="primaryAction"
          @click=${this._createItem}
          .disabled=${this._submitting}
        >
          ${this.hass!.localize("ui.panel.config.helpers.dialog.create")}
        </mwc-button>
        <mwc-button
          slot="secondaryAction"
          @click=${this._goBack}
          .disabled=${this._submitting}
        >
          ${this.hass!.localize("ui.common.back")}
        </mwc-button>
      `;
    } else if (this._helperFlows === undefined) {
      content = html`<ha-circular-progress active></ha-circular-progress>`;
    } else {
      const items: [string, string][] = [];

      for (const helper of Object.keys(HELPERS)) {
        items.push([
          helper,
          this.hass.localize(`ui.panel.config.helpers.types.${helper}`) ||
            helper,
        ]);
      }

      for (const domain of this._helperFlows) {
        items.push([domain, domainToName(this.hass.localize, domain)]);
      }

      items.sort((a, b) => a[1].localeCompare(b[1]));

      content = html`
        <mwc-list
          innerRole="listbox"
          itemRoles="option"
          innerAriaLabel=${this.hass.localize(
            "ui.panel.config.helpers.dialog.create_helper"
          )}
          rootTabbable
          dialogInitialFocus
        >
          ${items.map(([domain, label]) => {
            // Only OG helpers need to be loaded prior adding one
            const isLoaded =
              !(domain in HELPERS) || isComponentLoaded(this.hass, domain);
            return html`
              <mwc-list-item
                .disabled=${!isLoaded}
                .domain=${domain}
                @request-selected=${this._domainPicked}
                graphic="icon"
              >
                <img
                  slot="graphic"
                  loading="lazy"
                  src=${brandsUrl({
                    domain,
                    type: "icon",
                    useFallback: true,
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  aria-hidden="true"
                  referrerpolicy="no-referrer"
                />
                <span class="item-text"> ${label} </span>
              </mwc-list-item>
              ${!isLoaded
                ? html`
                    <paper-tooltip animation-delay="0"
                      >${this.hass.localize(
                        "ui.dialogs.helper_settings.platform_not_loaded",
                        "platform",
                        domain
                      )}</paper-tooltip
                    >
                  `
                : ""}
            `;
          })}
        </mwc-list>
        <mwc-button slot="primaryAction" @click=${this.closeDialog}>
          ${this.hass!.localize("ui.common.cancel")}
        </mwc-button>
      `;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        class=${classMap({ "button-left": !this._domain })}
        scrimClickAction
        escapeKeyAction
        .heading=${this._domain
          ? this.hass.localize(
              "ui.panel.config.helpers.dialog.create_platform",
              "platform",
              this.hass.localize(
                `ui.panel.config.helpers.types.${this._domain}`
              ) || this._domain
            )
          : this.hass.localize("ui.panel.config.helpers.dialog.create_helper")}
      >
        ${content}
      </ha-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    this._item = ev.detail.value;
  }

  private async _createItem(): Promise<void> {
    if (!this._domain || !this._item) {
      return;
    }
    this._submitting = true;
    this._error = "";
    try {
      await HELPERS[this._domain](this.hass, this._item);
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private _domainPicked(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const domain = (ev.currentTarget! as any).domain;

    if (domain in HELPERS) {
      this._domain = domain;
      this._focusForm();
    } else {
      showConfigFlowDialog(this, {
        startFlowHandler: domain,
        dialogClosedCallback: this._params!.dialogClosedCallback,
      });
      this.closeDialog();
    }
  }

  private async _focusForm(): Promise<void> {
    await this.updateComplete;
    (this._form?.lastElementChild as HTMLElement).focus();
  }

  private _goBack() {
    this._domain = undefined;
    this._item = undefined;
    this._error = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog.button-left {
          --justify-action-buttons: flex-start;
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
