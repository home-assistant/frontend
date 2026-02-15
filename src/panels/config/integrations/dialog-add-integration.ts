import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { HassConfig } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-list";
import "../../../components/ha-spinner";
import "../../../components/ha-wa-dialog";
import "../../../components/search-input";
import { getConfigEntries } from "../../../data/config_entries";
import {
  DISCOVERY_SOURCES,
  fetchConfigFlowInProgress,
} from "../../../data/config_flow";
import type { DataEntryFlowProgress } from "../../../data/data_entry_flow";
import {
  domainToName,
  fetchIntegrationManifest,
} from "../../../data/integration";
import type {
  Brand,
  Brands,
  Integration,
  Integrations,
} from "../../../data/integrations";
import {
  findIntegration,
  getIntegrationDescriptions,
} from "../../../data/integrations";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { haStyleDialog, haStyleScrollbar } from "../../../resources/styles";
import { loadVirtualizer } from "../../../resources/virtualizer";
import type { HomeAssistant } from "../../../types";
import "./ha-domain-integrations";
import "./ha-integration-list-item";
import type { AddIntegrationDialogParams } from "./show-add-integration-dialog";
import { showYamlIntegrationDialog } from "./show-add-integration-dialog";

export interface IntegrationListItem {
  name: string;
  domain: string;
  config_flow?: boolean;
  is_helper?: boolean;
  integrations?: string[];
  domains?: string[];
  iot_standards?: string[];
  supported_by?: string;
  cloud?: boolean;
  is_built_in?: boolean;
  overwrites_built_in?: boolean;
  is_add?: boolean;
  single_config_entry?: boolean;
  is_discovered?: boolean;
}

@customElement("dialog-add-integration")
class AddIntegrationDialog extends LitElement {
  public hass!: HomeAssistant;

  @state() private _integrations?: Brands;

  @state() private _helpers?: Integrations;

  @state() private _initialFilter?: string;

  @state() private _filter?: string;

  @state() private _pickedBrand?: string;

  @state() private _prevPickedBrand?: string;

  @state() private _flowsInProgress?: DataEntryFlowProgress[];

  @state() private _showDiscovered = false;

  @state() private _openedDirectly = false;

  @state() private _navigateToResult = false;

  @state() private _open = false;

  @state() private _narrow = false;

  private _width?: number;

  private _height?: number;

  public async showDialog(params?: AddIntegrationDialogParams): Promise<void> {
    const loadPromise = this._load();

    if (params?.domain) {
      // If we get here we clicked the button to add an entry for a specific integration
      // If there is discovery in process, show this dialog to select a new flow
      // or continue an existing flow.
      // If no flow in process, just open the config flow dialog directly
      await loadPromise;
      const flowsInProgress = this._getFlowsInProgressForDomains([
        params.domain,
      ]);

      if (!flowsInProgress.length) {
        await this._createFlow(params.domain);
        return;
      }
    }

    if (params?.brand === "_discovered") {
      // Wait for load to complete before showing discovered flows
      await loadPromise;
      this._showDiscovered = true;
    }

    // Only open the dialog if no domain is provided or we need to select a flow
    this._open = true;
    this._pickedBrand =
      params?.brand === "_discovered"
        ? undefined
        : params?.domain || params?.brand;
    this._openedDirectly = !!(params?.brand || params?.domain);
    this._initialFilter = params?.initialFilter;
    this._navigateToResult = params?.navigateToResult ?? false;
    this._narrow = matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._open = false;
    this._integrations = undefined;
    this._helpers = undefined;
    this._pickedBrand = undefined;
    this._prevPickedBrand = undefined;
    this._flowsInProgress = undefined;
    this._showDiscovered = false;
    this._openedDirectly = false;
    this._navigateToResult = false;
    this._filter = undefined;
    this._width = undefined;
    this._height = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      loadVirtualizer();
    }

    if (this._filter === undefined && this._initialFilter !== undefined) {
      this._filter = this._initialFilter;
    }
    if (this._initialFilter !== undefined && this._filter === "") {
      this._initialFilter = undefined;
      this._filter = undefined;
      this._width = undefined;
      this._height = undefined;
    } else if (
      this.hasUpdated &&
      changedProps.has("_filter") &&
      !changedProps.has("_open") &&
      (!this._width || !this._height)
    ) {
      // Store the width and height so that when we search, box doesn't jump
      const boundingRect =
        this.shadowRoot!.querySelector("ha-list")?.getBoundingClientRect();
      this._width = boundingRect?.width;
      this._height = boundingRect?.height;
    }
  }

  private _filterIntegrations = memoizeOne(
    (
      i: Brands,
      h: Integrations,
      components: HassConfig["components"],
      localize: LocalizeFunc,
      discoveredFlowsCount: number,
      filter?: string
    ): IntegrationListItem[] => {
      // Create a single discovered devices row if there are any discovered flows
      const discoveredRows: IntegrationListItem[] =
        discoveredFlowsCount > 0
          ? [
              {
                name: localize(
                  "ui.panel.config.integrations.discovered_devices",
                  { count: discoveredFlowsCount }
                ),
                domain: "_discovered",
                config_flow: true,
                is_built_in: true,
                is_discovered: true,
              },
            ]
          : [];

      const addDeviceRows: IntegrationListItem[] = PROTOCOL_INTEGRATIONS.filter(
        (domain) => components.includes(domain)
      )
        .map((domain) => ({
          name: localize(`ui.panel.config.integrations.add_${domain}_device`),
          domain,
          config_flow: true,
          is_built_in: true,
          is_add: true,
        }))
        .sort((a, b) =>
          caseInsensitiveStringCompare(
            a.name,
            b.name,
            this.hass.locale.language
          )
        );

      const integrations: IntegrationListItem[] = [];
      const yamlIntegrations: IntegrationListItem[] = [];

      Object.entries(i).forEach(([domain, integration]) => {
        if (
          "integration_type" in integration &&
          integration.integration_type === "hardware"
        ) {
          // Ignore hardware integrations, they cannot be added via UI
          return;
        }

        if (
          "integration_type" in integration &&
          (integration.config_flow ||
            integration.iot_standards ||
            integration.supported_by)
        ) {
          // Integration with a config flow, iot standard, or supported by
          const supportedIntegration = integration.supported_by
            ? findIntegration(this._integrations, integration.supported_by)
            : integration;
          if (!supportedIntegration) {
            return;
          }
          integrations.push({
            domain,
            name: integration.name || domainToName(localize, domain),
            config_flow: supportedIntegration.config_flow,
            iot_standards: supportedIntegration.iot_standards,
            supported_by: integration.supported_by,
            is_built_in: supportedIntegration.is_built_in !== false,
            overwrites_built_in: integration.overwrites_built_in,
            cloud: supportedIntegration.iot_class?.startsWith("cloud_"),
            single_config_entry: integration.single_config_entry,
          });
        } else if (
          !("integration_type" in integration) &&
          ("iot_standards" in integration || "integrations" in integration)
        ) {
          // Brand
          integrations.push({
            domain,
            name: integration.name || domainToName(localize, domain),
            iot_standards: integration.iot_standards,
            integrations: integration.integrations
              ? Object.entries(integration.integrations).map(
                  ([dom, val]) => val.name || domainToName(localize, dom)
                )
              : undefined,
            domains: integration.integrations
              ? Object.keys(integration.integrations)
              : undefined,
            is_built_in: integration.is_built_in !== false,
            overwrites_built_in: integration.overwrites_built_in,
          });
        } else if (filter && "integration_type" in integration) {
          // Integration without a config flow
          yamlIntegrations.push({
            domain,
            name: integration.name || domainToName(localize, domain),
            config_flow: integration.config_flow,
            is_built_in: integration.is_built_in !== false,
            overwrites_built_in: integration.overwrites_built_in,
            cloud: integration.iot_class?.startsWith("cloud_"),
          });
        }
      });

      if (filter) {
        const options: IFuseOptions<IntegrationListItem> = {
          keys: [
            { name: "name", weight: 5 },
            { name: "domain", weight: 5 },
            { name: "integrations", weight: 2 },
            "supported_by",
            "iot_standards",
          ],
          isCaseSensitive: false,
          minMatchCharLength: Math.min(filter.length, 2),
          threshold: 0.2,
          ignoreDiacritics: true,
        };
        const helpers = Object.entries(h).map(([domain, integration]) => ({
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
        ...discoveredRows,
        ...addDeviceRows,
        ...integrations.sort((a, b) =>
          caseInsensitiveStringCompare(
            a.name || "",
            b.name || "",
            this.hass.locale.language
          )
        ),
      ];
    }
  );

  private _getIntegrations() {
    return this._filterIntegrations(
      this._integrations!,
      this._helpers!,
      this.hass.config.components,
      this.hass.localize,
      this._flowsInProgress?.length ?? 0,
      this._filter
    );
  }

  protected render() {
    if (!this._open && !this._integrations && !this._helpers) {
      return nothing;
    }
    const integrations = this._integrations
      ? this._getIntegrations()
      : undefined;

    const pickedIntegration = this._pickedBrand
      ? this._integrations?.[this._pickedBrand] ||
        findIntegration(this._integrations, this._pickedBrand)
      : undefined;

    const showingBrandView =
      (this._pickedBrand && (!this._integrations || pickedIntegration)) ||
      this._showDiscovered;

    const flowsInProgress = showingBrandView
      ? this._getFlowsForCurrentView(pickedIntegration)
      : [];

    const headerTitle = showingBrandView
      ? this._getBrandHeading(pickedIntegration, flowsInProgress)
      : this.hass.localize("ui.panel.config.integrations.new");

    return html`<ha-wa-dialog
      .hass=${this.hass}
      .open=${this._open}
      header-title=${headerTitle}
      @closed=${this._dialogClosed}
    >
      ${showingBrandView
        ? html`
            ${!this._openedDirectly
              ? html`
                  <ha-icon-button-prev
                    slot="headerNavigationIcon"
                    @click=${this._prevClicked}
                  ></ha-icon-button-prev>
                `
              : nothing}
            ${this._renderBrandView(pickedIntegration, flowsInProgress)}
          `
        : this._renderAll(integrations)}
    </ha-wa-dialog>`;
  }

  private _getFlowsForCurrentView(
    integration: Brand | Integration | undefined
  ): DataEntryFlowProgress[] {
    if (this._showDiscovered) {
      // Show all discovered flows
      return this._flowsInProgress || [];
    }
    if (!this._pickedBrand || !integration) {
      return [];
    }
    // Get domains for this brand
    let domains: string[] = [];
    if ("integrations" in integration && integration.integrations) {
      domains = Object.keys(integration.integrations);
      if (this._pickedBrand === "apple") {
        // we show discovered homekit devices in their own brand section, dont show them in apple
        domains = domains.filter((domain) => domain !== "homekit_controller");
      }
    } else {
      domains = [this._pickedBrand];
    }
    return this._getFlowsInProgressForDomains(domains);
  }

  private _getBrandHeading(
    integration: Brand | Integration | undefined,
    flowsInProgress: DataEntryFlowProgress[]
  ): string {
    if (
      integration?.iot_standards &&
      !("integrations" in integration) &&
      !flowsInProgress.length
    ) {
      return this.hass.localize(
        "ui.panel.config.integrations.what_device_type"
      );
    }

    if (
      integration &&
      !integration?.iot_standards &&
      !("integrations" in integration) &&
      flowsInProgress.length
    ) {
      return this.hass.localize(
        "ui.panel.config.integrations.confirm_add_discovered"
      );
    }

    return this.hass.localize("ui.panel.config.integrations.what_to_add");
  }

  private _renderBrandView(
    integration: Brand | Integration | undefined,
    flowsInProgress: DataEntryFlowProgress[]
  ): TemplateResult {
    return html`<ha-domain-integrations
      .hass=${this.hass}
      .domain=${this._pickedBrand}
      .integration=${integration}
      .flowsInProgress=${flowsInProgress}
      .navigateToResult=${this._navigateToResult}
      .showManageLink=${this._showDiscovered}
      style=${styleMap({
        minWidth: `${this._width}px`,
        minHeight: `581px`,
      })}
      @close-dialog=${this.closeDialog}
      @supported-by=${this._handleSupportedByEvent}
      @select-brand=${this._handleSelectBrandEvent}
    ></ha-domain-integrations>`;
  }

  private _handleSelectBrandEvent(ev: CustomEvent) {
    this._prevPickedBrand = this._pickedBrand;
    this._pickedBrand = ev.detail.brand;
  }

  private _handleSupportedByEvent(ev: CustomEvent) {
    this._supportedBy(ev.detail.integration);
  }

  private _supportedBy(integration) {
    const supportIntegration = findIntegration(
      this._integrations,
      integration.supported_by
    );
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.integrations.config_flow.supported_brand_flow",
        {
          supported_brand:
            integration.name ||
            domainToName(this.hass.localize, integration.domain),
          flow_domain_name:
            supportIntegration?.name ||
            domainToName(this.hass.localize, integration.supported_by),
        }
      ),
      confirm: () => {
        this.closeDialog();
        if (PROTOCOL_INTEGRATIONS.includes(integration.supported_by)) {
          protocolIntegrationPicked(this, this.hass, integration.supported_by);
          return;
        }
        if (supportIntegration) {
          this._handleIntegrationPicked({
            domain: integration.supported_by,
            name:
              supportIntegration.name ||
              domainToName(this.hass.localize, integration.supported_by),
            config_flow: supportIntegration.config_flow,
            iot_standards: supportIntegration.iot_standards,
          });
        } else {
          showAlertDialog(this, {
            text: "Integration not found",
            warning: true,
          });
        }
      },
    });
  }

  private _renderAll(integrations?: IntegrationListItem[]): TemplateResult {
    return html`<search-input
        .hass=${this.hass}
        ?autofocus=${!this._narrow}
        .filter=${this._filter}
        @value-changed=${this._filterChanged}
        .label=${this.hass.localize(
          "ui.panel.config.integrations.search_brand"
        )}
        @keypress=${this._maybeSubmit}
      ></search-input>
      ${integrations
        ? html`<ha-list ?autofocus=${this._narrow}>
            <lit-virtualizer
              scroller
              tabindex="-1"
              class="ha-scrollbar"
              style=${styleMap({
                width: `${this._width}px`,
                height: this._narrow
                  ? "calc(100vh - 184px - var(--safe-area-inset-top, 0px) - var(--safe-area-inset-bottom, 0px))"
                  : "500px",
              })}
              @click=${this._integrationPicked}
              @keypress=${this._handleKeyPress}
              .items=${integrations}
              .keyFunction=${this._keyFunction}
              .renderItem=${this._renderRow}
            >
            </lit-virtualizer>
          </ha-list>`
        : html`<div class="flex center">
            <ha-spinner></ha-spinner>
          </div>`} `;
  }

  private _keyFunction = (integration: IntegrationListItem) =>
    integration.domain;

  private _renderRow = (integration: IntegrationListItem) => {
    if (!integration) {
      return nothing;
    }
    return html`
      <ha-integration-list-item
        brand
        .hass=${this.hass}
        .integration=${integration}
        tabindex="0"
      >
      </ha-integration-list-item>
    `;
  };

  private async _load() {
    const [descriptions, flowsInProgress] = await Promise.all([
      getIntegrationDescriptions(this.hass),
      fetchConfigFlowInProgress(this.hass.connection),
    ]);

    // Filter discovered flows
    this._flowsInProgress = flowsInProgress.filter((flow) =>
      DISCOVERY_SOURCES.includes(flow.context.source)
    );

    // Load translations for discovered flow handlers
    if (this._flowsInProgress.length) {
      const discoveredHandlers = [
        ...new Set(this._flowsInProgress.map((flow) => flow.handler)),
      ];
      await this.hass.loadBackendTranslation("title", discoveredHandlers, true);
    }

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

  private _handleKeyPress(ev) {
    if (ev.key === "Enter") {
      this._integrationPicked(ev);
    }
  }

  private async _handleIntegrationPicked(integration: IntegrationListItem) {
    if (integration.supported_by) {
      this._supportedBy(integration);
      return;
    }

    if (integration.is_discovered) {
      // Show all discovered flows
      this._showDiscovered = true;
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
      this._pickedBrand = integration.domain;
      return;
    }

    if (
      (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
        integration.domain
      ) &&
      isComponentLoaded(this.hass, integration.domain)
    ) {
      this._pickedBrand = integration.domain;
      return;
    }

    if (integration.iot_standards) {
      this._pickedBrand = integration.domain;
      return;
    }

    if (integration.single_config_entry) {
      const configEntries = await getConfigEntries(this.hass, {
        domain: integration.domain,
      });
      if (configEntries.length > 0) {
        this.closeDialog();
        const localize = await this.hass.loadBackendTranslation(
          "title",
          integration.name
        );
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.integrations.config_flow.single_config_entry_title"
          ),
          text: this.hass.localize(
            "ui.panel.config.integrations.config_flow.single_config_entry",
            {
              integration_name: domainToName(localize, integration.name),
            }
          ),
        });
        return;
      }
    }

    if (integration.config_flow) {
      this._createFlow(integration.domain);
      return;
    }

    if (
      integration.domain === "cloud" &&
      isComponentLoaded(this.hass, "cloud")
    ) {
      this.closeDialog();
      navigate("/config/cloud");
      return;
    }

    if (
      ["google_assistant", "alexa"].includes(integration.domain) &&
      isComponentLoaded(this.hass, "cloud")
    ) {
      this.closeDialog();
      navigate("/config/voice-assistants/assistants");
      return;
    }

    const manifest = await fetchIntegrationManifest(
      this.hass,
      integration.domain
    );
    showYamlIntegrationDialog(this, { manifest });
  }

  private async _createFlow(domain: string) {
    const flowsInProgress = this._getFlowsInProgressForDomains([domain]);

    if (flowsInProgress.length) {
      this._pickedBrand = domain;
      return;
    }

    const manifest = await fetchIntegrationManifest(this.hass, domain);

    this.closeDialog();

    showConfigFlowDialog(this, {
      startFlowHandler: domain,
      showAdvanced: this.hass.userData?.showAdvanced,
      manifest,
      navigateToResult: this._navigateToResult,
    });
  }

  private _getFlowsInProgressForDomains(domains: string[]) {
    if (!this._flowsInProgress) {
      return [];
    }
    return this._flowsInProgress.filter(
      (flow) =>
        // filter config flows that are not for the integration we are looking for
        domains.includes(flow.handler) ||
        // filter config flows of other domains (like homekit) that are for the domains we are looking for
        ("alternative_domain" in flow.context &&
          domains.includes(flow.context.alternative_domain))
    );
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
    if (this._showDiscovered) {
      this._showDiscovered = false;
      return;
    }
    this._pickedBrand = this._prevPickedBrand;
    this._prevPickedBrand = undefined;
  }

  static styles = [
    haStyleScrollbar,
    haStyleDialog,
    css`
      ha-wa-dialog {
        --dialog-content-padding: 0;
      }
      search-input {
        display: block;
        margin: 0 16px;
      }
      .divider {
        border-bottom-color: var(--divider-color);
      }
      p {
        text-align: center;
        padding: 16px;
        margin: 0;
      }
      p > a {
        color: var(--primary-color);
      }
      .flex.center {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      ha-spinner {
        margin: 24px 0;
      }
      ha-list {
        position: relative;
      }
      lit-virtualizer {
        contain: size layout !important;
      }
      ha-integration-list-item {
        width: 100%;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-add-integration": AddIntegrationDialog;
  }
}
