import {
  mdiChevronRight,
  mdiDevices,
  mdiFilterVariant,
  mdiViewGridOutline,
} from "@mdi/js";
import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-dialog";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon";
import "../../../components/ha-domain-icon";
import "../../../components/ha-section-title";
import "../../../components/ha-tree-indicator";
import "../../../components/list/ha-list-base";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-icon-next";
import "../../../components/ha-svg-icon";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
import "../../../components/item/ha-list-item-button";
import "../../../components/list/ha-list-virtualized";
import type {
  HaListVirtualized,
  HaListVirtualizedItem,
} from "../../../components/list/ha-list-virtualized";
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
  IntegrationFilter,
  Integrations,
} from "../../../data/integrations";
import {
  filterIntegrationsByDomains,
  findIntegration,
  getIntegrationDescriptions,
} from "../../../data/integrations";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { IntegrationCategoryIcons } from "../../../data/icons";
import { getIntegrationCategoryIcons } from "../../../data/icons";
import { haStyleDialog } from "../../../resources/styles";
import { loadVirtualizer } from "../../../resources/virtualizer";
import type { HomeAssistant } from "../../../types";
import "./ha-domain-integrations";
import "./ha-integration-list-item";
import type { HaIntegrationListItem } from "./ha-integration-list-item";
import type { AddIntegrationDialogParams } from "./show-add-integration-dialog";
import { showYamlIntegrationDialog } from "./show-add-integration-dialog";
import { showSingleConfigEntryWarning } from "./show-single-config-entry-warning";

export interface IntegrationListItem extends HaListVirtualizedItem {
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
  categories?: string[];
}

interface IntegrationCategory {
  slug: string;
  name: string;
  subcategories: { slug: string; name: string }[];
}

// An integration is in a category when it lists the category itself, or one
// of its subcategories.
const inCategory = (
  categories: string[] | undefined,
  category?: string,
  subcategory?: string
) =>
  !category ||
  (categories || []).some((slug) =>
    subcategory
      ? slug === `${category}.${subcategory}`
      : slug === category || slug.startsWith(`${category}.`)
  );

@customElement("dialog-add-integration")
class AddIntegrationDialog extends LitElement {
  public hass!: HomeAssistant;

  @state() private _integrations?: Brands;

  @state() private _helpers?: Integrations;

  @state() private _initialFilter?: string;

  @state() private _filter?: string;

  @state() private _category?: string;

  @state() private _subcategory?: string;

  @state() private _categoryIcons?: IntegrationCategoryIcons;

  // What Home Assistant found, shown instead of the integrations
  @state() private _showDiscoveredView = false;

  // Categories with their subcategories unfolded in the tree
  @state() private _expanded = new Set<string>();

  // On a phone: picking a category in a full pane, instead of the list
  @state() private _pickingCategory = false;

  @state() private _integrationFilter?: IntegrationFilter;

  @state() private _pickedBrand?: string;

  @state() private _prevPickedBrand?: string;

  @state() private _flowsInProgress?: DataEntryFlowProgress[];

  @state() private _showDiscovered = false;

  @state() private _openedDirectly = false;

  @state() private _navigateToResult = false;

  @state() private _open = false;

  // One pane, the list with a filter button, instead of the tree next to it
  @state() private _narrow = false;

  // The dialog fills the screen
  @state() private _fullscreen = false;

  @query("ha-list-virtualized") private _listElement?: HaListVirtualized;

  private _width?: number;

  private _height?: number;

  private _loadId = 0;

  private _narrowQuery?: MediaQueryList;

  private _fullscreenQuery?: MediaQueryList;

  public async showDialog(params?: AddIntegrationDialogParams): Promise<void> {
    if (params?.category) {
      const [category, subcategory] = params.category.split(".");
      this._category = category;
      this._subcategory = subcategory || undefined;
      this._expanded = new Set([category]);
    }
    const loadPromise = this._load(params?.integrationFilter);

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
        // This dialog never opens, the config flow dialog is shown instead
        fireEvent(this, "dialog-closed", { dialog: this.localName });
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
    this._integrationFilter = params?.integrationFilter;
    this._navigateToResult = params?.navigateToResult ?? false;
    this._removeMediaListeners();
    // Below this, the tree leaves too little room for the integrations
    this._narrowQuery = matchMedia(
      "all and (max-width: 700px), all and (max-height: 500px)"
    );
    this._narrowQuery.addEventListener("change", this._narrowChanged);
    this._narrow = this._narrowQuery.matches;
    this._fullscreenQuery = matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    );
    this._fullscreenQuery.addEventListener("change", this._fullscreenChanged);
    this._fullscreen = this._fullscreenQuery.matches;
  }

  private _removeMediaListeners() {
    this._narrowQuery?.removeEventListener("change", this._narrowChanged);
    this._narrowQuery = undefined;
    this._fullscreenQuery?.removeEventListener(
      "change",
      this._fullscreenChanged
    );
    this._fullscreenQuery = undefined;
  }

  private _fullscreenChanged = (ev: MediaQueryListEvent) => {
    this._fullscreen = ev.matches;
  };

  // Turning a tablet or resizing the window switches between the phone list
  // and the category tree
  private _narrowChanged = (ev: MediaQueryListEvent) => {
    this._narrow = ev.matches;
    if (this._narrow) {
      // The phone list shows the discovered flows as its first row
      this._showDiscoveredView = false;
    } else {
      this._pickingCategory = false;
    }
  };

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._open = false;
    this._removeMediaListeners();
    this._integrations = undefined;
    this._helpers = undefined;
    this._pickedBrand = undefined;
    this._prevPickedBrand = undefined;
    this._flowsInProgress = undefined;
    this._showDiscovered = false;
    this._openedDirectly = false;
    this._navigateToResult = false;
    this._filter = undefined;
    this._category = undefined;
    this._subcategory = undefined;
    this._showDiscoveredView = false;
    this._expanded = new Set();
    this._pickingCategory = false;
    this._integrationFilter = undefined;
    this._width = undefined;
    this._height = undefined;
    this._loadId++;
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
      const boundingRect = this.shadowRoot!.querySelector(
        "ha-list-virtualized"
      )?.getBoundingClientRect();
      this._width = boundingRect?.width;
      this._height = boundingRect?.height;
    }
  }

  // Every row the dialog can show, so filtering, the counts and the
  // category list all agree on what is in a category
  private _getListItems = memoizeOne(
    (
      i: Brands,
      h: Integrations,
      localize: LocalizeFunc
    ): {
      integrations: IntegrationListItem[];
      yamlIntegrations: IntegrationListItem[];
      helpers: IntegrationListItem[];
    } => {
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
            id: domain,
            interactive: true,
            domain,
            name: integration.name || domainToName(localize, domain),
            config_flow: supportedIntegration.config_flow,
            iot_standards: supportedIntegration.iot_standards,
            supported_by: integration.supported_by,
            is_built_in: supportedIntegration.is_built_in !== false,
            overwrites_built_in: integration.overwrites_built_in,
            cloud: supportedIntegration.iot_class?.startsWith("cloud_"),
            single_config_entry: integration.single_config_entry,
            categories:
              integration.categories || supportedIntegration.categories,
          });
        } else if (
          !("integration_type" in integration) &&
          ("iot_standards" in integration || "integrations" in integration)
        ) {
          // Brand
          integrations.push({
            id: domain,
            interactive: true,
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
            // A brand is in every category of its integrations
            categories: integration.integrations
              ? Object.values(integration.integrations).flatMap(
                  (brandIntegration) => brandIntegration.categories || []
                )
              : undefined,
          });
        } else if ("integration_type" in integration) {
          // Integration without a config flow, only found by searching
          yamlIntegrations.push({
            id: domain,
            interactive: true,
            domain,
            name: integration.name || domainToName(localize, domain),
            config_flow: integration.config_flow,
            is_built_in: integration.is_built_in !== false,
            overwrites_built_in: integration.overwrites_built_in,
            cloud: integration.iot_class?.startsWith("cloud_"),
            categories: integration.categories,
          });
        }
      });

      const helpers = Object.entries(h).map(([domain, integration]) => ({
        id: domain,
        interactive: true,
        domain,
        name: integration.name || domainToName(localize, domain),
        config_flow: integration.config_flow,
        is_helper: true,
        is_built_in: integration.is_built_in !== false,
        cloud: integration.iot_class?.startsWith("cloud_"),
        categories: integration.categories,
      }));

      return { integrations, yamlIntegrations, helpers };
    }
  );

  private _filterIntegrations = memoizeOne(
    (
      i: Brands,
      h: Integrations,
      localize: LocalizeFunc,
      filter?: string,
      category?: string,
      subcategory?: string
    ): IntegrationListItem[] => {
      const { integrations, yamlIntegrations, helpers } = this._getListItems(
        i,
        h,
        localize
      );

      const byName = (a: IntegrationListItem, b: IntegrationListItem) =>
        caseInsensitiveStringCompare(
          a.name || "",
          b.name || "",
          this.hass.locale.language
        );
      const ofCategory = (item: IntegrationListItem) =>
        inCategory(item.categories, category, subcategory);

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
        ].filter(ofCategory);
      }

      // Browsing a category also shows the helpers in it
      if (category) {
        return [...integrations, ...helpers].filter(ofCategory).sort(byName);
      }
      return [...integrations].sort(byName);
    }
  );

  // How many integrations, brands, and helpers each category and
  // subcategory has, like the counts in the website's sidebar
  private _getCategoryCounts = memoizeOne(
    (
      integrations: IntegrationListItem[],
      helpers: IntegrationListItem[]
    ): Map<string, number> => {
      const counts = new Map<string, number>();
      const add = (slug: string) =>
        counts.set(slug, (counts.get(slug) || 0) + 1);
      [...integrations, ...helpers].forEach((item) => {
        // A brand lists the categories of all its integrations, count it once
        const slugs = new Set(item.categories);
        new Set([...slugs].map((slug) => slug.split(".")[0])).forEach(add);
        [...slugs].filter((slug) => slug.includes(".")).forEach(add);
      });
      return counts;
    }
  );

  // Only the categories that have something to browse, from the counts
  private _getCategories = memoizeOne(
    (
      counts: Map<string, number>,
      localize: LocalizeFunc
    ): IntegrationCategory[] => {
      const key = "component.homeassistant.integration_category";
      const categories = new Map<string, IntegrationCategory>();
      for (const slug of counts.keys()) {
        const [category, subcategory] = slug.split(".");
        const name = localize(`${key}.${category}.name` as any);
        // A category this Home Assistant doesn't know, left out
        if (!name) {
          continue;
        }
        if (!categories.has(category)) {
          categories.set(category, { slug: category, name, subcategories: [] });
        }
        const subcategoryName =
          subcategory &&
          localize(`${key}.${category}.subcategory.${subcategory}.name` as any);
        if (subcategoryName) {
          categories
            .get(category)!
            .subcategories.push({ slug: subcategory, name: subcategoryName });
        }
      }

      const byName = (a: { name: string }, b: { name: string }) =>
        caseInsensitiveStringCompare(a.name, b.name, this.hass.locale.language);
      const sorted = [...categories.values()].sort(byName);
      sorted.forEach((category) => category.subcategories.sort(byName));
      return sorted;
    }
  );

  private _getCounts(): Map<string, number> {
    if (!this._integrations || !this._helpers) {
      return new Map();
    }
    const { integrations, helpers } = this._getListItems(
      this._integrations,
      this._helpers,
      this.hass.localize
    );
    return this._getCategoryCounts(integrations, helpers);
  }

  private _getIntegrations() {
    return this._filterIntegrations(
      this._integrations!,
      this._helpers!,
      this.hass.localize,
      this._filter,
      this._category,
      this._subcategory
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
      : this._pickingCategory
        ? this.hass.localize("ui.panel.config.integrations.filter_category")
        : this._narrow && this._category && !this._filter
          ? this._browsingTitle()
          : this.hass.localize("ui.panel.config.integrations.new");

    return html`<ha-dialog
      .open=${this._open}
      header-title=${headerTitle}
      width=${this._integrationFilter ? "medium" : "large"}
      @closed=${this._dialogClosed}
    >
      ${
        showingBrandView
          ? html`
              ${
                !this._openedDirectly
                  ? html`
                      <ha-icon-button-prev
                        slot="headerNavigationIcon"
                        @click=${this._prevClicked}
                      ></ha-icon-button-prev>
                    `
                  : nothing
              }
              ${this._renderBrandView(pickedIntegration, flowsInProgress)}
            `
          : html`
              ${
                this._pickingCategory
                  ? html`<ha-icon-button-prev
                      slot="headerNavigationIcon"
                      @click=${this._leaveCategoryPicker}
                    ></ha-icon-button-prev>`
                  : nothing
              }
              ${this._renderAll(integrations)}
            `
      }
    </ha-dialog>`;
  }

  private _browsingTitle(): string {
    if (this._showDiscoveredView) {
      return this.hass.localize("ui.panel.config.integrations.discovered");
    }
    if (!this._category) {
      return this.hass.localize(
        "ui.panel.config.integrations.all_integrations"
      );
    }
    const key = `component.homeassistant.integration_category.${this._category}`;
    return (
      (this._subcategory &&
        this.hass.localize(
          `${key}.subcategory.${this._subcategory}.name` as any
        )) ||
      this.hass.localize(`${key}.name` as any)
    );
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
    let domains: string[];
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
      .showManageLink=${this._showDiscovered || this._showDiscoveredView}
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
            id: integration.supported_by,
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
    // Wide screens browse with the tree, phones filter with a button next
    // to the search.
    const browseByCategory = !this._integrationFilter;
    const rows = integrations && this._getRows(integrations);

    if (this._pickingCategory) {
      return html`<div class="content picking">
        ${this._renderCategoryTree()}
      </div>`;
    }

    return html`<div class="search-row">
        <ha-input-search
          appearance="outlined"
          ?autofocus=${!this._narrow}
          .value=${this._filter}
          @input=${this._filterChanged}
          .placeholder=${this.hass.localize(
            "ui.panel.config.integrations.search_brand"
          )}
          @keydown=${this._maybeSubmit}
        ></ha-input-search>
        ${
          this._narrow && browseByCategory
            ? html`<ha-icon-button
                class=${classMap({
                  "filter-button": true,
                  "filter-active": !!this._category,
                })}
                .label=${this.hass.localize(
                  "ui.panel.config.integrations.filter_category"
                )}
                .path=${mdiFilterVariant}
                @click=${this._openCategoryPicker}
              ></ha-icon-button>`
            : nothing
        }
      </div>
      <div class="content">
        ${browseByCategory && !this._narrow ? this._renderCategoryTree() : nothing}
        <div class="items">
          ${
            this._showDiscoveredView && !this._filter
              ? html`<div
                  class="discovered"
                  style=${styleMap({ height: this._listHeight() })}
                >
                  ${this._renderBrandView(undefined, this._flowsInProgress || [])}
                </div>`
              : rows
                ? html`<ha-list-virtualized
                    .rows=${rows}
                    .rowRenderer=${this._renderRow}
                    style=${styleMap({ height: this._listHeight() })}
                  >
                  </ha-list-virtualized>`
                : html`<div class="flex center">
                    <ha-spinner></ha-spinner>
                  </div>`
          }
        </div>
      </div>`;
  }

  // The rows of the list, what Enter picks the first of
  private _getRows(integrations: IntegrationListItem[]): IntegrationListItem[] {
    return this._narrow
      ? [...this._getPhoneShortcuts(), ...integrations]
      : integrations;
  }

  // On a phone, what was found and adding a device to a protocol you use
  // come first in the list, while it shows everything
  private _getPhoneShortcuts(): IntegrationListItem[] {
    if (this._integrationFilter || this._filter || this._category) {
      return [];
    }
    const discovered = this._flowsInProgress?.length || 0;
    const shortcuts: IntegrationListItem[] = discovered
      ? [
          {
            id: "_discovered",
            interactive: true,
            name: this.hass.localize(
              "ui.panel.config.integrations.discovered_devices",
              { count: discovered }
            ),
            domain: "_discovered",
            config_flow: true,
            is_built_in: true,
            is_discovered: true,
          },
        ]
      : [];
    PROTOCOL_INTEGRATIONS.filter((domain) =>
      this.hass.config.components.includes(domain)
    ).forEach((domain) =>
      shortcuts.push({
        id: `device_${domain}`,
        interactive: true,
        name: this.hass.localize(
          `ui.panel.config.integrations.add_${domain}_device` as any
        ),
        domain,
        config_flow: true,
        is_built_in: true,
        is_add: true,
      })
    );
    return shortcuts;
  }

  private async _openCategoryPicker() {
    this._pickingCategory = true;
    // Show where the current filter sits
    if (this._category) {
      this._expanded = new Set([...this._expanded, this._category]);
    }

    // The filter button is gone, keyboard users continue on the current pick
    await this.updateComplete;
    this.shadowRoot!.querySelector<HTMLElement>(
      ".picking [role=treeitem][aria-selected=true]"
    )?.focus();
  }

  // Back on the list, keyboard users continue on the filter button
  private async _leaveCategoryPicker() {
    if (!this._pickingCategory) {
      return;
    }

    this._pickingCategory = false;
    await this.updateComplete;
    // A new button, it renders the element that takes the focus itself
    const filterButton =
      this.shadowRoot!.querySelector<LitElement>(".filter-button");
    await filterButton?.updateComplete;
    filterButton?.focus();
  }

  // Leave room for the dialog margin, header and search on short screens, so
  // only the list scrolls. The category picker has no search to make room for.
  private _listHeight() {
    const reserved = this._pickingCategory ? 96 : 184;
    return this._fullscreen
      ? `calc(100vh - ${reserved}px - var(--safe-area-inset-top, 0px) - var(--safe-area-inset-bottom, 0px))`
      : "min(600px, calc(var(--safe-height) - var(--ha-space-20) - 184px))";
  }

  // Three ways in: what Home Assistant found, adding a device to a
  // protocol you use, and browsing every integration by category.
  private _renderCategoryTree() {
    const counts = this._getCounts();
    const categories = this._getCategories(counts, this.hass.localize);
    const discovered = this._flowsInProgress?.length || 0;
    const protocols = PROTOCOL_INTEGRATIONS.filter((domain) =>
      this.hass.config.components.includes(domain)
    );
    const browsingAll = !this._showDiscoveredView && !this._category;
    // The pane on a phone only browses; the list has the rest
    const showShortcuts = !this._narrow;

    return html`<div
      class="groups"
      style=${styleMap({ height: this._listHeight() })}
    >
      ${
        discovered && showShortcuts
          ? html`
              <ha-section-title>
                ${this.hass.localize(
                  "ui.panel.config.integrations.found_for_you"
                )}
              </ha-section-title>
              <ha-list-base>
                <ha-list-item-button
                  class=${classMap({
                    selected: this._showDiscoveredView && !this._narrow,
                  })}
                  @click=${this._discoveredPicked}
                >
                  <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
                  <span slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.integrations.discovered"
                    )}
                  </span>
                  <span slot="end" class="count">${discovered}</span>
                </ha-list-item-button>
              </ha-list-base>
            `
          : nothing
      }
      ${
        protocols.length && showShortcuts
          ? html`
              <ha-section-title>
                ${this.hass.localize("ui.panel.config.integrations.add_a_device")}
              </ha-section-title>
              <ha-list-base>
                ${protocols.map(
                  (domain) => html`
                    <ha-list-item-button
                      .protocol=${domain}
                      @click=${this._protocolPicked}
                    >
                      <ha-domain-icon
                        slot="start"
                        brand-fallback
                        .domain=${domain}
                      ></ha-domain-icon>
                      <span slot="headline">
                        ${this.hass.localize(
                          `ui.panel.config.integrations.add_${domain}_device` as any
                        )}
                      </span>
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>
                  `
                )}
              </ha-list-base>
            `
          : nothing
      }
      ${
        (discovered || protocols.length) && showShortcuts
          ? html`<ha-section-title>
              ${this.hass.localize("ui.panel.config.integrations.browse")}
            </ha-section-title>`
          : nothing
      }
      <ha-list-base
        role="tree"
        aria-label=${this.hass.localize("ui.panel.config.integrations.browse")}
      >
        <ha-list-item-button
          class=${classMap({ selected: browsingAll })}
          role="treeitem"
          aria-level="1"
          aria-selected=${String(browsingAll)}
          @click=${this._allPicked}
        >
          <ha-svg-icon
            slot="start"
            class="expand empty"
            .path=${mdiChevronRight}
          ></ha-svg-icon>
          <ha-svg-icon slot="start" .path=${mdiViewGridOutline}></ha-svg-icon>
          <span slot="headline">
            ${this.hass.localize(
              "ui.panel.config.integrations.all_integrations"
            )}
          </span>
        </ha-list-item-button>
        ${categories.map((category) => {
          const isCurrent =
            !this._showDiscoveredView && category.slug === this._category;
          const expanded = this._expanded.has(category.slug);
          const icons = this._categoryIcons?.[category.slug];
          return html`
            <ha-list-item-button
              class=${classMap({
                selected: isCurrent && !this._subcategory,
              })}
              role="treeitem"
              aria-level="1"
              aria-selected=${String(isCurrent && !this._subcategory)}
              aria-expanded=${
                category.subcategories.length ? String(expanded) : nothing
              }
              .category=${category.slug}
              @click=${this._categoryPicked}
              @keydown=${this._categoryKeydown}
            >
              ${html`<ha-svg-icon
                slot="start"
                class=${classMap({
                  expand: true,
                  expanded,
                  empty: !category.subcategories.length,
                })}
                .path=${mdiChevronRight}
                .category=${category.slug}
                @click=${this._toggleExpanded}
              ></ha-svg-icon>`}
              ${
                icons?.default
                  ? html`<ha-icon
                      slot="start"
                      .icon=${icons.default}
                    ></ha-icon>`
                  : nothing
              }
              <span slot="headline">${category.name}</span>
              <span slot="end" class="count"
                >${counts.get(category.slug) || 0}</span
              >
            </ha-list-item-button>
            ${
              expanded
                ? category.subcategories.map(
                    (subcategory, index, all) => html`
                      <ha-list-item-button
                        class=${classMap({
                          subcategory: true,
                          selected:
                            isCurrent && subcategory.slug === this._subcategory,
                        })}
                        role="treeitem"
                        aria-level="2"
                        aria-selected=${String(
                          isCurrent && subcategory.slug === this._subcategory
                        )}
                        .category=${category.slug}
                        .subcategory=${subcategory.slug}
                        @click=${this._subcategoryPicked}
                      >
                        <ha-tree-indicator
                          slot="start"
                          .end=${index === all.length - 1}
                        ></ha-tree-indicator>
                        ${
                          icons?.subcategory?.[subcategory.slug]?.default
                            ? html`<ha-icon
                                slot="start"
                                .icon=${icons.subcategory[subcategory.slug].default}
                              ></ha-icon>`
                            : nothing
                        }
                        <span slot="headline">${subcategory.name}</span>
                        <span slot="end" class="count"
                          >${
                            counts.get(
                              `${category.slug}.${subcategory.slug}`
                            ) || 0
                          }</span
                        >
                      </ha-list-item-button>
                    `
                  )
                : nothing
            }
          `;
        })}
      </ha-list-base>
    </div>`;
  }

  private _discoveredPicked() {
    this._filter = "";
    this._showDiscoveredView = true;
    this._category = undefined;
    this._subcategory = undefined;
  }

  private _protocolPicked(ev: Event) {
    const domain = (ev.currentTarget as any).protocol as string;
    protocolIntegrationPicked(this, this.hass, domain);
    this.closeDialog();
  }

  // The chevron only folds; picking the row also shows its integrations
  private _toggleExpanded(ev: Event) {
    ev.stopPropagation();
    const category = (ev.currentTarget as any).category as string;
    const expanded = new Set(this._expanded);
    if (expanded.has(category)) {
      expanded.delete(category);
    } else {
      expanded.add(category);
    }
    this._expanded = expanded;
  }

  // Like a tree: right arrow unfolds a category, left arrow folds it
  private _categoryKeydown(ev: KeyboardEvent) {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") {
      return;
    }
    ev.preventDefault();
    const category = (ev.currentTarget as any).category as string;
    const expanded = new Set(this._expanded);
    if (ev.key === "ArrowRight") {
      expanded.add(category);
    } else {
      expanded.delete(category);
    }
    this._expanded = expanded;
  }

  private _allPicked() {
    this._showDiscoveredView = false;
    this._category = undefined;
    this._subcategory = undefined;
    this._leaveCategoryPicker();
  }

  private _categoryPicked(ev: Event) {
    const category = (ev.currentTarget as any).category as string;
    this._showDiscoveredView = false;
    this._category = category;
    this._subcategory = undefined;
    this._expanded = new Set([...this._expanded, category]);
    this._leaveCategoryPicker();
  }

  private _subcategoryPicked(ev: Event) {
    this._showDiscoveredView = false;
    this._category = (ev.currentTarget as any).category as string;
    this._subcategory = (ev.currentTarget as any).subcategory as string;
    this._leaveCategoryPicker();
  }

  private _renderRow = (integration: IntegrationListItem) => {
    if (!integration) {
      return nothing;
    }
    return html`
      <ha-integration-list-item
        @click=${this._integrationPicked}
        .integration=${integration}
      >
      </ha-integration-list-item>
    `;
  };

  private async _load(integrationFilter?: IntegrationFilter) {
    const loadId = ++this._loadId;
    getIntegrationCategoryIcons(this.hass.connection).then((icons) => {
      this._categoryIcons = icons;
    });
    // `hass` doesn't render this dialog again, so the category names have to
    // be there before the integrations are
    const [descriptions, flowsInProgress] = await Promise.all([
      getIntegrationDescriptions(this.hass),
      fetchConfigFlowInProgress(this.hass.connection),
      this.hass.loadBackendTranslation("integration_category", "homeassistant"),
    ]);

    // Closed, or opened again, while this loaded
    if (loadId !== this._loadId) {
      return;
    }

    // Filter discovered flows
    this._flowsInProgress = flowsInProgress.filter((flow) =>
      DISCOVERY_SOURCES.includes(flow.context.source)
    );
    // Start with what was found, it is what most people come for
    // On a phone, it is the first row of the list instead
    this._showDiscoveredView =
      !integrationFilter &&
      !this._narrow &&
      !this._category &&
      this._flowsInProgress.length > 0;

    // Load translations for discovered flow handlers
    if (this._flowsInProgress.length) {
      const discoveredHandlers = [
        ...new Set(this._flowsInProgress.map((flow) => flow.handler)),
      ];
      await this.hass.loadBackendTranslation("title", discoveredHandlers, true);
    }

    if (loadId !== this._loadId) {
      return;
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
    if (integrationFilter) {
      this._integrations = filterIntegrationsByDomains(
        this._integrations,
        integrationFilter.domains
      );
      this._helpers = filterIntegrationsByDomains(
        this._helpers,
        integrationFilter.domains
      );
    }
    this.hass.loadBackendTranslation(
      "title",
      descriptions.core.translated_name,
      true
    );

    // A category passed in that has nothing to browse falls back to its
    // parent category, or to all integrations
    const counts = this._getCounts();
    if (
      this._subcategory &&
      !counts.has(`${this._category}.${this._subcategory}`)
    ) {
      this._subcategory = undefined;
    }
    if (this._category && !counts.has(this._category)) {
      this._category = undefined;
      this._expanded = new Set();
    }
  }

  private async _filterChanged(ev: HASSDomTargetEvent<HaInputSearch>) {
    this._filter = ev.target.value ?? "";
  }

  private _integrationPicked = (
    ev: HASSDomCurrentTargetEvent<HaIntegrationListItem>
  ) => {
    if (!ev.currentTarget.integration) {
      return;
    }
    this._handleIntegrationPicked(ev.currentTarget.integration);
  };

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
      !this._integrationFilter &&
      (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
        integration.domain
      ) &&
      isComponentLoaded(this.hass.config, integration.domain)
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

        showSingleConfigEntryWarning(this, { domain: integration.domain });
        return;
      }
    }

    if (integration.config_flow) {
      this._createFlow(integration.domain);
      return;
    }

    if (
      integration.domain === "cloud" &&
      isComponentLoaded(this.hass.config, "cloud")
    ) {
      this.closeDialog();
      navigate("/config/cloud");
      return;
    }

    if (
      ["google_assistant", "alexa"].includes(integration.domain) &&
      isComponentLoaded(this.hass.config, "cloud")
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
    // A filtered dialog sets up a given port, not a discovered device
    const flowsInProgress = this._integrationFilter
      ? []
      : this._getFlowsInProgressForDomains([domain]);

    if (flowsInProgress.length) {
      this._pickedBrand = domain;
      return;
    }

    const manifest = await fetchIntegrationManifest(this.hass, domain);

    this.closeDialog();

    showConfigFlowDialog(this, {
      startFlowHandler: domain,
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
    if (ev.key === "ArrowDown" && this._listElement) {
      ev.preventDefault();
      this._listElement.focus();
      return;
    }
    if (ev.key !== "Enter") {
      return;
    }

    // The discovered flows are on screen, not the list of integrations
    if (this._showDiscoveredView && !this._filter) {
      return;
    }

    const rows = this._getRows(this._getIntegrations());

    if (rows.length > 0) {
      this._handleIntegrationPicked(rows[0]);
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
    haStyleDialog,
    css`
      ha-dialog {
        --dialog-content-padding: 0;
      }
      .search-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
        margin: 0 var(--ha-space-4) var(--ha-space-3);
      }
      .search-row ha-input-search {
        flex: 1;
      }
      .search-row .filter-active {
        color: var(--primary-color);
        background-color: var(--ha-color-fill-primary-normal-resting);
        border-radius: var(--ha-border-radius-circle);
      }
      .content {
        display: flex;
      }
      .groups {
        flex: 0 0 300px;
        overflow: auto;
        margin: 0 0 var(--ha-space-3) var(--ha-space-4);
        border-radius: var(--ha-border-radius-xl);
        border: 1px solid var(--ha-color-border-neutral-quiet);
      }
      .picking .groups {
        flex: 1;
        margin: 0;
        border: none;
        border-radius: 0;
      }
      .items {
        flex: 1;
        min-width: 0;
      }
      .discovered {
        overflow: auto;
      }
      .groups ha-list-item-button {
        --ha-row-item-padding-block: var(--ha-space-1);
        --ha-row-item-padding-inline: var(--ha-space-3);
        --ha-row-item-min-height: 40px;
      }
      .groups ha-list-item-button::part(start) {
        color: var(--ha-color-on-neutral-quiet);
      }
      /* Indent by the width of the chevron, so the tree line hangs under
         the icon of the category it belongs to */
      .groups ha-tree-indicator {
        width: 24px;
        height: 40px;
        margin-inline-start: 20px;
      }
      /* The tree line is as tall as the row, padding would make the
         subcategories taller than the categories */
      .groups .subcategory {
        --ha-row-item-padding-block: 0;
      }
      .groups ha-section-title {
        position: sticky;
        top: 0;
        z-index: 1;
      }
      .groups .count {
        color: var(--ha-color-text-secondary);
        font-size: var(--ha-font-size-s);
      }
      .groups .expand {
        width: 20px;
        transition: transform 150ms ease;
      }
      .groups .expand.expanded {
        transform: rotate(90deg);
      }
      .groups .expand.empty {
        visibility: hidden;
      }
      .groups .selected {
        background-color: var(--ha-color-fill-primary-normal-active);
        --icon-primary-color: var(--ha-color-on-primary-normal);
      }
      .groups .selected::part(headline),
      .groups .selected::part(start) {
        color: var(--ha-color-on-primary-normal);
      }
      @media all and (max-width: 450px), all and (max-height: 500px) {
        .groups {
          flex: 1 1 auto;
          margin-inline-end: var(--ha-space-4);
        }
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
      ha-list-virtualized {
        position: relative;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-add-integration": AddIntegrationDialog;
  }
}
