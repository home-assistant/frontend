import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import Fuse from "fuse.js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import { protocolIntegrationPicked } from "../../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { LocalizeFunc } from "../../../common/translations/localize";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/ha-icon-button-prev";
import "../../../components/search-input";
import { fetchConfigFlowInProgress } from "../../../data/config_flow";
import { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import {
  domainToName,
  fetchIntegrationManifest,
} from "../../../data/integration";
import {
  getIntegrationDescriptions,
  Integration,
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
import { haStyleDialog, haStyleScrollbar } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "./ha-domain-integrations";
import "./ha-integration-list-item";
import { AddIntegrationDialogParams } from "./show-add-integration-dialog";

export interface IntegrationListItem {
  name: string;
  domain: string;
  config_flow?: boolean;
  is_helper?: boolean;
  integrations?: string[];
  iot_standards?: string[];
  supported_flows?: string[];
  cloud?: boolean;
  is_built_in?: boolean;
  is_add?: boolean;
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

  @state() private _open = false;

  @state() private _narrow = false;

  private _width?: number;

  private _height?: number;

  public showDialog(params: AddIntegrationDialogParams): void {
    this._open = true;
    this._pickedBrand = params.brand;
    this._initialFilter = params.initialFilter;
    this._narrow = matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;
  }

  public closeDialog() {
    this._open = false;
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

  public updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_open") && this._open) {
      this._load();
    }
  }

  private _filterIntegrations = memoizeOne(
    (
      i: Integrations,
      h: Integrations,
      sb: Record<string, SupportedBrandHandler>,
      components: HomeAssistant["config"]["components"],
      localize: LocalizeFunc,
      filter?: string
    ): IntegrationListItem[] => {
      const addDeviceRows: IntegrationListItem[] = ["zha", "zwave_js"]
        .filter((domain) => components.includes(domain))
        .map((domain) => ({
          name: localize(`ui.panel.config.integrations.add_${domain}_device`),
          domain,
          config_flow: true,
          is_built_in: true,
          is_add: true,
        }))
        .sort((a, b) => caseInsensitiveStringCompare(a.name, b.name));

      const integrations: IntegrationListItem[] = [];
      const yamlIntegrations: IntegrationListItem[] = [];

      Object.entries(i).forEach(([domain, integration]) => {
        if (
          integration.config_flow ||
          integration.iot_standards ||
          integration.integrations
        ) {
          integrations.push({
            domain,
            name: integration.name || domainToName(localize, domain),
            config_flow: integration.config_flow,
            iot_standards: integration.iot_standards,
            integrations: integration.integrations
              ? Object.entries(integration.integrations).map(
                  ([dom, val]) => val.name || domainToName(localize, dom)
                )
              : undefined,
            is_built_in: integration.is_built_in !== false,
            cloud: integration.iot_class?.startsWith("cloud_"),
          });
        } else if (filter) {
          yamlIntegrations.push({
            domain,
            name: integration.name || domainToName(localize, domain),
            config_flow: integration.config_flow,
            is_built_in: integration.is_built_in !== false,
            cloud: integration.iot_class?.startsWith("cloud_"),
          });
        }
      });

      for (const [domain, domainBrands] of Object.entries(sb)) {
        const integration = this._findIntegration(domain);
        if (
          !integration ||
          (!integration.config_flow &&
            !integration.iot_standards &&
            !integration.integrations)
        ) {
          continue;
        }
        for (const [slug, name] of Object.entries(domainBrands)) {
          integrations.push({
            domain: slug,
            name,
            config_flow: integration.config_flow,
            supported_flows: [domain],
            is_built_in: true,
            cloud: integration.iot_class?.startsWith("cloud_"),
          });
        }
      }

      if (filter) {
        const options: Fuse.IFuseOptions<IntegrationListItem> = {
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
        const helpers = Object.entries(h)
          .filter(
            ([_domain, integration]) =>
              integration.config_flow ||
              integration.iot_standards ||
              integration.integrations
          )
          .map(([domain, integration]) => ({
            domain,
            name: integration.name || domainToName(localize, domain),
            config_flow: integration.config_flow,
            is_helper: true,
            is_built_in: integration.is_built_in !== false,
            cloud: integration.iot_class?.startsWith("cloud_"),
          }));
        return [
          ...new Fuse(integrations, options)
            .search(filter)
            .map((result) => result.item),
          ...new Fuse(yamlIntegrations, options)
            .search(filter)
            .map((result) => result.item),
          ...new Fuse(helpers, options)
            .search(filter)
            .map((result) => result.item),
        ];
      }
      return [
        ...addDeviceRows,
        ...integrations.sort((a, b) =>
          caseInsensitiveStringCompare(a.name || "", b.name || "")
        ),
      ];
    }
  );

  private _findIntegration(domain: string): Integration | undefined {
    if (!this._integrations) {
      return undefined;
    }
    if (domain in this._integrations) {
      return this._integrations[domain];
    }
    for (const integration of Object.values(this._integrations)) {
      if (integration.integrations && domain in integration.integrations) {
        return integration.integrations[domain];
      }
    }
    return undefined;
  }

  private _getIntegrations() {
    return this._filterIntegrations(
      this._integrations!,
      this._helpers!,
      this._supportedBrands!,
      this.hass.config.components,
      this.hass.localize,
      this._filter
    );
  }

  protected render(): TemplateResult {
    if (!this._open) {
      return html``;
    }
    const integrations = this._integrations
      ? this._getIntegrations()
      : undefined;

    return html`<ha-dialog
      open
      @closed=${this.closeDialog}
      scrimClickAction
      escapeKeyAction
      hideActions
      .heading=${this._pickedBrand
        ? true
        : createCloseHeading(
            this.hass,
            this.hass.localize("ui.panel.config.integrations.new")
          )}
    >
      ${this._pickedBrand
        ? html`<div slot="heading">
              <ha-icon-button-prev
                @click=${this._prevClicked}
              ></ha-icon-button-prev>
              <h2 class="mdc-dialog__title">
                ${this._calculateBrandHeading()}
              </h2>
            </div>
            ${this._renderIntegration()}`
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
        minHeight: `581px`,
      })}
      @close-dialog=${this.closeDialog}
    ></ha-domain-integrations>`;
  }

  private _renderAll(integrations?: IntegrationListItem[]): TemplateResult {
    return html`<search-input
        .hass=${this.hass}
        autofocus
        dialogInitialFocus
        .filter=${this._filter}
        @value-changed=${this._filterChanged}
        .label=${this.hass.localize(
          "ui.panel.config.integrations.search_brand"
        )}
        @keypress=${this._maybeSubmit}
      ></search-input>
      ${integrations
        ? html`<mwc-list>
            <lit-virtualizer
              scroller
              class="ha-scrollbar"
              style=${styleMap({
                width: `${this._width}px`,
                height: this._narrow ? "calc(100vh - 184px)" : "500px",
              })}
              @click=${this._integrationPicked}
              .items=${integrations}
              .renderItem=${this._renderRow}
            >
            </lit-virtualizer>
          </mwc-list>`
        : html`<ha-circular-progress active></ha-circular-progress>`} `;
  }

  private _renderRow = (integration: IntegrationListItem) => {
    if (!integration) {
      return html``;
    }
    return html`
      <ha-integration-list-item .hass=${this.hass} .integration=${integration}>
      </ha-integration-list-item>
    `;
  };

  private async _load() {
    const [descriptions, supportedBrands] = await Promise.all([
      getIntegrationDescriptions(this.hass),
      getSupportedBrands(this.hass),
    ]);
    for (const integration in descriptions.custom.integration) {
      if (
        !Object.prototype.hasOwnProperty.call(
          descriptions.custom.integration,
          integration
        )
      ) {
        continue;
      }
      descriptions.custom.integration[integration].is_built_in = false;
    }
    this._integrations = {
      ...descriptions.core.integration,
      ...descriptions.custom.integration,
    };
    for (const integration in descriptions.custom.helper) {
      if (
        !Object.prototype.hasOwnProperty.call(
          descriptions.custom.helper,
          integration
        )
      ) {
        continue;
      }
      descriptions.custom.helper[integration].is_built_in = false;
    }
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

  private async _filterChanged(e) {
    this._filter = e.detail.value;
  }

  private _integrationPicked(ev) {
    const listItem = ev.target.closest("ha-integration-list-item");
    if (!listItem) {
      return;
    }
    this._handleIntegrationPicked(listItem.integration);
  }

  private async _handleIntegrationPicked(integration: IntegrationListItem) {
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
          const supportIntegration = this._findIntegration(domain);
          this.closeDialog();
          if (["zha", "zwave_js"].includes(domain)) {
            protocolIntegrationPicked(this, this.hass, domain);
            return;
          }
          if (supportIntegration) {
            this._handleIntegrationPicked({
              domain,
              name:
                supportIntegration.name ||
                domainToName(this.hass.localize, domain),
              config_flow: supportIntegration.config_flow,
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

    if (integration.is_add) {
      protocolIntegrationPicked(this, this.hass, integration.domain);
      this.closeDialog();
      return;
    }

    if (integration.is_helper) {
      this.closeDialog();
      navigate(`/config/helpers/add?domain=${integration.domain}`);
      return;
    }

    if (integration.integrations) {
      const integrations =
        this._integrations![integration.domain].integrations!;
      this._fetchFlowsInProgress(Object.keys(integrations));
      this._pickedBrand = integration.domain;
      return;
    }

    if (
      ["zha", "zwave_js"].includes(integration.domain) &&
      isComponentLoaded(this.hass, integration.domain)
    ) {
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

    const manifest = await fetchIntegrationManifest(
      this.hass,
      integration.domain
    );
    showAlertDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_flow.yaml_only_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.integrations.config_flow.yaml_only_text",
        {
          link:
            manifest?.is_built_in || manifest?.documentation
              ? html`<a
                  href=${manifest.is_built_in
                    ? documentationUrl(
                        this.hass,
                        `/integrations/${manifest.domain}`
                      )
                    : manifest.documentation}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_flow.documentation"
                  )}</a
                >`
              : this.hass.localize(
                  "ui.panel.config.integrations.config_flow.documentation"
                ),
        }
      ),
    });
  }

  private async _createFlow(integration: IntegrationListItem) {
    const flowsInProgress = await this._fetchFlowsInProgress([
      integration.domain,
    ]);

    if (flowsInProgress?.length) {
      this._pickedBrand = integration.domain;
      return;
    }

    const manifest = await fetchIntegrationManifest(
      this.hass,
      integration.domain
    );

    this.closeDialog();

    showConfigFlowDialog(this, {
      startFlowHandler: integration.domain,
      showAdvanced: this.hass.userData?.showAdvanced,
      manifest,
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

    if (integrations.length > 0) {
      this._handleIntegrationPicked(integrations[0]);
    }
  }

  private _prevClicked() {
    this._pickedBrand = undefined;
    this._flowsInProgress = undefined;
  }

  static styles = [
    haStyleScrollbar,
    haStyleDialog,
    css`
      @media all and (min-width: 550px) {
        ha-dialog {
          --mdc-dialog-min-width: 500px;
        }
      }
      ha-dialog {
        --dialog-content-padding: 0;
      }
      search-input {
        display: block;
        margin: 16px 16px 0;
      }
      .divider {
        border-bottom-color: var(--divider-color);
      }
      h2 {
        padding-inline-end: 66px;
        direction: var(--direction);
      }
      p {
        text-align: center;
        padding: 16px;
        margin: 0;
      }
      p > a {
        color: var(--primary-color);
      }
      ha-circular-progress {
        width: 100%;
        display: flex;
        justify-content: center;
        margin: 24px 0;
      }
      lit-virtualizer {
        contain: size layout !important;
      }
      ha-integration-list-item {
        width: 100%;
      }
      ha-icon-button-prev {
        color: var(--secondary-text-color);
        position: absolute;
        left: 16px;
        top: 14px;
        inset-inline-end: initial;
        inset-inline-start: 16px;
        direction: var(--direction);
      }
      .mdc-dialog__title {
        margin: 0;
        margin-bottom: 8px;
        margin-left: 48px;
        padding: 24px 24px 0 24px;
        color: var(--mdc-dialog-heading-ink-color, rgba(0, 0, 0, 0.87));
        font-size: var(--mdc-typography-headline6-font-size, 1.25rem);
        line-height: var(--mdc-typography-headline6-line-height, 2rem);
        font-weight: var(--mdc-typography-headline6-font-weight, 500);
        letter-spacing: var(
          --mdc-typography-headline6-letter-spacing,
          0.0125em
        );
        text-decoration: var(
          --mdc-typography-headline6-text-decoration,
          inherit
        );
        text-transform: var(--mdc-typography-headline6-text-transform, inherit);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-add-integration": AddIntegrationDialog;
  }
}
