import "@material/mwc-button/mwc-button";
import { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item-base";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import "../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-list-item";
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
import { Helper, HelperDomain } from "./const";
import type { ShowDialogHelperDetailParams } from "./show-dialog-helper-detail";

type HelperCreators = {
  [domain in HelperDomain]: {
    create: (
      hass: HomeAssistant,
      // Not properly typed because there is currently a mismatch for this._item between:
      // 1. Type passed to form should be Helper
      // 2. Type received by creator should be MutableParams version
      // The two are not compatible.
      params: any
    ) => Promise<Helper>;
    import: () => Promise<unknown>;
  };
};

const HELPERS: HelperCreators = {
  input_boolean: {
    create: createInputBoolean,
    import: () => import("./forms/ha-input_boolean-form"),
  },
  input_button: {
    create: createInputButton,
    import: () => import("./forms/ha-input_button-form"),
  },
  input_text: {
    create: createInputText,
    import: () => import("./forms/ha-input_text-form"),
  },
  input_number: {
    create: createInputNumber,
    import: () => import("./forms/ha-input_number-form"),
  },
  input_datetime: {
    create: createInputDateTime,
    import: () => import("./forms/ha-input_datetime-form"),
  },
  input_select: {
    create: createInputSelect,
    import: () => import("./forms/ha-input_select-form"),
  },
  counter: {
    create: createCounter,
    import: () => import("./forms/ha-counter-form"),
  },
  timer: {
    create: createTimer,
    import: () => import("./forms/ha-timer-form"),
  },
  schedule: {
    create: createSchedule,
    import: () => import("./forms/ha-schedule-form"),
  },
};

@customElement("dialog-helper-detail")
export class DialogHelperDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _item?: Helper;

  @state() private _opened = false;

  @state() private _domain?: HelperDomain;

  @state() private _error?: string;

  @state() private _submitting = false;

  @query(".form") private _form?: HTMLDivElement;

  @state() private _helperFlows?: string[];

  @state() private _loading = false;

  private _params?: ShowDialogHelperDetailParams;

  public async showDialog(params: ShowDialogHelperDetailParams): Promise<void> {
    this._params = params;
    this._domain = params.domain;
    this._item = undefined;
    this._opened = true;
    await this.updateComplete;
    Promise.all([
      getConfigFlowHandlers(this.hass, ["helper"]),
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

  protected render() {
    if (!this._opened) {
      return nothing;
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
    } else if (this._loading || this._helperFlows === undefined) {
      content = html`<ha-circular-progress active></ha-circular-progress>`;
    } else {
      const items: [string, string][] = [];

      for (const helper of Object.keys(HELPERS) as (keyof typeof HELPERS)[]) {
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
              <ha-list-item
                .disabled=${!isLoaded}
                hasmeta
                .domain=${domain}
                @request-selected=${this._domainPicked}
                graphic="icon"
              >
                <img
                  slot="graphic"
                  loading="lazy"
                  alt=""
                  src=${brandsUrl({
                    domain,
                    type: "icon",
                    useFallback: true,
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                />
                <span class="item-text"> ${label} </span>
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
              ${!isLoaded
                ? html`
                    <simple-tooltip animation-delay="0"
                      >${this.hass.localize(
                        "ui.dialogs.helper_settings.platform_not_loaded",
                        "platform",
                        domain
                      )}</simple-tooltip
                    >
                  `
                : ""}
            `;
          })}
        </mwc-list>
      `;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        class=${classMap({ "button-left": !this._domain })}
        scrimClickAction
        escapeKeyAction
        .hideActions=${!this._domain}
        .heading=${createCloseHeading(
          this.hass,
          this._domain
            ? this.hass.localize(
                "ui.panel.config.helpers.dialog.create_platform",
                "platform",
                this.hass.localize(
                  `ui.panel.config.helpers.types.${this._domain}`
                ) || this._domain
              )
            : this.hass.localize("ui.panel.config.helpers.dialog.create_helper")
        )}
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
      await HELPERS[this._domain].create(this.hass, this._item);
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _domainPicked(
    ev: CustomEvent<RequestSelectedDetail>
  ): Promise<void> {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const domain = (ev.currentTarget! as any).domain;

    if (domain in HELPERS) {
      this._loading = true;
      try {
        await HELPERS[domain].import();
        this._domain = domain;
      } finally {
        this._loading = false;
      }
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
        ha-dialog {
          --dialog-content-padding: 0;
          --dialog-scroll-divider-color: transparent;
          --mdc-dialog-max-height: 60vh;
        }
        @media all and (min-width: 550px) {
          ha-dialog {
            --mdc-dialog-min-width: 500px;
          }
        }
        ha-icon-next {
          width: 24px;
        }
        .form {
          padding: 24px;
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
