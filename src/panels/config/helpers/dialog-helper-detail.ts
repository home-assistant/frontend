import { mdiAlertOutline } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { stringCompare } from "../../../common/string/compare";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-list";
import "../../../components/ha-button";
import "../../../components/ha-list-item";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import { getConfigFlowHandlers } from "../../../data/config_flow";
import { createCounter } from "../../../data/counter";
import { createInputBoolean } from "../../../data/input_boolean";
import { createInputButton } from "../../../data/input_button";
import { createInputDateTime } from "../../../data/input_datetime";
import { createInputNumber } from "../../../data/input_number";
import { createInputSelect } from "../../../data/input_select";
import { createInputText } from "../../../data/input_text";
import {
  domainToName,
  fetchIntegrationManifest,
} from "../../../data/integration";
import { createSchedule } from "../../../data/schedule";
import { createTimer } from "../../../data/timer";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { haStyleDialog, haStyleScrollbar } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import type { Helper, HelperDomain } from "./const";
import { isHelperDomain } from "./const";
import type { ShowDialogHelperDetailParams } from "./show-dialog-helper-detail";

type HelperCreators = Record<
  HelperDomain,
  {
    create: (
      hass: HomeAssistant,
      // Not properly typed because there is currently a mismatch for this._item between:
      // 1. Type passed to form should be Helper
      // 2. Type received by creator should be MutableParams version
      // The two are not compatible.
      params: any
    ) => Promise<Helper>;
    import: () => Promise<unknown>;
    alias?: string[];
  }
>;

const HELPERS: HelperCreators = {
  input_boolean: {
    create: createInputBoolean,
    import: () => import("./forms/ha-input_boolean-form"),
    alias: ["switch", "toggle"],
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
    alias: ["select", "dropdown"],
  },
  counter: {
    create: createCounter,
    import: () => import("./forms/ha-counter-form"),
  },
  timer: {
    create: createTimer,
    import: () => import("./forms/ha-timer-form"),
    alias: ["countdown"],
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

  @state() private _domain?: string;

  @state() private _error?: string;

  @state() private _submitting = false;

  @query(".form") private _form?: HTMLDivElement;

  @state() private _helperFlows?: string[];

  @state() private _loading = false;

  @state() private _filter?: string;

  private _params?: ShowDialogHelperDetailParams;

  public async showDialog(params: ShowDialogHelperDetailParams): Promise<void> {
    this._params = params;
    this._domain = params.domain;
    this._item = undefined;
    if (this._domain && this._domain in HELPERS) {
      await HELPERS[this._domain].import();
    }
    this._opened = true;
    await this.updateComplete;
    this.hass.loadFragmentTranslation("config");
    const flows = await getConfigFlowHandlers(this.hass, ["helper"]);
    await this.hass.loadBackendTranslation("title", flows, true);
    // Ensure the titles are loaded before we render the flows.
    this._helperFlows = flows;
  }

  public closeDialog(): void {
    this._opened = false;
    this._error = undefined;
    this._domain = undefined;
    this._params = undefined;
    this._filter = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }
    let content: TemplateResult;

    if (this._domain) {
      content = html`
        <div class="form" @value-changed=${this._valueChanged}>
          ${this._error ? html`<div class="error">${this._error}</div>` : ""}
          ${dynamicElement(`ha-${this._domain}-form`, {
            hass: this.hass,
            item: this._item,
            new: true,
          })}
        </div>
        <ha-button
          slot="primaryAction"
          @click=${this._createItem}
          .disabled=${this._submitting}
        >
          ${this.hass!.localize("ui.panel.config.helpers.dialog.create")}
        </ha-button>
        ${this._params?.domain
          ? nothing
          : html`<ha-button
              appearance="plain"
              slot="secondaryAction"
              @click=${this._goBack}
              .disabled=${this._submitting}
            >
              ${this.hass!.localize("ui.common.back")}
            </ha-button>`}
      `;
    } else if (this._loading || this._helperFlows === undefined) {
      content = html`<ha-spinner></ha-spinner>`;
    } else {
      const items = this._filterHelpers(
        HELPERS,
        this._helperFlows,
        this._filter
      );

      content = html`
        <search-input
          .hass=${this.hass}
          dialogInitialFocus="true"
          .filter=${this._filter}
          @value-changed=${this._filterChanged}
          .label=${this.hass.localize(
            "ui.panel.config.integrations.search_helper"
          )}
        ></search-input>
        <ha-list
          class="ha-scrollbar"
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
                ${isLoaded
                  ? html`<ha-icon-next slot="meta"></ha-icon-next>`
                  : html`<ha-tooltip
                      hoist
                      slot="meta"
                      .content=${this.hass.localize(
                        "ui.dialogs.helper_settings.platform_not_loaded",
                        { platform: domain }
                      )}
                      @click=${stopPropagation}
                    >
                      <ha-svg-icon path=${mdiAlertOutline}></ha-svg-icon>
                    </ha-tooltip>`}
              </ha-list-item>
            `;
          })}
        </ha-list>
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
                {
                  platform:
                    (isHelperDomain(this._domain) &&
                      this.hass.localize(
                        `ui.panel.config.helpers.types.${
                          this._domain as HelperDomain
                        }`
                      )) ||
                    this._domain,
                }
              )
            : this.hass.localize("ui.panel.config.helpers.dialog.create_helper")
        )}
      >
        ${content}
      </ha-dialog>
    `;
  }

  private _filterHelpers = memoizeOne(
    (
      predefinedHelpers: HelperCreators,
      flowHelpers?: string[],
      filter?: string
    ) => {
      const items: [string, string][] = [];

      for (const helper of Object.keys(
        predefinedHelpers
      ) as (keyof typeof predefinedHelpers)[]) {
        items.push([
          helper,
          this.hass.localize(`ui.panel.config.helpers.types.${helper}`) ||
            helper,
        ]);
      }

      if (flowHelpers) {
        for (const domain of flowHelpers) {
          items.push([domain, domainToName(this.hass.localize, domain)]);
        }
      }

      return items
        .filter(([domain, label]) => {
          if (filter) {
            const lowerFilter = filter.toLowerCase();
            return (
              label.toLowerCase().includes(lowerFilter) ||
              domain.toLowerCase().includes(lowerFilter) ||
              (predefinedHelpers[domain as HelperDomain]?.alias || []).some(
                (alias) => alias.toLowerCase().includes(lowerFilter)
              )
            );
          }
          return true;
        })
        .sort((a, b) => stringCompare(a[1], b[1], this.hass.locale.language));
    }
  );

  private async _filterChanged(e) {
    this._filter = e.detail.value;
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
      const createdEntity = await HELPERS[this._domain].create(
        this.hass,
        this._item
      );
      if (this._params?.dialogClosedCallback && createdEntity.id) {
        this._params.dialogClosedCallback({
          flowFinished: true,
          entityId: `${this._domain}.${createdEntity.id}`,
        });
      }
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _domainPicked(ev): Promise<void> {
    const domain = ev.target.closest("ha-list-item").domain;

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
        manifest: await fetchIntegrationManifest(this.hass, domain),
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
      haStyleScrollbar,
      haStyleDialog,
      css`
        ha-dialog.button-left {
          --justify-action-buttons: flex-start;
        }
        ha-dialog {
          --dialog-content-padding: 0;
          --dialog-scroll-divider-color: transparent;
          --mdc-dialog-max-height: 90vh;
        }
        @media all and (min-width: 550px) {
          ha-dialog {
            --mdc-dialog-min-width: 500px;
          }
        }
        ha-icon-next {
          width: 24px;
        }
        ha-tooltip {
          pointer-events: auto;
        }
        .form {
          padding: 24px;
        }
        search-input {
          display: block;
          margin: 16px 16px 0;
        }
        ha-list {
          height: calc(60vh - 184px);
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-list {
            height: calc(
              100vh -
                184px - var(--safe-area-inset-top, 0px) - var(
                  --safe-area-inset-bottom,
                  0px
                )
            );
          }
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
