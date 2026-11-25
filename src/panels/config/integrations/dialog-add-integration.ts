import "@home-assistant/webawesome/dist/components/divider/divider";
import "@home-assistant/webawesome/dist/components/tree-item/tree-item";
import type WaTreeItem from "@home-assistant/webawesome/dist/components/tree-item/tree-item";
import "@home-assistant/webawesome/dist/components/tree/tree";
import type { WaSelectionChangeEvent } from "@home-assistant/webawesome/dist/events/selection-change";
import { mdiRadar, mdiMenuDown, mdiViewGridOutline, mdiWeb } from "@mdi/js";
import Fuse from "fuse.js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, eventOptions, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { live } from "lit/directives/live";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
  HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import type { HaFilterChip } from "../../../components/chips/ha-filter-chip";
import type { HaListItemButton } from "../../../components/item/ha-list-item-button";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import { storage } from "../../../common/decorators/storage";
import "../../../components/ha-adaptive-dialog";
import "../../../components/ha-label";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import "../../../components/chips/ha-assist-chip";
import "../../../components/chips/ha-filter-chip";
import "../../../components/ha-icon";
import "../../../components/ha-domain-icon";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-section-title";
import "../../../components/list/ha-list-base";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-icon-next";
import "../../../components/ha-svg-icon";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
import type { HaListVisibilityChangedDetail } from "../../../components/list/types";
import "../../../components/item/ha-list-item-button";
import "../../../components/list/ha-list-virtualized";
import type { HaListVirtualized } from "../../../components/list/ha-list-virtualized";
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
import {
  integrationCategoryIcon,
  integrationCategoryName,
} from "../../../data/integration_category";
import { haStyleDialog } from "../../../resources/styles";
import { loadVirtualizer } from "../../../resources/virtualizer";
import type { HomeAssistant } from "../../../types";
import { standardToDomain } from "./ha-domain-integrations";
import type {
  BrowseBy,
  Connection,
  IntegrationCategory,
  IntegrationListItem,
  SearchSection,
} from "./add-integration-list";
import {
  CONNECTIONS,
  inCategory,
  MAX_SEARCH_ITEMS_PER_SECTION,
  ofConnection,
  SEARCH_SECTIONS,
  searchOptions,
} from "./add-integration-list";
import "./ha-integration-list-item";
import "./ha-integration-list-title";
import type { HaIntegrationListItem } from "./ha-integration-list-item";
import type { AddIntegrationDialogParams } from "./show-add-integration-dialog";
import { showYamlIntegrationDialog } from "./show-add-integration-dialog";
import { showSingleConfigEntryWarning } from "./show-single-config-entry-warning";

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

  @state() private _showDiscoveredView = false;

  @state() private _expanded = new Set<string>();

  // Phone: showing the picked item instead of the browse pane
  @state() private _drilled = false;

  @state() private _integrationFilter?: IntegrationFilter;

  @state() private _pickedBrand?: string;

  @state()
  @storage({
    key: "add-integration-browse-by",
    state: true,
    subscribe: false,
  })
  private _browseBy: BrowseBy = "brand";

  @state() private _stickyBrand?: string;

  @state() private _subcategoriesExpanded = false;

  @state() private _connection?: Connection;

  @state() private _searchSection?: SearchSection;

  @state() private _listScrolled = false;

  @state() private _brand?: string;

  @state() private _prevPickedBrand?: string;

  @state() private _flowsInProgress?: DataEntryFlowProgress[];

  @state() private _showDiscovered = false;

  @state() private _openedDirectly = false;

  @state() private _navigateToResult = false;

  @state() private _open = false;

  @state() private _narrow = false;

  @query("ha-list-virtualized") private _listElement?: HaListVirtualized;

  @query("ha-icon-button-prev") private _backButton?: HTMLElement;

  @query(".groups .selected, .groups wa-tree-item[selected]")
  private _selectedBrowseRow?: HTMLElement;

  @query("ha-input-search") private _searchInput?: HaInputSearch;

  // The focused row is gone after drilling
  private _focusAfterDrill?: "in" | "out";

  private _loadId = 0;

  private _narrowQuery?: MediaQueryList;

  public async showDialog(params?: AddIntegrationDialogParams): Promise<void> {
    this._navigateToResult = params?.navigateToResult ?? false;
    if (params?.category) {
      this._browseBy = "category";
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
    this._removeMediaListeners();
    // Below this the tree leaves too little room for the list
    this._narrowQuery = matchMedia(
      "all and (max-width: 700px), all and (max-height: 500px)"
    );
    this._narrowQuery.addEventListener("change", this._narrowChanged);
    this._narrow = this._narrowQuery.matches;
    this._drilled = this._narrow && !!params?.category;
  }

  private _hasProtocol(domain: string) {
    return this.hass.config.components.includes(domain);
  }

  private _removeMediaListeners() {
    this._narrowQuery?.removeEventListener("change", this._narrowChanged);
    this._narrowQuery = undefined;
  }

  private _narrowChanged = (ev: MediaQueryListEvent) => {
    this._narrow = ev.matches;
    this._drilled = false;
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
    this._brand = undefined;
    this._searchSection = undefined;
    this._connection = undefined;
    this._showDiscoveredView = false;
    this._expanded = new Set();
    this._drilled = false;
    this._integrationFilter = undefined;
    this._loadId++;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  // The list element is reused and would keep its scroll position
  private _scrollToTop = false;

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (this._scrollToTop) {
      this._scrollToTop = false;
      this._listElement?.scrollElement?.scrollTo({ top: 0 });
    }
    if (
      !this._narrow &&
      (changedProps.has("_brand") ||
        changedProps.has("_category") ||
        changedProps.has("_subcategory"))
    ) {
      // Picked by searching, it can be far down the browse pane
      requestAnimationFrame(() => {
        const row = this._selectedBrowseRow;
        const pane = row?.closest(".groups");
        if (!row || !pane) {
          return;
        }
        const rowRect = row.getBoundingClientRect();
        const paneRect = pane.getBoundingClientRect();
        if (rowRect.top < paneRect.top || rowRect.bottom > paneRect.bottom) {
          row.scrollIntoView({ block: "center" });
        }
      });
    }
    if (this._focusAfterDrill) {
      const drilledIn = this._focusAfterDrill === "in";
      this._focusAfterDrill = undefined;
      // The new rows and back button render after this element
      requestAnimationFrame(() => {
        if (!this._open || this._drilled !== drilledIn) {
          return;
        }
        if (drilledIn) {
          this._backButton?.focus();
        } else {
          (this._selectedBrowseRow || this._searchInput)?.focus();
        }
      });
    }
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      loadVirtualizer();
    }

    if (
      changedProps.has("_filter") ||
      changedProps.has("_category") ||
      changedProps.has("_subcategory") ||
      changedProps.has("_browseBy") ||
      changedProps.has("_brand") ||
      changedProps.has("_showDiscoveredView") ||
      changedProps.has("_searchSection") ||
      changedProps.has("_connection")
    ) {
      this._stickyBrand = undefined;
      this._listScrolled = false;
      this._subcategoriesExpanded = false;
      this._scrollToTop = true;
    }

    if (this._filter === undefined && this._initialFilter !== undefined) {
      this._filter = this._initialFilter;
    }
    if (this._initialFilter !== undefined && this._filter === "") {
      this._initialFilter = undefined;
      this._filter = undefined;
    }
  }

  private _getListItems = memoizeOne(
    (
      allIntegrations: Brands,
      allHelpers: Integrations,
      localize: LocalizeFunc,
      connection?: Connection
    ): {
      integrations: IntegrationListItem[];
      yamlIntegrations: IntegrationListItem[];
      helpers: IntegrationListItem[];
    } => {
      const integrations: IntegrationListItem[] = [];
      const yamlIntegrations: IntegrationListItem[] = [];

      Object.entries(allIntegrations).forEach(([domain, integration]) => {
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
          });
        } else if ("integration_type" in integration) {
          // No config flow, only found by searching
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

      const helpers = Object.entries(allHelpers).map(
        ([domain, integration]) => ({
          id: domain,
          interactive: true,
          domain,
          name: integration.name || domainToName(localize, domain),
          config_flow: integration.config_flow,
          is_helper: true,
          is_built_in: integration.is_built_in !== false,
          cloud: integration.iot_class?.startsWith("cloud_"),
          categories: integration.categories,
        })
      );

      const ofThisConnection = (item: IntegrationListItem) =>
        item.domains
          ? this._brandRows(item).some((row) => !row.is_header)
          : ofConnection(item, connection);
      return {
        integrations: integrations.filter(ofThisConnection),
        yamlIntegrations: yamlIntegrations.filter(ofThisConnection),
        helpers: helpers.filter(ofThisConnection),
      };
    }
  );

  private _filterIntegrations = memoizeOne(
    (
      allIntegrations: Brands,
      allHelpers: Integrations,
      localize: LocalizeFunc,
      category?: string,
      subcategory?: string,
      byBrand = false,
      brand?: string,
      connection?: Connection
    ): IntegrationListItem[] => {
      const { integrations, helpers } = this._getListItems(
        allIntegrations,
        allHelpers,
        localize,
        connection
      );

      const byName = (a: IntegrationListItem, b: IntegrationListItem) =>
        caseInsensitiveStringCompare(
          a.name || "",
          b.name || "",
          this.hass.locale.language
        );
      const ofCategory = (item: IntegrationListItem) =>
        inCategory(item.categories, category, subcategory);

      if (byBrand) {
        return [...integrations]
          .filter((item) => !brand || item.domain === brand)
          .sort(byName)
          .flatMap((item) => this._brandRows(item))
          .filter((row) => !brand || !row.is_header);
      }
      // A brand shows its integrations here, not itself, like the website
      if (category) {
        return [...integrations, ...helpers]
          .flatMap((item) =>
            item.domains
              ? this._brandRows(item)
                  .filter((row) => !row.is_header && !row.is_add)
                  .map((row) => ({ ...row, id: row.domain }))
              : [item]
          )
          .filter(ofCategory)
          .filter(
            (row, index, rows) =>
              rows.findIndex((other) => other.domain === row.domain) === index
          )
          .sort(byName);
      }
      return [...integrations].sort(byName);
    }
  );

  private _brandRows(item: IntegrationListItem): IntegrationListItem[] {
    const header: IntegrationListItem = {
      id: `${item.domain}/header`,
      domain: item.domain,
      name: item.name,
      is_header: true,
    };
    const brand = this._integrations?.[item.domain];
    if (
      !brand ||
      "integration_type" in brand ||
      item.is_helper ||
      (!brand.integrations && !brand.iot_standards)
    ) {
      return [header, { ...item, id: `${item.domain}/${item.domain}` }];
    }
    const localize = this.hass.localize;
    const protocols: IntegrationListItem[] = (brand.iot_standards || [])
      .map((standard) => standardToDomain[standard] || standard)
      .filter((domain) =>
        (PROTOCOL_INTEGRATIONS as readonly string[]).includes(domain)
      )
      .filter(() => this._connection !== "cloud")
      .map((domain) => ({
        id: `${item.domain}/add_${domain}`,
        interactive: true,
        domain,
        name: localize(
          `ui.panel.config.integrations.add_${domain}_device` as LocalizeKeys
        ),
        config_flow: true,
        is_built_in: true,
        is_add: true,
      }));
    const integrations: IntegrationListItem[] = Object.entries(
      brand.integrations || {}
    )
      .filter(([, integration]) => integration.integration_type !== "hardware")
      .map(([domain, brandIntegration]) => {
        // A custom integration replacing it brings its own details
        const custom = this._integrations?.[domain];
        const integration =
          custom && "integration_type" in custom && custom.is_built_in === false
            ? custom
            : brandIntegration;
        return {
          id: `${item.domain}/${domain}`,
          interactive: true,
          domain,
          name: integration.name || domainToName(localize, domain),
          config_flow: integration.config_flow,
          iot_standards: integration.iot_standards,
          supported_by: integration.supported_by,
          is_built_in: integration.is_built_in !== false,
          overwrites_built_in: integration.overwrites_built_in,
          cloud: integration.iot_class?.startsWith("cloud_"),
          single_config_entry: integration.single_config_entry,
          categories: integration.categories ?? brandIntegration.categories,
        };
      })
      .filter((row) => ofConnection(row, this._connection))
      .sort((a, b) =>
        caseInsensitiveStringCompare(a.name, b.name, this.hass.locale.language)
      );
    if (!integrations.length && !protocols.length) {
      return [];
    }
    return [header, ...protocols, ...integrations];
  }

  // Also brands with only protocol devices, like Matter
  private _isBrand(item: IntegrationListItem) {
    const entry = this._integrations?.[item.domain];
    return Boolean(item.domains || (entry && !("integration_type" in entry)));
  }

  // Single integrations are only under all brands
  private _getBrands = memoizeOne(
    (
      allIntegrations: Brands,
      allHelpers: Integrations,
      localize: LocalizeFunc,
      connection?: Connection
    ) =>
      this._getListItems(allIntegrations, allHelpers, localize, connection)
        .integrations.filter((item) => this._isBrand(item))
        .map((item) => ({
          item,
          count: this._brandRows(item).filter((row) => !row.is_header).length,
        }))
        .filter((brand) => brand.count)
        .sort((a, b) =>
          caseInsensitiveStringCompare(
            a.item.name,
            b.item.name,
            this.hass.locale.language
          )
        )
  );

  private _getCategoryCounts = memoizeOne(
    (
      integrations: IntegrationListItem[],
      helpers: IntegrationListItem[]
    ): Map<string, number> => {
      const counts = new Map<string, number>();
      const add = (slug: string) =>
        counts.set(slug, (counts.get(slug) || 0) + 1);
      const items = [...integrations, ...helpers].flatMap((item) =>
        item.domains
          ? this._brandRows(item).filter((row) => !row.is_header && !row.is_add)
          : [item]
      );
      // Integrations of more than one brand count once, as they are listed
      new Map(items.map((item) => [item.domain, item])).forEach((item) => {
        const slugs = new Set(item.categories);
        new Set([...slugs].map((slug) => slug.split(".")[0])).forEach(add);
        [...slugs].filter((slug) => slug.includes(".")).forEach(add);
      });
      return counts;
    }
  );

  private _getCategories = memoizeOne(
    (
      counts: Map<string, number>,
      localize: LocalizeFunc
    ): IntegrationCategory[] => {
      const categories = new Map<string, IntegrationCategory>();
      for (const slug of counts.keys()) {
        const [category, subcategory] = slug.split(".");
        const name = integrationCategoryName(localize, category);
        // Unknown to this Home Assistant version
        if (!name) {
          continue;
        }
        if (!categories.has(category)) {
          categories.set(category, { slug: category, name, subcategories: [] });
        }
        const subcategoryName =
          subcategory && integrationCategoryName(localize, slug);
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
      this.hass.localize,
      this._connection
    );
    return this._getCategoryCounts(integrations, helpers);
  }

  private _getIntegrations() {
    return this._filterIntegrations(
      this._integrations!,
      this._helpers!,
      this.hass.localize,
      this._category,
      this._subcategory,
      this._byBrand(),
      this._brand,
      this._connection
    );
  }

  private _getRows(): IntegrationListItem[] {
    if (!this._filter) {
      return this._getIntegrations();
    }
    const found = this._getFound();
    return this._getSearchRows(found, this._searchSection, this.hass.localize);
  }

  private _getFound() {
    return this._getSearchFound(
      this._integrations!,
      this._helpers!,
      this.hass.localize,
      this._filter!,
      this._categoryIcons,
      !this._integrationFilter,
      this._connection
    );
  }

  private _getSearchFound = memoizeOne(
    (
      allIntegrations: Brands,
      allHelpers: Integrations,
      localize: LocalizeFunc,
      filter: string,
      categoryIcons: IntegrationCategoryIcons | undefined,
      browse: boolean,
      connection?: Connection
    ): Record<SearchSection, IntegrationListItem[]> => {
      const { integrations, yamlIntegrations, helpers } = this._getListItems(
        allIntegrations,
        allHelpers,
        localize,
        connection
      );
      const search = (items: IntegrationListItem[]) =>
        new Fuse(items, searchOptions(filter))
          .search(filter)
          .map((result) => result.item);

      const integrationsByDomain = new Map<string, IntegrationListItem>();
      [...integrations, ...yamlIntegrations].forEach((item) => {
        const rows =
          item.domains || (browse && this._isBrand(item))
            ? this._brandRows(item).filter(
                (row) => !row.is_header && !row.is_add
              )
            : [item];
        rows.forEach((row) => {
          if (!integrationsByDomain.has(row.domain)) {
            integrationsByDomain.set(row.domain, { ...row, id: row.domain });
          }
        });
      });

      const brands: IntegrationListItem[] = browse
        ? this._getBrands(
            allIntegrations,
            allHelpers,
            localize,
            connection
          ).map(({ item }) => ({
            ...item,
            result: "brand",
            description: item.integrations?.join(", "),
          }))
        : [];

      const categories: IntegrationListItem[] = browse
        ? this._getCategories(this._getCounts(), localize).flatMap(
            (category) => [
              {
                id: category.slug,
                interactive: true,
                domain: "",
                name: category.name,
                icon: integrationCategoryIcon(categoryIcons, category.slug),
                is_built_in: true,
                result: "category" as const,
                category: category.slug,
              },
              ...category.subcategories.map((subcategory) => ({
                id: `${category.slug}.${subcategory.slug}`,
                interactive: true,
                domain: "",
                name: subcategory.name,
                description: category.name,
                icon:
                  integrationCategoryIcon(
                    categoryIcons,
                    `${category.slug}.${subcategory.slug}`
                  ) || integrationCategoryIcon(categoryIcons, category.slug),
                is_built_in: true,
                result: "category" as const,
                category: category.slug,
                subcategory: subcategory.slug,
              })),
            ]
          )
        : [];

      return {
        brand: search(brands),
        category: search(categories),
        integration: search([...integrationsByDomain.values()]),
        helper: search(helpers),
      };
    }
  );

  private _getSearchRows = memoizeOne(
    (
      found: Record<SearchSection, IntegrationListItem[]>,
      section: SearchSection | undefined,
      localize: LocalizeFunc
    ): IntegrationListItem[] =>
      SEARCH_SECTIONS.filter(
        (type) => found[type].length && (!section || section === type)
      ).flatMap((type) => {
        const items = found[type];
        const more =
          !section && items.length > MAX_SEARCH_ITEMS_PER_SECTION + 1;
        // `section/id`, so the section title sticks like a brand's
        return [
          {
            id: `${type}/header`,
            domain: type,
            name: localize(
              `ui.panel.config.integrations.search_section.${type}`
            ),
            is_header: true,
          },
          ...(more ? items.slice(0, MAX_SEARCH_ITEMS_PER_SECTION) : items).map(
            (item) => ({ ...item, id: `${type}/${item.id}` })
          ),
          ...(more
            ? [
                {
                  id: `${type}/more`,
                  interactive: true,
                  domain: "",
                  name: localize(
                    "ui.panel.config.integrations.search_show_more",
                    { count: items.length - MAX_SEARCH_ITEMS_PER_SECTION }
                  ),
                  icon: "mdi:unfold-more-horizontal",
                  is_built_in: true,
                  result: "more" as const,
                  section: type,
                },
              ]
            : []),
        ];
      })
  );

  private _byBrand() {
    return this._browseBy === "brand" && !this._integrationFilter;
  }

  protected render() {
    if (!this._open && !this._integrations && !this._helpers) {
      return nothing;
    }
    const integrations = this._integrations ? this._getRows() : undefined;

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
      : this._narrow && this._drilled
        ? this._browsingTitle()
        : this.hass.localize(
            "ui.panel.config.integrations.add_device_or_integration"
          );

    const headerSubtitle =
      !showingBrandView && this._narrow && this._drilled
        ? this._subcategory
          ? integrationCategoryName(this.hass.localize, this._category!)
          : this.hass.localize(
              "ui.panel.config.integrations.add_device_or_integration"
            )
        : undefined;

    return html`<ha-adaptive-dialog
      flexcontent
      .open=${this._open}
      header-title=${headerTitle}
      .headerSubtitle=${headerSubtitle}
      header-subtitle-position="above"
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
                this._narrow && this._drilled
                  ? html`<ha-icon-button-prev
                      slot="headerNavigationIcon"
                      @click=${this._drillOut}
                    ></ha-icon-button-prev>`
                  : nothing
              }
              ${this._renderAll(integrations)}
            `
      }
    </ha-adaptive-dialog>`;
  }

  private _browsingTitle(): string {
    if (this._showDiscoveredView) {
      return this.hass.localize("ui.panel.config.integrations.discovered");
    }
    if (this._brand) {
      return (
        this._integrations?.[this._brand]?.name ||
        domainToName(this.hass.localize, this._brand)
      );
    }
    if (!this._category) {
      return this.hass.localize(
        this._byBrand()
          ? "ui.panel.config.integrations.all_brands"
          : "ui.panel.config.integrations.all_integrations"
      );
    }
    return (
      (this._subcategory &&
        integrationCategoryName(
          this.hass.localize,
          `${this._category}.${this._subcategory}`
        )) ||
      integrationCategoryName(this.hass.localize, this._category)
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
      .boxed=${!integration}
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
    const browse = !this._integrationFilter;
    const showBrowse =
      browse && !this._filter && (!this._narrow || !this._drilled);
    const showItems =
      !this._narrow || !browse || this._drilled || !!this._filter;
    const rows = integrations;
    // A phone has it in the dialog's title
    const listTitle =
      !this._narrow && !this._filter && (this._category || this._brand)
        ? this._browsingTitle()
        : undefined;
    const sections = this._filter && browse;
    const subcategories =
      this._narrow && this._drilled && this._category && !this._subcategory
        ? this._getCategories(this._getCounts(), this.hass.localize).find(
            (category) => category.slug === this._category
          )?.subcategories || []
        : [];

    return html`${
        this._narrow && this._drilled
          ? nothing
          : html`<div class="search-row">
                <ha-input-search
                  appearance="outlined"
                  ?autofocus=${!this._narrow}
                  .value=${this._filter}
                  @input=${this._filterChanged}
                  .placeholder=${this.hass.localize(
                    "ui.panel.config.integrations.search_all"
                  )}
                  @keydown=${this._maybeSubmit}
                ></ha-input-search>
              </div>
              <div class="connection-row">
                ${
                  sections
                    ? html`${this._renderSearchSections()}
                        <div class="chip-separator" role="separator"></div>`
                    : browse
                      ? this._renderFilterChip(
                          "browse_by",
                          this._browseBy,
                          ["brand", "category"],
                          this._browseBySelected
                        )
                      : nothing
                }
                ${this._renderFilterChip(
                  "connection",
                  this._connection ?? "all",
                  ["all", ...CONNECTIONS],
                  this._connectionSelected
                )}
              </div>`
      }
      <div class=${classMap({ content: true, single: this._narrow })}>
        ${showBrowse ? this._renderCategoryTree() : nothing}
        ${
          showItems
            ? html`<div class="items">
                ${
                  this._showDiscoveredView && !this._filter
                    ? html`<div class="discovered">
                        ${this._renderBrandView(undefined, this._flowsInProgress || [])}
                      </div>`
                    : rows
                      ? html`${
                            this._filter && !rows.length
                              ? html`<div class="empty-search">
                                  ${this.hass.localize(
                                    "ui.panel.config.integrations.search_no_results",
                                    { term: this._filter }
                                  )}
                                </div>`
                              : nothing
                          }
                          ${
                            listTitle
                              ? html`<ha-integration-list-title
                                  class=${classMap({
                                    raised:
                                      this._listScrolled && !this._stickyBrand,
                                  })}
                                >
                                  ${listTitle}
                                </ha-integration-list-title>`
                              : nothing
                          }
                          ${
                            subcategories.length
                              ? this._renderSubcategories(subcategories)
                              : nothing
                          }
                          <div
                            class=${classMap({
                              list: true,
                              boxed: !!this._filter,
                            })}
                          >
                            ${
                              !this._stickyBrand
                                ? nothing
                                : this._filter
                                  ? html`<ha-section-title class="sticky">
                                      ${this._stickyBrand}
                                    </ha-section-title>`
                                  : html`<ha-integration-list-title
                                      class="sticky raised"
                                    >
                                      ${this._stickyBrand}
                                    </ha-integration-list-title>`
                            }
                            <ha-list-virtualized
                              .rows=${this._filter ? rows : this._withEndSpace(rows)}
                              .rowRenderer=${this._renderRow}
                              style=${styleMap({
                                display:
                                  this._filter && !rows.length ? "none" : "",
                              })}
                              @ha-list-visibility-changed=${this._visibilityChanged}
                            >
                            </ha-list-virtualized>
                          </div>`
                      : html`<div class="flex center">
                          <ha-spinner></ha-spinner>
                        </div>`
                }
              </div>`
            : nothing
        }
      </div>`;
  }

  private _renderSearchSections() {
    return SEARCH_SECTIONS.map(
      (section) =>
        html`<ha-filter-chip
          .section=${section}
          .selected=${this._searchSection === section}
          .label=${this.hass.localize(
            `ui.panel.config.integrations.search_section.${section}`
          )}
          @click=${this._searchSectionClicked}
        ></ha-filter-chip>`
    );
  }

  private _renderFilterChip(
    filter: "browse_by" | "connection",
    value: string,
    options: readonly string[],
    selected: (ev: HaDropdownSelectEvent) => void
  ) {
    const key = `ui.panel.config.integrations.${filter}` as const;
    return html`<ha-dropdown @wa-select=${selected}>
      <ha-assist-chip
        slot="trigger"
        .label=${this.hass.localize(`${key}.label`, {
          value: this.hass.localize(`${key}.${value}` as LocalizeKeys),
        })}
      >
        <ha-svg-icon slot="trailing-icon" .path=${mdiMenuDown}></ha-svg-icon>
      </ha-assist-chip>
      ${options.map(
        (option) =>
          html`<ha-dropdown-item
            .value=${option}
            class=${classMap({ selected: value === option })}
          >
            ${this.hass.localize(`${key}.${option}` as LocalizeKeys)}
            ${
              option === "cloud"
                ? html`<span class="option-description">
                      ${this.hass.localize(
                        "ui.panel.config.integrations.config_entry.depends_on_cloud"
                      )}
                    </span>
                    <ha-svg-icon slot="details" .path=${mdiWeb}></ha-svg-icon>`
                : nothing
            }
          </ha-dropdown-item>`
      )}
    </ha-dropdown>`;
  }

  private _connectionSelected(ev: HaDropdownSelectEvent) {
    const value = ev.detail.item.value;
    this._connection = value === "all" ? undefined : (value as Connection);
    this._dropEmptySelection();
  }

  // A category passed in, or emptied by the connection filter, isn't in the
  // browse pane, so fall back to its parent or everything
  private _dropEmptySelection() {
    if (!this._integrations || !this._helpers) {
      return;
    }
    const counts = this._getCounts();
    if (
      this._subcategory &&
      !counts.has(`${this._category}.${this._subcategory}`)
    ) {
      this._subcategory = undefined;
    }
    if (this._category && !counts.has(this._category)) {
      this._category = undefined;
    }
    if (
      this._brand &&
      !this._getBrands(
        this._integrations,
        this._helpers,
        this.hass.localize,
        this._connection
      ).some(({ item }) => item.domain === this._brand)
    ) {
      this._brand = undefined;
    }
  }

  private _searchSectionClicked(
    ev: HASSDomCurrentTargetEvent<HaFilterChip & { section: SearchSection }>
  ) {
    const section = ev.currentTarget.section;
    this._searchSection = this._searchSection === section ? undefined : section;
  }

  private _activateResult(row: IntegrationListItem) {
    if (row.result === "more") {
      this._searchSection = row.section;
      return;
    }
    if (row.result === "brand") {
      this._browseBy = "brand";
      this._browse({ brand: row.domain });
    } else {
      this._browseBy = "category";
      this._browse({ category: row.category, subcategory: row.subcategory });
    }
  }

  private _browse(
    view: {
      brand?: string;
      category?: string;
      subcategory?: string;
      discovered?: boolean;
    } = {}
  ) {
    this._filter = "";
    this._searchSection = undefined;
    this._showDiscoveredView = !!view.discovered;
    this._brand = view.brand;
    this._category = view.category;
    this._subcategory = view.subcategory;
    if (view.category) {
      this._expanded = new Set([...this._expanded, view.category]);
    }
    this._drillIn();
  }

  // Arrow function: the list renders the rows
  private _resultPicked = (
    ev: HASSDomCurrentTargetEvent<HaIntegrationListItem>
  ) => {
    this._activateResult(ev.currentTarget.integration);
  };

  private static _SUBCATEGORIES_SHOWN = 4;

  private _renderSubcategories(
    subcategories: IntegrationCategory["subcategories"]
  ) {
    const counts = this._getCounts();
    const more =
      !this._subcategoriesExpanded &&
      subcategories.length > AddIntegrationDialog._SUBCATEGORIES_SHOWN;
    const shown = more
      ? subcategories.slice(0, AddIntegrationDialog._SUBCATEGORIES_SHOWN)
      : subcategories;
    return html`<div class="subcategories">
      <ha-section-title>
        ${this.hass.localize("ui.panel.config.integrations.subcategories")}
      </ha-section-title>
      <ha-list-base>
        ${shown.map((subcategory) => {
          const icon = integrationCategoryIcon(
            this._categoryIcons,
            `${this._category}.${subcategory.slug}`
          );
          return html`<ha-list-item-button
            .category=${this._category}
            .subcategory=${subcategory.slug}
            @click=${this._categoryPicked}
          >
            ${
              icon
                ? html`<ha-icon slot="start" .icon=${icon}></ha-icon>`
                : nothing
            }
            <span slot="headline">${subcategory.name}</span>
            <span slot="end" class="count">
              ${counts.get(`${this._category}.${subcategory.slug}`) || 0}
            </span>
            <ha-icon-next slot="end"></ha-icon-next>
          </ha-list-item-button>`;
        })}
      </ha-list-base>
      ${
        more
          ? html`<div class="show-more">
              <ha-button
                appearance="filled"
                @click=${this._expandSubcategories}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.show_more"
                )}
              </ha-button>
            </div>`
          : nothing
      }
    </div>`;
  }

  private _expandSubcategories() {
    this._subcategoriesExpanded = true;
  }

  private _drillIn() {
    if (!this._narrow) {
      return;
    }
    this._drilled = true;
    this._focusAfterDrill = "in";
  }

  private _drillOut() {
    if (this._subcategory) {
      this._subcategory = undefined;
      return;
    }
    this._drilled = false;
    this._focusAfterDrill = "out";
  }

  private _withEndSpace = memoizeOne(
    (rows: IntegrationListItem[]): IntegrationListItem[] => [
      ...rows,
      { id: "end-space", domain: "", name: "", is_end_space: true },
    ]
  );

  private _renderCategoryTree() {
    const counts = this._getCounts();
    const categories = this._getCategories(counts, this.hass.localize);
    const discovered = this._flowsInProgress?.length || 0;
    const protocols = PROTOCOL_INTEGRATIONS.filter((domain) =>
      this._hasProtocol(domain)
    );
    const browsingAll =
      !this._filter &&
      !this._showDiscoveredView &&
      !this._category &&
      !this._brand;

    const discoveredRow = discovered
      ? html`<ha-list-item-button
          class=${classMap({
            selected: !this._filter && this._showDiscoveredView,
          })}
          @click=${this._discoveredPicked}
        >
          <ha-svg-icon slot="start" .path=${mdiRadar}></ha-svg-icon>
          <span slot="headline">
            ${this.hass.localize("ui.panel.config.integrations.discovered")}
          </span>
          <ha-label slot="end" dense>${discovered}</ha-label>
          ${this._narrow ? html`<ha-icon-next slot="end"></ha-icon-next>` : nothing}
        </ha-list-item-button>`
      : nothing;
    const protocolRows = protocols.map(
      (domain) => html`
        <ha-list-item-button .protocol=${domain} @click=${this._protocolPicked}>
          <ha-domain-icon
            slot="start"
            brand-fallback
            .domain=${domain}
          ></ha-domain-icon>
          <span slot="headline">
            ${this.hass.localize(
              `ui.panel.config.integrations.add_${domain}_device` as LocalizeKeys
            )}
          </span>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-button>
      `
    );

    return html`<div class="pane">
      <div
        class=${classMap({ groups: true, browse: true, narrow: this._narrow })}
      >
        ${
          discovered || protocols.length
            ? html`<ha-section-title>
                  ${this.hass.localize("ui.panel.config.integrations.add_a_device")}
                </ha-section-title>
                <ha-list-base>${discoveredRow}${protocolRows}</ha-list-base>`
            : nothing
        }
        <ha-section-title>
          ${this.hass.localize("ui.panel.config.integrations.browse")}
        </ha-section-title>
        ${
          this._browseBy === "brand"
            ? this._renderBrandList()
            : this._renderCategories(counts, categories, browsingAll)
        }
      </div>
    </div>`;
  }

  private _renderCategories(
    counts: Map<string, number>,
    categories: IntegrationCategory[],
    browsingAll: boolean
  ) {
    const label = this.hass.localize("ui.panel.config.integrations.browse");
    const allLabel = this.hass.localize(
      "ui.panel.config.integrations.all_integrations"
    );
    const isCurrent = (slug: string) =>
      !this._filter &&
      !this._showDiscoveredView &&
      !this._brand &&
      slug === this._category;
    const icon = (iconName?: string, slot?: string) =>
      iconName
        ? html`<ha-icon slot=${ifDefined(slot)} .icon=${iconName}></ha-icon>`
        : nothing;

    if (this._narrow) {
      return html`<ha-list-base aria-label=${label}>
        <ha-list-item-button
          class=${classMap({ selected: browsingAll })}
          @click=${this._allPicked}
        >
          <ha-svg-icon slot="start" .path=${mdiViewGridOutline}></ha-svg-icon>
          <span slot="headline">${allLabel}</span>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-button>
        <wa-divider></wa-divider>
        ${categories.map(
          (category) =>
            html`<ha-list-item-button
              class=${classMap({ selected: isCurrent(category.slug) })}
              .category=${category.slug}
              @click=${this._categoryPicked}
            >
              ${icon(integrationCategoryIcon(this._categoryIcons, category.slug), "start")}
              <span slot="headline">${category.name}</span>
              <span slot="end" class="count"
                >${counts.get(category.slug) || 0}</span
              >
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-list-item-button>`
        )}
      </ha-list-base>`;
    }

    return html`<wa-tree
      aria-label=${label}
      @wa-selection-change=${this._treeSelectionChanged}
      @wa-expand=${this._treeExpandChanged}
      @wa-collapse=${this._treeExpandChanged}
    >
      <wa-tree-item .selected=${live(browsingAll)}>
        <ha-svg-icon .path=${mdiViewGridOutline}></ha-svg-icon>
        <span class="name">${allLabel}</span>
      </wa-tree-item>
      <wa-divider></wa-divider>
      ${categories.map((category) => {
        const current = isCurrent(category.slug);
        return html`<wa-tree-item
          .category=${category.slug}
          .selected=${live(current && !this._subcategory)}
          .expanded=${live(this._expanded.has(category.slug))}
        >
          ${icon(integrationCategoryIcon(this._categoryIcons, category.slug))}
          <span class="name">${category.name}</span>
          <span class="count">${counts.get(category.slug) || 0}</span>
          ${category.subcategories.map(
            (subcategory) =>
              html`<wa-tree-item
                .category=${category.slug}
                .subcategory=${subcategory.slug}
                .selected=${live(current && subcategory.slug === this._subcategory)}
              >
                ${icon(
                  integrationCategoryIcon(
                    this._categoryIcons,
                    `${category.slug}.${subcategory.slug}`
                  )
                )}
                <span class="name">${subcategory.name}</span>
                <span class="count"
                  >${
                    counts.get(`${category.slug}.${subcategory.slug}`) || 0
                  }</span
                >
              </wa-tree-item>`
          )}
        </wa-tree-item>`;
      })}
    </wa-tree>`;
  }

  private _browseBySelected(ev: HaDropdownSelectEvent) {
    this._browseBy = ev.detail.item.value as BrowseBy;
    this._showDiscoveredView = false;
    this._category = undefined;
    this._subcategory = undefined;
    this._brand = undefined;
  }

  private _renderBrandList() {
    const brands = this._integrations
      ? this._getBrands(
          this._integrations,
          this._helpers!,
          this.hass.localize,
          this._connection
        )
      : [];
    const allBrands =
      !this._filter && !this._showDiscoveredView && !this._brand;
    return html`<ha-list-base
      aria-label=${this.hass.localize("ui.panel.config.integrations.browse")}
    >
      <ha-list-item-button
        class=${classMap({ selected: allBrands })}
        @click=${this._brandPicked}
      >
        <ha-svg-icon slot="start" .path=${mdiViewGridOutline}></ha-svg-icon>
        <span slot="headline">
          ${this.hass.localize("ui.panel.config.integrations.all_brands")}
        </span>
        ${this._narrow ? html`<ha-icon-next slot="end"></ha-icon-next>` : nothing}
      </ha-list-item-button>
      <wa-divider></wa-divider>
      ${brands.map(
        ({ item, count }) =>
          html`<ha-list-item-button
            class=${classMap({
              selected:
                !this._filter &&
                !this._showDiscoveredView &&
                item.domain === this._brand,
            })}
            .brand=${item.domain}
            @click=${this._brandPicked}
          >
            <ha-domain-icon
              slot="start"
              brand-fallback
              .domain=${item.domain}
            ></ha-domain-icon>
            <span slot="headline">${item.name}</span>
            <span slot="end" class="count">${count}</span>
            ${this._narrow ? html`<ha-icon-next slot="end"></ha-icon-next>` : nothing}
          </ha-list-item-button>`
      )}
    </ha-list-base>`;
  }

  private _brandPicked(
    ev: HASSDomCurrentTargetEvent<HaListItemButton & { brand?: string }>
  ) {
    this._browse({ brand: ev.currentTarget.brand });
  }

  private _discoveredPicked() {
    this._browse({ discovered: true });
  }

  private _protocolPicked(
    ev: HASSDomCurrentTargetEvent<HaListItemButton & { protocol: string }>
  ) {
    const domain = ev.currentTarget.protocol;
    protocolIntegrationPicked(this, this.hass, domain);
    this.closeDialog();
  }

  private _treeSelectionChanged(ev: WaSelectionChangeEvent) {
    const item = ev.detail.selection[0] as
      (WaTreeItem & { category?: string; subcategory?: string }) | undefined;
    if (item) {
      this._browse({ category: item.category, subcategory: item.subcategory });
    }
  }

  private _treeExpandChanged(
    ev: HASSDomTargetEvent<WaTreeItem & { category: string }>
  ) {
    const { category } = ev.target;
    const open = ev.type === "wa-expand";
    if (this._expanded.has(category) === open) {
      return;
    }
    const expanded = new Set(this._expanded);
    if (open) {
      expanded.add(category);
    } else {
      expanded.delete(category);
    }
    this._expanded = expanded;
  }

  private _allPicked() {
    this._browse();
  }

  private _categoryPicked(
    ev: HASSDomCurrentTargetEvent<
      HaListItemButton & { category: string; subcategory?: string }
    >
  ) {
    const { category, subcategory } = ev.currentTarget;
    this._browse({ category, subcategory });
  }

  private _isDiscovered(integration: IntegrationListItem) {
    return Boolean(
      !integration.result &&
      !integration.is_add &&
      !this._integrationFilter &&
      integration.config_flow &&
      this._getFlowsInProgressForDomains([integration.domain]).length
    );
  }

  // Must match what _handleIntegrationPicked does
  private _leadsToNextStep(integration: IntegrationListItem) {
    if (integration.result) {
      return true;
    }
    if (integration.supported_by) {
      return false;
    }
    return Boolean(
      integration.is_add ||
      integration.integrations ||
      integration.iot_standards ||
      (!this._integrationFilter &&
        (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
          integration.domain
        ) &&
        this._hasProtocol(integration.domain)) ||
      this._isDiscovered(integration)
    );
  }

  // The virtualizer positions rows, so CSS sticky can't hold the brand
  @eventOptions({ passive: true })
  private _visibilityChanged(ev: HASSDomEvent<HaListVisibilityChangedDetail>) {
    const rows = this._getRows();
    const row = rows[ev.detail.first];
    this._listScrolled = ev.detail.first > 0;
    const brand = row?.id.includes("/")
      ? rows.find((item) => item.id === `${row.id.split("/")[0]}/header`)
      : undefined;
    this._stickyBrand =
      row && !row.is_header && !rows[ev.detail.first + 1]?.is_header
        ? brand?.name
        : undefined;
  }

  private _renderRow = (integration: IntegrationListItem) => {
    if (!integration) {
      return nothing;
    }
    if (integration.is_end_space) {
      return html`<div style="height: var(--ha-space-2)"></div>`;
    }
    if (integration.is_header) {
      return this._filter
        ? html`<ha-section-title>${integration.name}</ha-section-title>`
        : html`<ha-integration-list-title>
            ${integration.name}
          </ha-integration-list-title>`;
    }
    return html`
      <ha-integration-list-item
        ?card=${!this._filter}
        @click=${
          integration.result ? this._resultPicked : this._integrationPicked
        }
        .integration=${integration}
        .opensFlow=${!this._leadsToNextStep(integration)}
        .discovered=${this._isDiscovered(integration)}
      >
      </ha-integration-list-item>
    `;
  };

  private async _load(integrationFilter?: IntegrationFilter) {
    const loadId = ++this._loadId;
    getIntegrationCategoryIcons(this.hass.connection).then((icons) => {
      this._categoryIcons = icons;
    });
    // `hass` changes don't rerender this dialog, so load names first
    const [descriptions, flowsInProgress] = await Promise.all([
      getIntegrationDescriptions(this.hass),
      fetchConfigFlowInProgress(this.hass.connection),
      this.hass.loadBackendTranslation("integration_category", "homeassistant"),
    ]);

    if (loadId !== this._loadId) {
      return;
    }

    // Filter discovered flows
    this._flowsInProgress = flowsInProgress.filter((flow) =>
      DISCOVERY_SOURCES.includes(flow.context.source)
    );
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

    this._dropEmptySelection();
  }

  private async _filterChanged(ev: HASSDomTargetEvent<HaInputSearch>) {
    this._filter = ev.target.value ?? "";
    if (!this._filter) {
      this._searchSection = undefined;
    }
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
      this._hasProtocol(integration.domain)
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

    // The integration list isn't on screen
    if (
      !this._filter &&
      (this._showDiscoveredView ||
        (this._narrow && !this._drilled && !this._integrationFilter))
    ) {
      return;
    }

    const row = this._getRows().find(
      (item) => !item.is_header && item.result !== "more"
    );

    if (row?.result) {
      this._activateResult(row);
    } else if (row) {
      this._handleIntegrationPicked(row);
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
      ha-adaptive-dialog {
        --dialog-content-padding: 0;
        /* Fixed height, so switching views doesn't resize it */
        --add-integration-sheet-height: calc(
          100vh - max(var(--safe-area-inset-top), var(--ha-space-12))
        );
        --ha-bottom-sheet-height: var(--add-integration-sheet-height);
        --ha-bottom-sheet-max-height: var(--add-integration-sheet-height);
        --add-integration-height: min(
          920px,
          calc(
            100vh - max(var(--safe-area-inset-bottom), var(--ha-space-4)) - max(
                var(--safe-area-inset-top),
                var(--ha-space-4)
              )
          )
        );
        --ha-dialog-min-height: var(--add-integration-height);
        --ha-dialog-max-height: var(--add-integration-height);
      }
      /* A custom property doesn't fall back to an earlier one it can't use */
      @supports (height: 100dvh) {
        ha-adaptive-dialog {
          --add-integration-sheet-height: calc(
            100dvh - max(var(--safe-area-inset-top), var(--ha-space-12))
          );
          --add-integration-height: min(
            920px,
            calc(
              100dvh - max(
                  var(--safe-area-inset-bottom),
                  var(--ha-space-4)
                ) - max(var(--safe-area-inset-top), var(--ha-space-4))
            )
          );
        }
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
      .connection-row {
        display: flex;
        gap: var(--ha-space-2);
        margin: calc(var(--ha-space-1) * -1) 0 var(--ha-space-4);
        padding: 0 var(--ha-space-4);
        overflow-x: auto;
        /* overflow-x alone would also allow vertical scrolling */
        overflow-y: hidden;
        overscroll-behavior-x: contain;
        scrollbar-width: none;
        flex-shrink: 0;
        --ha-assist-chip-container-shape: var(--ha-border-radius-md);
      }
      .connection-row > * {
        flex-shrink: 0;
      }
      ha-dropdown-item.selected {
        border: 1px solid var(--primary-color);
        font-weight: var(--ha-font-weight-medium);
        color: var(--primary-color);
        background-color: var(--ha-color-fill-primary-quiet-resting);
      }
      .option-description {
        display: block;
        font-size: var(--ha-font-size-s);
        font-weight: var(--ha-font-weight-normal);
        color: var(--ha-color-text-secondary);
      }
      .content {
        display: flex;
        flex: 1;
        min-height: 0;
      }
      .items,
      .list {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .list,
      .discovered,
      ha-list-virtualized {
        flex: 1;
        min-height: 0;
      }
      .pane {
        flex: 0 0 300px;
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-3);
        min-height: 0;
        margin-block-end: var(--ha-space-4);
        margin-inline-start: var(--ha-space-4);
      }
      .single .pane {
        flex: 1;
        margin-inline-end: var(--ha-space-4);
      }
      .groups {
        overflow: auto;
        border-radius: var(--ha-border-radius-xl);
        border: 1px solid var(--ha-color-border-neutral-quiet);
      }
      .groups.browse {
        flex: 1;
        min-height: 0;
      }
      .items {
        flex: 1;
        min-width: 0;
        position: relative;
      }
      .chip-separator {
        width: 1px;
        margin: var(--ha-space-1) 0;
        background-color: var(--divider-color);
      }
      .connection-row ha-filter-chip {
        --ha-filter-chip-selected-container-color: var(
          --ha-color-fill-primary-normal-hover
        );
        color: var(--primary-color);
      }
      .empty-search {
        display: flex;
        justify-content: center;
        padding: var(--ha-space-6) var(--ha-space-3) var(--ha-space-3);
        margin: 0 var(--ha-space-4);
        border-radius: var(--ha-border-radius-xl);
        background-color: var(--ha-color-surface-default);
        color: var(--ha-color-text-secondary);
      }
      ha-integration-list-title.raised {
        position: relative;
        z-index: 1;
        box-shadow: var(--bar-box-shadow);
        clip-path: inset(0 0 -16px 0);
        border-bottom: 1px solid var(--ha-color-border-neutral-quiet);
      }
      .list {
        position: relative;
      }
      .subcategories {
        position: relative;
        box-sizing: border-box;
        margin: 0 var(--ha-space-4) var(--ha-space-3);
        border: 1px solid var(--ha-color-border-neutral-quiet);
        border-radius: var(--ha-border-radius-xl);
        overflow: hidden;
        flex-shrink: 0;
      }
      .subcategories ha-list-item-button {
        --ha-row-item-padding-block: var(--ha-space-1);
        --ha-row-item-padding-inline: var(--ha-space-3);
        --ha-row-item-min-height: var(--ha-space-10);
      }
      .subcategories ha-list-item-button::part(start),
      .subcategories .count {
        color: var(--ha-color-on-neutral-quiet);
      }
      .subcategories .show-more {
        display: flex;
        justify-content: center;
        position: absolute;
        bottom: 0;
        width: 100%;
        padding-bottom: var(--ha-space-2);
        box-shadow: inset 0 -8px 12px 0 rgba(0, 0, 0, 0.06);
        z-index: 2;
      }
      .list.boxed {
        margin: 0 var(--ha-space-4) var(--ha-space-4);
        border: 1px solid var(--ha-color-border-neutral-quiet);
        border-radius: var(--ha-border-radius-xl);
        overflow: hidden;
      }
      .list .sticky {
        position: absolute;
        top: 0;
        inset-inline: 0;
        z-index: 1;
      }
      /* Keep focused rows clear of the sticky brand */
      .items ha-list-virtualized {
        --ha-list-scroll-padding-block-start: var(--ha-space-10);
        --ha-row-item-padding-inline: var(--ha-space-3);
        --ha-row-item-padding-block: var(--ha-space-2);
      }
      .discovered {
        overflow: auto;
      }
      .groups ha-list-item-button {
        --ha-row-item-padding-block: var(--ha-space-1);
        --ha-row-item-padding-inline: var(--ha-space-3);
        --ha-row-item-min-height: var(--ha-space-10);
      }
      .groups ha-icon-next {
        color: var(--ha-color-on-neutral-quiet);
      }
      .groups ha-list-item-button::part(start) {
        color: var(--ha-color-on-neutral-quiet);
      }
      .groups ha-section-title {
        position: sticky;
        top: 0;
        z-index: 1;
      }
      .groups .count {
        color: var(--ha-color-text-secondary);
        font-size: var(--ha-font-size-s);
        /* Digits have no descenders, centering the line box sets them high */
        text-box: trim-both cap alphabetic;
      }
      .groups ha-label {
        border: none;
        --ha-label-background-color: var(
          --ha-color-fill-primary-normal-resting
        );
        --ha-label-text-color: var(--ha-color-on-primary-normal);
      }
      .groups wa-divider {
        --spacing: var(--ha-space-2);
      }
      /* The inline icon's line box pushes it off center */
      .groups ha-icon,
      .groups ha-domain-icon {
        display: flex;
      }
      wa-tree {
        --wa-color-neutral-fill-quiet: var(
          --ha-color-fill-primary-normal-active
        );
      }
      wa-tree-item::part(item) {
        height: var(--ha-space-10);
        padding: var(--ha-space-1) var(--ha-space-3);
        cursor: pointer;
        border-inline-start: 0;
      }
      wa-tree-item::part(label) {
        flex: 1;
        min-width: 0;
        gap: var(--ha-space-3);
      }
      wa-tree-item::part(item):hover {
        background-color: var(--ha-color-fill-neutral-quiet-hover);
      }
      wa-tree-item[selected]::part(item):hover {
        background-color: var(--ha-color-fill-primary-normal-hover);
      }
      wa-tree-item ha-icon,
      wa-tree-item ha-svg-icon {
        color: var(--ha-color-on-neutral-quiet);
      }
      wa-tree-item[selected] > ha-icon,
      wa-tree-item[selected] > ha-svg-icon,
      wa-tree-item[selected] > .name {
        color: var(--ha-color-on-primary-normal);
      }
      wa-tree-item .name {
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .groups:not(.narrow) .selected {
        background-color: var(--ha-color-fill-primary-normal-active);
        --icon-primary-color: var(--ha-color-on-primary-normal);
      }
      .groups:not(.narrow) .selected::part(headline),
      .groups:not(.narrow) .selected::part(start) {
        color: var(--ha-color-on-primary-normal);
      }
      .groups:not(.narrow) .selected ha-label {
        --ha-label-background-color: var(--ha-color-fill-primary-loud-resting);
        --ha-label-text-color: var(--ha-color-on-primary-loud);
      }
      @media all and (max-width: 450px), all and (max-height: 500px) {
        .pane {
          flex: 1 1 auto;
          margin-inline-end: var(--ha-space-4);
        }
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
