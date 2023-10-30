import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import Fuse, { IFuseOptions } from "fuse.js";
import { HassConfig } from "home-assistant-js-websocket";
import {
  css,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  nothing,
} from "lit";
import { customElement, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  protocolIntegrationPicked,
  PROTOCOL_INTEGRATIONS,
} from "../../../common/integrations/protocolIntegrationPicked";
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
  Brand,
  Brands,
  findIntegration,
  getIntegrationDescriptions,
  Integration,
  Integrations,
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
import {
  AddIntegrationDialogParams,
  showYamlIntegrationDialog,
} from "./show-add-integration-dialog";

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
  is_add?: boolean;
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

  @state() private _open = false;

  @state() private _narrow = false;

  private _width?: number;

  private _height?: number;

  public async showDialog(params?: AddIntegrationDialogParams): Promise<void> {
    const loadPromise = this._load();
    this._open = true;
    this._pickedBrand = params?.brand;
    this._initialFilter = params?.initialFilter;
    this._narrow = matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;
    if (params?.domain) {
      this._createFlow(params.domain);
    }
    if (params?.brand) {
      await loadPromise;
      const brand = this._integrations?.[params.brand];
      if (brand && "integrations" in brand && brand.integrations) {
        this._fetchFlowsInProgress(Object.keys(brand.integrations));
      }
    }
  }

  public closeDialog() {
    this._open = false;
    this._integrations = undefined;
    this._helpers = undefined;
    this._pickedBrand = undefined;
    this._prevPickedBrand = undefined;
    this._flowsInProgress = undefined;
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
      i: Brands,
      h: Integrations,
      components: HassConfig["components"],
      localize: LocalizeFunc,
      filter?: string
    ): IntegrationListItem[] => {
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
            cloud: supportedIntegration.iot_class?.startsWith("cloud_"),
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
          });
        } else if (filter && "integration_type" in integration) {
          // Integration without a config flow
          yamlIntegrations.push({
            domain,
            name: integration.name || domainToName(localize, domain),
            config_flow: integration.config_flow,
            is_built_in: integration.is_built_in !== false,
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
          minMatchCharLength: 2,
          threshold: 0.2,
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
      this._filter
    );
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }
    const integrations = this._integrations
      ? this._getIntegrations()
      : undefined;

    const pickedIntegration = this._pickedBrand
      ? this._integrations?.[this._pickedBrand] ||
        findIntegration(this._integrations, this._pickedBrand)
      : undefined;

    return html`<ha-dialog
      open
      @closed=${this.closeDialog}
      scrimClickAction
      escapeKeyAction
      hideActions
      .heading=${createCloseHeading(
        this.hass,
        this.hass.localize("ui.panel.config.integrations.new")
      )}
    >
      ${this._pickedBrand && (!this._integrations || pickedIntegration)
        ? html`<div slot="heading">
              <ha-icon-button-prev
                @click=${this._prevClicked}
              ></ha-icon-button-prev>
              <h2 class="mdc-dialog__title">
                ${this._calculateBrandHeading(pickedIntegration)}
              </h2>
            </div>
            ${this._renderIntegration(pickedIntegration)}`
        : this._renderAll(integrations)}
    </ha-dialog>`;
  }

  private _calculateBrandHeading(integration: Brand | Integration | undefined) {
    if (
      integration?.iot_standards &&
      !("integrations" in integration) &&
      !this._flowsInProgress?.length
    ) {
      return "What type of device is it?";
    }
    if (
      integration &&
      !integration?.iot_standards &&
      !("integrations" in integration) &&
      this._flowsInProgress?.length
    ) {
      return "Want to add these discovered devices?";
    }
    return "What do you want to add?";
  }

  private _renderIntegration(
    integration: Brand | Integration | undefined
  ): TemplateResult {
    return html`<ha-domain-integrations
      .hass=${this.hass}
      .domain=${this._pickedBrand}
      .integration=${integration}
      .flowsInProgress=${this._flowsInProgress}
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
              .keyFunction=${this._keyFunction}
              .renderItem=${this._renderRow}
            >
            </lit-virtualizer>
          </mwc-list>`
        : html`<ha-circular-progress active></ha-circular-progress>`} `;
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
      >
      </ha-integration-list-item>
    `;
  };

  private async _load() {
    const descriptions = await getIntegrationDescriptions(this.hass);
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

  private async _handleIntegrationPicked(integration: IntegrationListItem) {
    if (integration.supported_by) {
      this._supportedBy(integration);
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
      let domains = integration.domains || [];
      if (integration.domain === "apple") {
        // we show discoverd homekit devices in their own brand section, dont show them at apple
        domains = domains.filter((domain) => domain !== "homekit_controller");
      }
      this._fetchFlowsInProgress(domains);
      this._pickedBrand = integration.domain;
      return;
    }

    if (
      (PROTOCOL_INTEGRATIONS as ReadonlyArray<string>).includes(
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

    if (integration.config_flow) {
      this._createFlow(integration.domain);
      return;
    }

    if (
      ["cloud", "google_assistant", "alexa"].includes(integration.domain) &&
      isComponentLoaded(this.hass, "cloud")
    ) {
      this.closeDialog();
      navigate("/config/cloud");
      return;
    }

    const manifest = await fetchIntegrationManifest(
      this.hass,
      integration.domain
    );
    showYamlIntegrationDialog(this, { manifest });
  }

  private async _createFlow(domain: string) {
    const flowsInProgress = await this._fetchFlowsInProgress([domain]);

    if (flowsInProgress?.length) {
      this._pickedBrand = domain;
      return;
    }

    const manifest = await fetchIntegrationManifest(this.hass, domain);

    this.closeDialog();

    showConfigFlowDialog(this, {
      startFlowHandler: domain,
      showAdvanced: this.hass.userData?.showAdvanced,
      manifest,
    });
  }

  private async _fetchFlowsInProgress(domains: string[]) {
    const flowsInProgress = (
      await fetchConfigFlowInProgress(this.hass.connection)
    ).filter(
      (flow) =>
        // filter config flows that are not for the integration we are looking for
        domains.includes(flow.handler) ||
        // filter config flows of other domains (like homekit) that are for the domains we are looking for
        ("alternative_domain" in flow.context &&
          domains.includes(flow.context.alternative_domain))
    );

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
    this._pickedBrand = this._prevPickedBrand;
    if (!this._prevPickedBrand) {
      this._flowsInProgress = undefined;
    }
    this._prevPickedBrand = undefined;
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
