import { mdiAlertOutline } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { stringCompare } from "../../../common/string/compare";
import "../../../components/ha-list";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-list-item";
import "../../../components/ha-spinner";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import "../../../components/ha-wa-dialog";
import "../../../components/search-input";
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
  type IntegrationManifest,
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
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";

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

  @state() private _open = false;

  @state() private _domain?: string;

  @state() private _error?: string;

  @state() private _submitting = false;

  @state() private _helperFlows?: string[];

  @state() private _loading = false;

  @state() private _filter?: string;

  private _pendingConfigFlow?: {
    startFlowHandler: string;
    manifest: IntegrationManifest;
    dialogClosedCallback?: ShowDialogHelperDetailParams["dialogClosedCallback"];
  };

  private _params?: ShowDialogHelperDetailParams;

  public async showDialog(params: ShowDialogHelperDetailParams): Promise<void> {
    this._params = params;
    this._domain = params.domain;
    this._item = undefined;
    if (this._domain && this._domain in HELPERS) {
      await HELPERS[this._domain].import();
    }
    this._open = true;
    await this.updateComplete;
    this.hass.loadFragmentTranslation("config");
    const flows = await getConfigFlowHandlers(this.hass, ["helper"]);
    await this.hass.loadBackendTranslation("title", flows, true);
    // Ensure the titles are loaded before we render the flows.
    this._helperFlows = flows;

    await this.updateComplete;
    await this._focusSearchInput();
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._error = undefined;
    this._domain = undefined;
    this._params = undefined;
    this._filter = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });

    if (this._pendingConfigFlow) {
      const pendingConfigFlow = this._pendingConfigFlow;
      this._pendingConfigFlow = undefined;
      showConfigFlowDialog(this, {
        startFlowHandler: pendingConfigFlow.startFlowHandler,
        manifest: pendingConfigFlow.manifest,
        dialogClosedCallback: pendingConfigFlow.dialogClosedCallback,
      });
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    let content: TemplateResult;
    let footer: TemplateResult | typeof nothing = nothing;

    if (this._domain) {
      content = html`
        <div class="form" @value-changed=${this._valueChanged}>
          ${this._error ? html`<div class="error">${this._error}</div>` : ""}
          ${dynamicElement(`ha-${this._domain}-form`, {
            hass: this.hass,
            item: this._item,
            new: true,
            autofocus: true,
          })}
        </div>
      `;
      footer = html`
        <ha-dialog-footer slot="footer">
          ${this._params?.domain
            ? nothing
            : html`<ha-button
                slot="secondaryAction"
                appearance="plain"
                @click=${this._goBack}
                .disabled=${this._submitting}
              >
                ${this.hass!.localize("ui.common.back")}
              </ha-button>`}
          <ha-button
            slot="primaryAction"
            @click=${this._createItem}
            .disabled=${this._submitting}
          >
            ${this.hass!.localize("ui.panel.config.helpers.dialog.create")}
          </ha-button>
        </ha-dialog-footer>
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
          autofocus
          .hass=${this.hass}
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
        >
          ${items.map(([domain, label]) => {
            // Only OG helpers need to be loaded prior adding one
            const isLoaded =
              !(domain in HELPERS) || isComponentLoaded(this.hass, domain);
            return html`
              <ha-list-item
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
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                />
                <span class="item-text"> ${label} </span>
                ${isLoaded
                  ? html`<ha-icon-next slot="meta"></ha-icon-next>`
                  : html`<ha-svg-icon
                        slot="meta"
                        .id="icon-${domain}"
                        path=${mdiAlertOutline}
                        @click=${stopPropagation}
                      ></ha-svg-icon>
                      <ha-tooltip .for="icon-${domain}">
                        ${this.hass.localize(
                          "ui.dialogs.helper_settings.platform_not_loaded",
                          { platform: domain }
                        )}
                      </ha-tooltip>`}
              </ha-list-item>
            `;
          })}
        </ha-list>
      `;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this._domain
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
          : this.hass.localize("ui.panel.config.helpers.dialog.create_helper")}
        @closed=${this._dialogClosed}
      >
        ${content} ${footer}
      </ha-wa-dialog>
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
    const isLoaded =
      !(domain in HELPERS) || isComponentLoaded(this.hass, domain);
    if (!isLoaded) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.dialogs.helper_settings.platform_not_loaded",
          { platform: domain }
        ),
      });
      return;
    }

    if (domain in HELPERS) {
      this._loading = true;
      try {
        await HELPERS[domain].import();
        this._domain = domain;
      } finally {
        this._loading = false;
      }
    } else {
      this._pendingConfigFlow = {
        startFlowHandler: domain,
        manifest: await fetchIntegrationManifest(this.hass, domain),
        dialogClosedCallback: this._params?.dialogClosedCallback,
      };
      this.closeDialog();
    }
  }

  private async _goBack() {
    this._domain = undefined;
    this._item = undefined;
    this._error = undefined;
    await this.updateComplete;
    await this._focusSearchInput();
  }

  private async _focusSearchInput() {
    const searchInput = this.shadowRoot?.querySelector("search-input") as
      | (HTMLElement & { updateComplete?: Promise<unknown> })
      | null;

    if (!searchInput) {
      return;
    }

    await searchInput.updateComplete;
    searchInput.focus();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      haStyleDialog,
      css`
        ha-wa-dialog {
          --dialog-content-padding: 0;
        }
        ha-icon-next {
          width: var(--ha-space-6);
        }
        ha-tooltip {
          pointer-events: auto;
        }
        .form {
          padding: var(--ha-space-6);
        }
        search-input {
          display: block;
          margin: 0 var(--ha-space-4) 0;
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
