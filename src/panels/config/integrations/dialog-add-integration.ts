import "@material/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiCloudOutline, mdiCodeBraces, mdiPackageVariant } from "@mdi/js";
import Fuse from "fuse.js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
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
  fetchIntegrationManifests,
  IntegrationManifest,
} from "../../../data/integration";
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
import { haStyleDialog, haStyleScrollbar } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";
import "./ha-domain-integrations";

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

  @state() private _manifests?: Record<string, IntegrationManifest>;

  @state() private _supportedBrands?: Record<string, SupportedBrandHandler>;

  @state() private _initialFilter?: string;

  @state() private _filter?: string;

  @state() private _pickedBrand?: string;

  @state() private _flowsInProgress?: DataEntryFlowProgress[];

  @state() private _open = false;

  @state() private _narrow = false;

  private _width?: number;

  private _height?: number;

  public showDialog(params): void {
    this._open = true;
    this._initialFilter = params.initialFilter;
    this._narrow = matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;
  }

  public closeDialog() {
    this._open = false;
    this._integrations = undefined;
    this._manifests = undefined;
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
      .manifests=${this._manifests}
      .flowsInProgress=${this._flowsInProgress}
      style=${styleMap({
        minWidth: `${this._width}px`,
        minHeight: `${this._height}px`,
      })}
      @close-dialog=${this.closeDialog}
    ></ha-domain-integrations>`;
  }

  private _renderAll(integrations?: {
    integrations: ListItem[];
    helpers: ListItem[];
  }): TemplateResult {
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
              .items=${integrations.integrations}
              .renderItem=${this._renderRow}
            >
            </lit-virtualizer>
          </mwc-list>`
        : html`<ha-circular-progress active></ha-circular-progress>`} `;
  }

  private _renderRow = (integration: ListItem) => {
    if (!integration) {
      return html``;
    }
    const manifest = this._manifests?.[integration.domain];
    return html`
      <mwc-list-item graphic="medium" .integration=${integration} hasMeta>
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
          ${integration.is_helper ? " (helper)" : ""}</span
        >
        <div slot="meta">
          ${!integration.config_flow &&
          !integration.integrations &&
          !integration.iot_standards
            ? html`<span
                ><ha-svg-icon .path=${mdiCodeBraces}></ha-svg-icon
                ><paper-tooltip animation-delay="0" position="left"
                  >${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.yaml_only"
                  )}</paper-tooltip
                ></span
              >`
            : ""}
          ${manifest?.iot_class && manifest.iot_class.startsWith("cloud_")
            ? html`<span
                ><ha-svg-icon .path=${mdiCloudOutline}></ha-svg-icon
                ><paper-tooltip animation-delay="0" position="left"
                  >${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.depends_on_cloud"
                  )}</paper-tooltip
                ></span
              >`
            : ""}
          ${manifest && !manifest.is_built_in
            ? html`<span
                ><ha-svg-icon .path=${mdiPackageVariant}></ha-svg-icon
                ><paper-tooltip animation-delay="0" position="left"
                  >${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.provided_by_custom_integration"
                  )}</paper-tooltip
                ></span
              >`
            : ""}
          <ha-icon-next></ha-icon-next>
        </div>
      </mwc-list-item>
    `;
  };

  private async _load() {
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
    this._fetchManifests();
    this._supportedBrands = supportedBrands;
    this.hass.loadBackendTranslation(
      "title",
      descriptions.core.translated_name,
      true
    );
  }

  private async _fetchManifests() {
    const fetched = await fetchIntegrationManifests(
      this.hass,
      Object.keys(this._integrations!)
    );
    const manifests = {};
    for (const manifest of fetched) {
      manifests[manifest.domain] = manifest;
    }
    this._manifests = manifests;
  }

  private async _filterChanged(e) {
    this._filter = e.detail.value;
  }

  private _integrationPicked(ev) {
    const listItem = ev.target.closest("mwc-list-item");
    const integration: ListItem = listItem.integration;
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
            protocolIntegrationPicked(this, this.hass, domain);
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

    const manifest = this._manifests?.[integration.domain];
    this.closeDialog();
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
                  )}
                </a>`
              : this.hass.localize(
                  "ui.panel.config.integrations.config_flow.documentation"
                ),
        }
      ),
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

    const manifest = this._manifests?.[integration.domain];

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
    haStyleDialog,
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
      mwc-list-item {
        width: 100%;
        --mdc-list-item-meta-size: 88px;
      }
      [slot="meta"] {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
      [slot="meta"] > * {
        margin-right: 8px;
      }
      [slot="meta"] > *:last-child {
        margin-right: 0px;
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
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-add-integration": AddIntegrationDialog;
  }
}
