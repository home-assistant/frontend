import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import Fuse from "fuse.js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { LocalizeFunc } from "../../../common/translations/localize";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/search-input";
import { fetchConfigFlowInProgress } from "../../../data/config_flow";
import { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import { domainToName } from "../../../data/integration";
import {
  getIntegrationDescriptions,
  Integrations,
} from "../../../data/integrations";
import {
  getSupportedBrands,
  SupportedBrandHandler,
} from "../../../data/supported_brands";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { haStyleScrollbar } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";
import "./ha-domain-integrations";
import "../../../components/ha-icon-button-prev";

interface ListItem {
  name: string;
  domain: string;
  config_flow?: boolean;
  is_helper?: boolean;
  integrations?: string[];
  iot_standards?: string[];
  supported_flows?: string[];
}

@customElement("dialog-add-integration")
class AddIntegrationDialog extends LitElement {
  public hass!: HomeAssistant;

  @state() private _integrations?: Integrations;

  @state() private _helpers?: Integrations;

  @state() private _supportedBrands?: Record<string, SupportedBrandHandler>;

  @state() private _initialFilter?: string;

  @state() private _filter?: string;

  @state() private _pickedBrand?: string;

  @state() private _flowsInProgress?: DataEntryFlowProgress[];

  private _width?: number;

  private _height?: number;

  public async showDialog(params): Promise<void> {
    this._initialFilter = params.initialFilter;
    const [descriptions, supportedBrands] = await Promise.all([
      getIntegrationDescriptions(this.hass),
      getSupportedBrands(this.hass),
    ]);
    this._integrations = {
      ...descriptions.core.integration,
      ...descriptions.custom.integration,
    };
    this._helpers = {
      ...descriptions.core.helper,
      ...descriptions.custom.helper,
    };
    this._supportedBrands = supportedBrands;
    this.hass.loadBackendTranslation(
      "title",
      descriptions.core.translated_name,
      true
    );
  }

  public closeDialog() {
    this._integrations = undefined;
    this._helpers = undefined;
    this._supportedBrands = undefined;
    this._pickedBrand = undefined;
    this._flowsInProgress = undefined;
    this._filter = undefined;
    this._width = undefined;
    this._height = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (this._filter === undefined && this._initialFilter !== undefined) {
      this._filter = this._initialFilter;
    }
    if (this._initialFilter !== undefined && this._filter === "") {
      this._initialFilter = undefined;
      this._filter = "";
      this._width = undefined;
      this._height = undefined;
    } else if (
      this.hasUpdated &&
      changedProps.has("_filter") &&
      (!this._width || !this._height)
    ) {
      // Store the width and height so that when we search, box doesn't jump
      const boundingRect =
        this.shadowRoot!.querySelector("mwc-list")?.getBoundingClientRect();
      this._width = boundingRect?.width;
      this._height = boundingRect?.height;
    }
  }

  private _filterIntegrations = memoizeOne(
    (
      i: Integrations,
      h: Integrations,
      sb: Record<string, SupportedBrandHandler>,
      localize: LocalizeFunc,
      filter?: string
    ): {
      integrations: ListItem[];
      helpers: ListItem[];
    } => {
      const integrations: ListItem[] = Object.entries(i).map(
        ([domain, integration]) => ({
          domain,
          name: integration.name || domainToName(localize, domain),
          config_flow: integration.config_flow,
          iot_standards: integration.iot_standards,
          integrations: integration.integrations
            ? Object.entries(integration.integrations).map(
                ([dom, val]) => val.name || domainToName(localize, dom)
              )
            : undefined,
        })
      );

      for (const [domain, domainBrands] of Object.entries(sb)) {
        for (const [slug, name] of Object.entries(domainBrands)) {
          integrations.push({
            domain: slug,
            name,
            supported_flows: [domain],
          });
        }
      }

      if (filter) {
        const options: Fuse.IFuseOptions<ListItem> = {
          keys: [
            "name",
            "domain",
            "supported_flows",
            "integrations",
            "iot_standards",
          ],
          isCaseSensitive: false,
          minMatchCharLength: 2,
          threshold: 0.2,
        };
        const helpers = Object.entries(h).map(([domain, integration]) => ({
          domain,
          name: integration.name || domainToName(localize, domain),
          config_flow: integration.config_flow,
          is_helper: true,
        }));
        return {
          integrations: new Fuse(integrations, options)
            .search(filter)
            .map((result) => result.item),
          helpers: new Fuse(helpers, options)
            .search(filter)
            .map((result) => result.item),
        };
      }
      return {
        integrations: integrations.sort((a, b) =>
          caseInsensitiveStringCompare(a.name || "", b.name || "")
        ),
        helpers: [],
      };
    }
  );

  private _getIntegrations() {
    return this._filterIntegrations(
      this._integrations!,
      this._helpers!,
      this._supportedBrands!,
      this.hass.localize,
      this._filter
    );
  }

  protected render(): TemplateResult {
    if (!this._integrations) {
      return html``;
    }

    const integrations = this._getIntegrations();

    return html`<ha-dialog
      open
      @closed=${this.closeDialog}
      scrimClickAction
      escapeKeyAction
      hideActions
      .heading=${createCloseHeading(
        this.hass,
        this._pickedBrand
          ? html`<ha-icon-button-prev
                @click=${this._prevClicked}
                style="--mdc-icon-button-size: 30px; color: var(--secondary-text-color);"
              ></ha-icon-button-prev>
              ${this._calculateBrandHeading()}`
          : this.hass.localize("ui.panel.config.integrations.new")
      )}
    >
      ${this._pickedBrand
        ? this._renderIntegration()
        : this._renderAll(integrations)}
    </ha-dialog>`;
  }

  private _calculateBrandHeading() {
    const brand = this._integrations?.[this._pickedBrand!];
    if (
      brand?.iot_standards &&
      !brand.integrations &&
      !this._flowsInProgress?.length
    ) {
      return "What type of device is it?";
    }
    if (
      !brand?.iot_standards &&
      !brand?.integrations &&
      this._flowsInProgress?.length
    ) {
      return "Want to add these discovered devices?";
    }
    return "What do you want to add?";
  }

  private _renderIntegration(): TemplateResult {
    return html`<ha-domain-integrations
      .hass=${this.hass}
      .domain=${this._pickedBrand}
      .integration=${this._integrations?.[this._pickedBrand!]}
      .flowsInProgress=${this._flowsInProgress}
      style=${styleMap({
        minWidth: `${this._width}px`,
        minHeight: `${this._height}px`,
      })}
      @close-dialog=${this.closeDialog}
    ></ha-domain-integrations>`;
  }

  private _renderAll(integrations): TemplateResult {
    return html`<search-input
        .hass=${this.hass}
        autofocus
        dialogInitialFocus
        .filter=${this._filter}
        @value-changed=${this._filterChanged}
        .label=${this.hass.localize("ui.panel.config.integrations.search")}
        @keypress=${this._maybeSubmit}
      ></search-input>
      <mwc-list
        style=${styleMap({
          width: `${this._width}px`,
          height: `${this._height}px`,
        })}
        class="ha-scrollbar"
        >${integrations.integrations.length
          ? integrations.integrations.map((integration) =>
              this._renderRow(integration)
            )
          : html`
              <p>
                ${this.hass.localize(
                  "ui.panel.config.integrations.note_about_integrations"
                )}<br />
                ${this.hass.localize(
                  "ui.panel.config.integrations.note_about_website_reference"
                )}<a
                  href=${documentationUrl(
                    this.hass,
                    `/integrations/${
                      this._filter ? `#search/${this._filter}` : ""
                    }`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  >${this.hass.localize(
                    "ui.panel.config.integrations.home_assistant_website"
                  )}</a
                >.
              </p>
            `}
        ${integrations.helpers.length
          ? html`
              <li divider padded class="divider" role="separator"></li>
              ${integrations.helpers.map((integration) =>
                this._renderRow(integration, true)
              )}
            `
          : ""}
      </mwc-list> `;
  }

  private _renderRow(integration: ListItem, is_helper = false) {
    return html`
      <mwc-list-item
        graphic="medium"
        .integration=${integration}
        @click=${this._integrationPicked}
      >
        <img
          slot="graphic"
          loading="lazy"
          src=${brandsUrl({
            domain: integration.domain,
            type: "icon",
            useFallback: true,
            darkOptimized: this.hass.themes?.darkMode,
          })}
          referrerpolicy="no-referrer"
        />
        <span
          >${integration.name ||
          domainToName(this.hass.localize, integration.domain)}
          ${is_helper ? " (helper)" : ""}</span
        >
      </mwc-list-item>
    `;
  }

  private async _filterChanged(e) {
    this._filter = e.detail.value;
  }

  private _integrationPicked(ev) {
    const integration: ListItem = ev.currentTarget.integration;
    this._handleIntegrationPicked(integration);
  }

  private async _handleIntegrationPicked(integration: ListItem) {
    if ("supported_flows" in integration) {
      const domain = integration.supported_flows![0];

      showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_flow.supported_brand_flow",
          {
            supported_brand: integration.name,
            flow_domain_name: domainToName(this.hass.localize, domain),
          }
        ),
        confirm: () => {
          this.closeDialog();
          if (["zha", "zwave_js"].includes(domain)) {
            // this._handleAddPicked(slug);
            return;
          }
          const supportIntegration = this._integrations?.[domain];
          if (supportIntegration) {
            this._handleIntegrationPicked({
              domain,
              name:
                supportIntegration.name ||
                domainToName(this.hass.localize, domain),
              iot_standards: supportIntegration.iot_standards,
              integrations: supportIntegration.integrations
                ? Object.entries(supportIntegration.integrations).map(
                    ([dom, val]) =>
                      val.name || domainToName(this.hass.localize, dom)
                  )
                : undefined,
            });
          } else {
            showAlertDialog(this, {
              text: "Integration not found",
              warning: true,
            });
          }
        },
      });

      return;
    }

    if (integration.is_helper) {
      this.closeDialog();
      navigate(`/config/helpers/add?domain=${integration.domain}`);
      return;
    }

    if (integration.integrations) {
      this._fetchFlowsInProgress(Object.keys(integration.integrations));
      this._pickedBrand = integration.domain;
      return;
    }

    if (integration.iot_standards) {
      this._pickedBrand = integration.domain;
      return;
    }

    if (integration.config_flow) {
      this._createFlow(integration);
      return;
    }

    this.closeDialog();
    showAlertDialog(this, {
      text: "No config flow available check docs on how to setup",
    });
  }

  private async _createFlow(integration: ListItem) {
    const flowsInProgress = await this._fetchFlowsInProgress([
      integration.domain,
    ]);

    if (flowsInProgress?.length) {
      this._pickedBrand = integration.domain;
      return;
    }

    this.closeDialog();

    showConfigFlowDialog(this, {
      startFlowHandler: integration.domain,
    });
  }

  private async _fetchFlowsInProgress(domains: string[]) {
    const flowsInProgress = (
      await fetchConfigFlowInProgress(this.hass.connection)
    ).filter((flow) => domains.includes(flow.handler));

    if (flowsInProgress.length) {
      this._flowsInProgress = flowsInProgress;
    }
    return flowsInProgress;
  }

  private _maybeSubmit(ev: KeyboardEvent) {
    if (ev.key !== "Enter") {
      return;
    }

    const integrations = this._getIntegrations();

    const total = integrations.integrations.concat(integrations.helpers);

    if (total.length > 0) {
      this._handleIntegrationPicked(total[0]);
    }
  }

  private _prevClicked = () => {
    this._pickedBrand = undefined;
    this._flowsInProgress = undefined;
  };

  static styles = [
    haStyleScrollbar,
    css`
      ha-dialog {
        --dialog-content-padding: 0;
      }
      img {
        width: 40px;
        height: 40px;
      }
      search-input {
        display: block;
        margin: 16px 16px 0;
      }
      ha-icon-next {
        margin-right: 8px;
      }
      mwc-list {
        overflow: auto;
        max-height: 600px;
      }
      .divider {
        border-bottom-color: var(--divider-color);
      }
      h2 {
        padding-inline-end: 66px;
        direction: var(--direction);
      }
      @media all and (max-height: 900px) {
        mwc-list {
          max-height: calc(100vh - 134px);
        }
      }
      p {
        text-align: center;
        padding: 16px;
        margin: 0;
      }
      p > a {
        color: var(--primary-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-add-integration": AddIntegrationDialog;
  }
}
