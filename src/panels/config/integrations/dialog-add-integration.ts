import {
  mdiCellphone,
  mdiChevronRight,
  mdiRadar,
  mdiMenuDown,
  mdiCheckDecagram,
  mdiStar,
  mdiViewGridOutline,
  mdiWeb,
} from "@mdi/js";
import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, eventOptions, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
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
import { ADAPTIVE_DIALOG_MEDIA_QUERY } from "../../../components/ha-adaptive-dialog";
import { storage } from "../../../common/decorators/storage";
import "@home-assistant/webawesome/dist/components/divider/divider";
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
import { standardToDomain } from "./ha-domain-integrations";
import "./ha-integration-list-item";
import type { HaIntegrationListItem } from "./ha-integration-list-item";
import type { AddIntegrationDialogParams } from "./show-add-integration-dialog";
import { showYamlIntegrationDialog } from "./show-add-integration-dialog";
import { showSingleConfigEntryWarning } from "./show-single-config-entry-warning";
import { addIntegrationDemo } from "./demo-add-integration"; // DEMO

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
  // A brand's name above its integrations, not something to pick
  is_header?: boolean;
  integration_type?: string;
  // Search results that are not integrations: a brand or a category to
  // browse, or showing more of a section
  result?: "brand" | "category" | "more";
  category?: string;
  subcategory?: string;
  section?: SearchSection;
  // An icon like `mdi:shape`, instead of the domain's
  icon?: string;
  description?: string;
  categories?: string[];
}

type BrowseBy = "category" | "brand";

// Like the website's filter: what needs the cloud, and what doesn't
type Connection = "local" | "cloud";

const CONNECTIONS: Connection[] = ["local", "cloud"];

interface ListFilters {
  connection?: Connection;
}

const ofFilters = (item: IntegrationListItem, filters?: ListFilters) =>
  !filters?.connection || (filters.connection === "cloud") === !!item.cloud;

type SearchSection = "brand" | "category" | "integration" | "helper";

const SEARCH_SECTIONS: SearchSection[] = [
  "brand",
  "category",
  "integration",
  "helper",
];

// Picked like a collection: what the apps on the user's phone suggest. The
// companion app would match a fixed list of brand apps on the phone and send
// only the integrations, never the apps.
const PHONE = "_phone";

// Like the automation editor's search, a section shows this many until it
// is picked
const MAX_SEARCH_ITEMS_PER_SECTION = 5;

// ponytail: TEMPORARY copies of what home-assistant.io/integrations marks
// `featured: true` and `works_with` (Works with Home Assistant). Core should
// send these, so they stay in step with the website.
// Picked like a brand, by its key, but lists these from every brand
const COLLECTIONS: Record<string, { icon: string; domains: string[] }> = {
  _featured: {
    icon: mdiStar,
    domains: [
      "alexa",
      "cast",
      "esphome",
      "google_assistant",
      "homekit",
      "hue",
      "knx",
      "lutron_caseta",
      "matter",
      "mqtt",
      "music_assistant",
      "plex",
      "shelly",
      "smartthings",
      "sonos",
      "tradfri",
      "zha",
      "zwave_js",
    ],
  },
  _works_with: {
    icon: mdiCheckDecagram,
    domains: [
      "airgradient",
      "apollo_automation",
      "aqara",
      "bega",
      "eltako",
      "eve",
      "fireavert",
      "frient",
      "heatit",
      "heiman",
      "homeseer",
      "homewizard",
      "iotorero",
      "jasco",
      "konnected_esphome",
      "ledvance",
      "leviton_z_wave",
      "motionblinds_matter",
      "nuki_matter",
      "reolink",
      "sensereo",
      "shelly",
      "switchbot",
      "third_reality",
      "ubisys",
      "ultraloq",
      "zooz",
      "zunzunbee",
    ],
  },
};

const searchOptions = (filter: string): IFuseOptions<IntegrationListItem> => ({
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
});

interface IntegrationCategory {
  slug: string;
  name: string;
  subcategories: { slug: string; name: string }[];
}

// Where the icons of the cards start: the card's margin, border and padding.
// Titles start there too.
const TITLE_INSET =
  "calc(var(--ha-space-4) + 1px + var(--ha-row-item-padding-inline))";

// A brand's name in the list, like the titles of the automation editor's
// items. Rows render in the list's shadow root, so the style is inline.
const ROW_TITLE_STYLE = {
  display: "flex",
  "align-items": "center",
  "box-sizing": "border-box",
  "min-height": "40px",
  padding: `var(--ha-space-2) var(--ha-space-3) var(--ha-space-2) ${TITLE_INSET}`,
  "font-weight": "var(--ha-font-weight-medium)",
  "background-color": "var(--card-background-color)",
};

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

  // On a phone: showing what was picked in the browse pane, full width
  // like the automation editor, instead of the browse pane
  @state() private _drilled = false;

  @state() private _integrationFilter?: IntegrationFilter;

  @state() private _pickedBrand?: string;

  // Group the list by brand, or filter it by category; kept between opens
  @state()
  @storage({
    key: "add-integration-browse-by",
    state: true,
    subscribe: false,
  })
  private _browseBy: BrowseBy = "brand";

  // The brand the top row of the list belongs to, held above the list
  @state() private _stickyBrand?: string;

  // On a phone, all of a category's subcategories are shown, not the first
  @state() private _subcategoriesExpanded = false;

  // Only what works without the cloud, or only what needs it
  @state() private _connection?: Connection;

  // Only devices, hubs, or services
  // The section of the search results picked with its chip
  @state() private _searchSection?: SearchSection;

  // The list is scrolled, its title casts a shadow over it
  @state() private _listScrolled = false;

  // Browsing by brand: the brand the list is filtered to
  @state() private _brand?: string;

  @state() private _prevPickedBrand?: string;

  @state() private _flowsInProgress?: DataEntryFlowProgress[];

  @state() private _showDiscovered = false;

  @state() private _openedDirectly = false;

  @state() private _navigateToResult = false;

  @state() private _open = false;

  // One pane, the list with a filter button, instead of the tree next to it
  @state() private _narrow = false;

  // A bottom sheet instead of a dialog, like ha-adaptive-dialog picks
  @state() private _sheet = false;

  @query("ha-list-virtualized") private _listElement?: HaListVirtualized;

  private _width?: number;

  private _height?: number;

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
    // Below this, the tree leaves too little room for the integrations
    this._narrowQuery = matchMedia(
      "all and (max-width: 700px), all and (max-height: 500px)"
    );
    this._narrowQuery.addEventListener("change", this._narrowChanged);
    this._narrow = addIntegrationDemo.narrow ?? this._narrowQuery.matches; // DEMO
    // DEMO: each scenario opens in its own view
    if (Object.keys(addIntegrationDemo).length) {
      this._browseBy = addIntegrationDemo.browseBy ?? "brand";
    }
    // ha-adaptive-dialog keeps the mode it opened in, so this doesn't listen
    this._sheet = matchMedia(ADAPTIVE_DIALOG_MEDIA_QUERY).matches;
  }

  // DEMO: no phone sends its apps yet
  private _phoneApps(): Record<string, string> | undefined {
    return addIntegrationDemo.phoneApps;
  }

  // DEMO
  private _hasProtocol(domain: string) {
    return (
      addIntegrationDemo.protocols ??
      this.hass.config.components.includes(domain)
    );
  }

  private _removeMediaListeners() {
    this._narrowQuery?.removeEventListener("change", this._narrowChanged);
    this._narrowQuery = undefined;
  }

  // Turning a tablet or resizing the window switches between the phone list
  // and the category tree
  private _narrowChanged = (ev: MediaQueryListEvent) => {
    this._narrow = ev.matches;
    // A phone starts again on the browse pane
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
    this._width = undefined;
    this._height = undefined;
    this._loadId++;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  // The list element stays while what it shows changes, so it would keep
  // where it was scrolled to
  private _scrollToTop = false;

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (this._scrollToTop) {
      this._scrollToTop = false;
      this._listElement?.scrollElement?.scrollTo({ top: 0 });
    }
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      loadVirtualizer();
    }

    // A new list starts at its top, until it reports what is visible
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
      localize: LocalizeFunc,
      filters?: ListFilters
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
            integration_type: supportedIntegration.integration_type,
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
            integration_type: integration.integration_type,
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
        integration_type: "helper",
        is_built_in: integration.is_built_in !== false,
        cloud: integration.iot_class?.startsWith("cloud_"),
        categories: integration.categories,
      }));

      // A brand is in it when one of its integrations is
      const ofThisConnection = (item: IntegrationListItem) =>
        item.domains
          ? this._brandRows(item).some((row) => !row.is_header)
          : ofFilters(item, filters);
      return {
        integrations: integrations.filter(ofThisConnection),
        yamlIntegrations: yamlIntegrations.filter(ofThisConnection),
        helpers: helpers.filter(ofThisConnection),
      };
    }
  );

  private _filterIntegrations = memoizeOne(
    (
      i: Brands,
      h: Integrations,
      localize: LocalizeFunc,
      category?: string,
      subcategory?: string,
      byBrand = false,
      brand?: string,
      filters?: ListFilters,
      phoneApps?: Record<string, string>
    ): IntegrationListItem[] => {
      const { integrations, helpers } = this._getListItems(
        i,
        h,
        localize,
        filters
      );

      const byName = (a: IntegrationListItem, b: IntegrationListItem) =>
        caseInsensitiveStringCompare(
          a.name || "",
          b.name || "",
          this.hass.locale.language
        );
      const ofCategory = (item: IntegrationListItem) =>
        inCategory(item.categories, category, subcategory);

      // Wherever they are in a brand, without the brands
      // A brand in it as the brand, otherwise the brand's integrations in it
      const domains =
        brand === PHONE
          ? Object.keys(phoneApps ?? {})
          : brand && COLLECTIONS[brand]?.domains;
      if (domains) {
        return [...integrations]
          .sort(byName)
          .flatMap((item) =>
            domains.includes(item.domain)
              ? [item]
              : this._brandRows(item).filter(
                  (row) =>
                    !row.is_header &&
                    !row.is_add &&
                    domains.includes(row.domain)
                )
          )
          .filter(
            (row, index, rows) =>
              rows.findIndex((other) => other.domain === row.domain) === index
          )
          .map((row) =>
            brand === PHONE
              ? {
                  ...row,
                  // Why it is suggested, so it doesn't feel like snooping
                  description: localize(
                    "ui.panel.config.integrations.from_your_phone_reason",
                    { app: phoneApps![row.domain] }
                  ),
                }
              : row
          );
      }

      if (byBrand) {
        return [...integrations]
          .filter((item) => !brand || item.domain === brand)
          .sort(byName)
          .flatMap((item) => this._brandRows(item))
          .filter((row) => !brand || !row.is_header);
      }
      // Browsing a category also shows the helpers in it. A brand shows its
      // integrations in it instead of itself, like the website's categories:
      // Google is Google Gemini in AI models.
      if (category) {
        return [...integrations, ...helpers]
          .filter(ofCategory)
          .flatMap((item) =>
            item.domains
              ? this._brandRows(item)
                  .filter((row) => !row.is_header && !row.is_add)
                  .filter(ofCategory)
                  .map((row) => ({ ...row, id: row.domain }))
              : [item]
          )
          .filter(
            (row, index, rows) =>
              rows.findIndex((other) => other.domain === row.domain) === index
          )
          .sort(byName);
      }
      return [...integrations].sort(byName);
    }
  );

  // A brand's name with its integrations below it, so they are picked right
  // away. An integration without a brand is under its own name.
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
      // Adding a Zigbee, Z-Wave or Matter device is local
      .filter(() => this._connection !== "cloud")
      .map((domain) => ({
        id: `${item.domain}/add_${domain}`,
        interactive: true,
        domain,
        name: localize(
          `ui.panel.config.integrations.add_${domain}_device` as any
        ),
        config_flow: true,
        is_built_in: true,
        is_add: true,
      }));
    const integrations: IntegrationListItem[] = Object.entries(
      brand.integrations || {}
    )
      .filter(([, integration]) => integration.integration_type !== "hardware")
      .map(([domain, integration]) => ({
        id: `${item.domain}/${domain}`,
        interactive: true,
        domain,
        name: integration.name || domainToName(localize, domain),
        config_flow: integration.config_flow,
        iot_standards: integration.iot_standards,
        supported_by: integration.supported_by,
        is_built_in: integration.is_built_in !== false,
        cloud: integration.iot_class?.startsWith("cloud_"),
        single_config_entry: integration.single_config_entry,
        categories: integration.categories,
        integration_type: integration.supported_by
          ? findIntegration(this._integrations, integration.supported_by)
              ?.integration_type
          : integration.integration_type,
      }))
      .filter((row) => ofFilters(row, this._getFilters(this._connection)))
      .sort((a, b) =>
        caseInsensitiveStringCompare(a.name, b.name, this.hass.locale.language)
      );
    if (!integrations.length && !protocols.length) {
      return [];
    }
    return [header, ...protocols, ...integrations];
  }

  // The brands with more than one thing to add, and how many, A to Z.
  // An integration on its own is found under all brands.
  private _getBrands = memoizeOne(
    (
      i: Brands,
      h: Integrations,
      localize: LocalizeFunc,
      filters?: ListFilters
    ) =>
      this._getListItems(i, h, localize, filters)
        .integrations.filter((item) => item.domains)
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
      // A brand counts as its integrations, as a category lists those
      const items = [...integrations, ...helpers].flatMap((item) =>
        item.domains
          ? this._brandRows(item).filter((row) => !row.is_header && !row.is_add)
          : [item]
      );
      items.forEach((item) => {
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
      this.hass.localize,
      this._getFilters(this._connection)
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
      this._getFilters(this._connection),
      this._phoneApps()
    );
  }

  // One object while the filters stay, so the lists built from it stay too
  private _getFilters = memoizeOne((connection?: Connection): ListFilters => ({
    connection,
  }));

  // What the list shows: the search results, or what is browsed
  private _getRows(): IntegrationListItem[] {
    if (!this._filter) {
      return this._getIntegrations();
    }
    const found = this._getFound();
    return this._getSearchRows(
      found,
      // A section with nothing found shows that, like an empty search
      this._searchSection,
      this.hass.localize
    );
  }

  private _getFound() {
    return this._getSearchFound(
      this._integrations!,
      this._helpers!,
      this.hass.localize,
      this._filter!,
      this._categoryIcons,
      !this._integrationFilter,
      this._getFilters(this._connection)
    );
  }

  // Like the automation editor's search: everything that matches, by
  // section, instead of the browse pane and its list
  private _getSearchFound = memoizeOne(
    (
      i: Brands,
      h: Integrations,
      localize: LocalizeFunc,
      filter: string,
      categoryIcons: IntegrationCategoryIcons | undefined,
      browse: boolean,
      filters?: ListFilters
    ): Record<SearchSection, IntegrationListItem[]> => {
      const { integrations, yamlIntegrations, helpers } = this._getListItems(
        i,
        h,
        localize,
        filters
      );
      const search = (items: IntegrationListItem[]) =>
        new Fuse(items, searchOptions(filter))
          .search(filter)
          .map((result) => result.item);

      // Every integration once, also the ones only listed under a brand
      const leaves = new Map<string, IntegrationListItem>();
      [...integrations, ...yamlIntegrations].forEach((item) => {
        const rows = item.domains
          ? this._brandRows(item).filter((row) => !row.is_header && !row.is_add)
          : [item];
        rows.forEach((row) => {
          if (!leaves.has(row.domain)) {
            leaves.set(row.domain, { ...row, id: row.domain });
          }
        });
      });

      const brands: IntegrationListItem[] = browse
        ? this._getBrands(i, h, localize, filters).map(({ item }) => ({
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
                icon: categoryIcons?.[category.slug]?.default,
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
                  categoryIcons?.[category.slug]?.subcategory?.[
                    subcategory.slug
                  ]?.default || categoryIcons?.[category.slug]?.default,
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
        integration: search([...leaves.values()]),
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
        // Ids like `section/id`, so the section title is held while
        // scrolling like a brand's
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

  // A filtered dialog has no browsing to switch
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
        : this.hass.localize("ui.panel.config.integrations.new");

    // Where a phone came from, above the title, like the automation editor:
    // the category of a subcategory, or the dialog itself
    const headerSubtitle =
      !showingBrandView && this._narrow && this._drilled
        ? this._subcategory
          ? this.hass.localize(
              `component.homeassistant.integration_category.${this._category}.name` as any
            )
          : this.hass.localize("ui.panel.config.integrations.new")
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
    if (this._brand === PHONE) {
      return this.hass.localize("ui.panel.config.integrations.from_your_phone");
    }
    if (this._brand && this._brand in COLLECTIONS) {
      return this.hass.localize(
        `ui.panel.config.integrations.${this._brand.slice(1) as "featured" | "works_with"}`
      );
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
      .boxed=${!integration}
      style=${styleMap({
        minWidth: `${this._width}px`,
        // The discovered list fills its scroll view for its footer instead
        minHeight: integration ? `581px` : undefined,
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
    // Wide screens have the browse pane next to the list. A phone has one
    // at a time, like the automation editor: the browse pane, then what was
    // picked in it, or what was searched.
    const browse = !this._integrationFilter;
    // Searching shows only the results, like the automation editor
    const showBrowse =
      browse && !this._filter && (!this._narrow || !this._drilled);
    const showItems =
      !this._narrow || !browse || this._drilled || !!this._filter;
    const rows = integrations;
    // What the list is narrowed to; a phone has it in the dialog's title
    const listTitle =
      !this._narrow && !this._filter && (this._category || this._brand)
        ? this._browsingTitle()
        : undefined;
    // The chips to show one section of the search results
    const sections = this._filter && browse;
    // On a phone, a category's subcategories are above its list, like an
    // area's devices in the automation editor
    const subcategories =
      this._narrow && this._drilled && this._category && !this._subcategory
        ? this._getCategories(this._getCounts(), this.hass.localize).find(
            (category) => category.slug === this._category
          )?.subcategories || []
        : [];
    const subcategoriesHeight = this._subcategoriesHeight(subcategories.length);

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
                    "ui.panel.config.integrations.search_brand"
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
      <div
        class=${classMap({
          content: true,
          single: this._narrow,
          fill: !this._sheet,
        })}
      >
        ${showBrowse ? this._renderCategoryTree() : nothing}
        ${
          showItems
            ? html`<div class="items">
                ${
                  this._showDiscoveredView && !this._filter
                    ? html`<div
                        class="discovered"
                        style=${styleMap({ height: this._listHeight() })}
                      >
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
                              ? html`<div
                                  class=${classMap({
                                    "items-title": true,
                                    raised:
                                      this._listScrolled && !this._stickyBrand,
                                  })}
                                >
                                  ${listTitle}
                                </div>`
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
                              // Search results are one boxed list, like the
                              // automation editor's
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
                                  : html`<div class="items-title sticky raised">
                                      ${this._stickyBrand}
                                    </div>`
                            }
                            <ha-list-virtualized
                              .rows=${rows}
                              .rowRenderer=${this._renderRow}
                              style=${styleMap({
                                height: this._listHeight(
                                  (listTitle ? 40 : 0) +
                                    // The box's border and the room below it
                                    (this._filter ? 14 : 0) +
                                    subcategoriesHeight
                                ),
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

  // All, or only what works without the cloud, or only what needs it
  // Like the data tables' group by: the filter's name and its value
  private _renderFilterChip(
    filter: "browse_by" | "connection",
    value: string,
    options: readonly string[],
    selected: (ev: HaDropdownSelectEvent) => void
  ) {
    const key = `ui.panel.config.integrations.${filter}`;
    return html`<ha-dropdown @wa-select=${selected}>
      <ha-assist-chip
        slot="trigger"
        .label=${this.hass.localize(`${key}.label` as any, {
          value: this.hass.localize(`${key}.${value}` as any),
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
            ${this.hass.localize(`${key}.${option}` as any)}
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
  }

  private _searchSectionClicked(ev: Event) {
    const section = (ev.currentTarget as any).section as SearchSection;
    this._searchSection = this._searchSection === section ? undefined : section;
  }

  // A brand or category found by searching opens it, like picking it in
  // the browse pane
  private _activateResult(row: IntegrationListItem) {
    if (row.result === "more") {
      this._searchSection = row.section;
      return;
    }
    this._filter = "";
    this._searchSection = undefined;
    this._showDiscoveredView = false;
    if (row.result === "brand") {
      this._browseBy = "brand";
      this._brand = row.domain;
      this._category = undefined;
      this._subcategory = undefined;
    } else {
      this._browseBy = "category";
      this._brand = undefined;
      this._category = row.category;
      this._subcategory = row.subcategory;
      this._expanded = new Set([...this._expanded, row.category!]);
    }
    this._drillIn();
  }

  // An arrow function: the list renders the rows, not this dialog
  private _resultPicked = (
    ev: HASSDomCurrentTargetEvent<HaIntegrationListItem>
  ) => {
    this._activateResult(ev.currentTarget.integration);
  };

  // Collapsed, the box shows its title and this many subcategories
  private static _SUBCATEGORIES_SHOWN = 4;

  // The room the box takes with the space below it: a title and 40px rows
  private _subcategoriesHeight(count: number) {
    if (!count) {
      return 0;
    }
    const rows = this._subcategoriesExpanded
      ? count
      : Math.min(count, AddIntegrationDialog._SUBCATEGORIES_SHOWN);
    return 40 + rows * 40 + 2 + 12;
  }

  private _renderSubcategories(
    subcategories: IntegrationCategory["subcategories"]
  ) {
    const counts = this._getCounts();
    const icons = this._categoryIcons?.[this._category!];
    const more =
      !this._subcategoriesExpanded &&
      subcategories.length > AddIntegrationDialog._SUBCATEGORIES_SHOWN;
    return html`<div
      class="subcategories"
      style=${styleMap({
        height: `${this._subcategoriesHeight(subcategories.length) - 12}px`,
      })}
    >
      <ha-section-title>
        ${this.hass.localize("ui.panel.config.integrations.subcategories")}
      </ha-section-title>
      <ha-list-base>
        ${subcategories.map(
          (subcategory) =>
            html`<ha-list-item-button
              .category=${this._category}
              .subcategory=${subcategory.slug}
              @click=${this._subcategoryPicked}
            >
              ${
                icons?.subcategory?.[subcategory.slug]?.default
                  ? html`<ha-icon
                      slot="start"
                      .icon=${icons.subcategory[subcategory.slug].default}
                    ></ha-icon>`
                  : nothing
              }
              <span slot="headline">${subcategory.name}</span>
              <span slot="end" class="count">
                ${counts.get(`${this._category}.${subcategory.slug}`) || 0}
              </span>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-list-item-button>`
        )}
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

  // On a phone, show what was picked in the browse pane
  private _drillIn() {
    this._drilled = this._narrow;
  }

  // Back one level: from a subcategory to its category, then to browsing
  private _drillOut() {
    if (this._subcategory) {
      this._subcategory = undefined;
      return;
    }
    this._drilled = false;
  }

  // Leave room for the header and search in the sheet, or in the dialog of a
  // fixed height, so only the list scrolls. What was picked on a phone has
  // no search.
  // `title` is the room a heading above the list takes, so the dialog keeps
  // its height
  private _listHeight(title = 0) {
    // The dialog's lists fill what is left of its fixed height, see `.fill`
    if (!this._sheet) {
      return undefined;
    }
    // The search and the connection toggle under it
    const reserved = (this._narrow && this._drilled ? 80 : 188) + title;
    return `calc(var(--add-integration-sheet-height) - ${reserved}px - var(--safe-area-inset-bottom, 0px))`;
  }

  // Three ways in: what Home Assistant found, adding a device to a
  // protocol you use, and browsing every integration by category.
  private _renderCategoryTree() {
    const counts = this._getCounts();
    const categories = this._getCategories(counts, this.hass.localize);
    const discovered = this._flowsInProgress?.length || 0;
    const fromPhone = Object.keys(this._phoneApps() ?? {}).length;
    const protocols = PROTOCOL_INTEGRATIONS.filter((domain) =>
      this._hasProtocol(domain)
    );
    // While searching, nothing in the pane is what the list shows
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
    const phoneRow = fromPhone
      ? html`<ha-list-item-button
          class=${classMap({
            selected:
              !this._filter &&
              !this._showDiscoveredView &&
              this._brand === PHONE,
          })}
          .brand=${PHONE}
          @click=${this._brandPicked}
        >
          <ha-svg-icon slot="start" .path=${mdiCellphone}></ha-svg-icon>
          <span slot="headline">
            ${this.hass.localize("ui.panel.config.integrations.from_your_phone")}
          </span>
          <ha-label slot="end" dense>${fromPhone}</ha-label>
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
              `ui.panel.config.integrations.add_${domain}_device` as any
            )}
          </span>
          <ha-icon-next slot="end"></ha-icon-next>
        </ha-list-item-button>
      `
    );

    return html`<div
      class="pane"
      style=${styleMap({ height: this._listHeight() })}
    >
      <div
        class=${classMap({ groups: true, browse: true, narrow: this._narrow })}
      >
        ${
          discovered || fromPhone || protocols.length
            ? html`<ha-section-title>
                  ${this.hass.localize("ui.panel.config.integrations.add_a_device")}
                </ha-section-title>
                <ha-list-base
                  >${discoveredRow}${phoneRow}${protocolRows}</ha-list-base
                >`
            : nothing
        }
        <ha-section-title>
          ${this.hass.localize("ui.panel.config.integrations.browse")}
        </ha-section-title>
        <ha-list-base>
          ${Object.entries(COLLECTIONS).map(
            ([key, { icon }]) =>
              html`<ha-list-item-button
                class=${classMap({
                  selected:
                    !this._filter &&
                    !this._showDiscoveredView &&
                    this._brand === key,
                })}
                .brand=${key}
                @click=${this._brandPicked}
              >
                <ha-svg-icon slot="start" .path=${icon}></ha-svg-icon>
                <span slot="headline">
                  ${this.hass.localize(
                    `ui.panel.config.integrations.${key.slice(1) as "featured" | "works_with"}`
                  )}
                </span>
                ${this._narrow ? html`<ha-icon-next slot="end"></ha-icon-next>` : nothing}
              </ha-list-item-button>`
          )}
        </ha-list-base>
        ${
          this._browseBy === "brand"
            ? this._renderBrandList()
            : html`<ha-list-base
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
                    .path=${mdiViewGridOutline}
                  ></ha-svg-icon>
                  <span slot="headline">
                    ${this.hass.localize(
                      "ui.panel.config.integrations.all_integrations"
                    )}
                  </span>
                  ${this._narrow ? html`<ha-icon-next slot="end"></ha-icon-next>` : nothing}
                </ha-list-item-button>
                <wa-divider></wa-divider>
                ${categories.map((category) => {
                  const isCurrent =
                    !this._filter &&
                    !this._showDiscoveredView &&
                    !this._brand &&
                    category.slug === this._category;
                  // A phone opens a category instead, like the automation
                  // editor's targets
                  const expanded =
                    !this._narrow && this._expanded.has(category.slug);
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
                        category.subcategories.length && !this._narrow
                          ? String(expanded)
                          : nothing
                      }
                      .category=${category.slug}
                      @click=${this._categoryPicked}
                      @keydown=${this._categoryKeydown}
                    >
                      ${
                        this._narrow
                          ? nothing
                          : html`<ha-svg-icon
                              slot="start"
                              class=${classMap({
                                expand: true,
                                expanded,
                                empty: !category.subcategories.length,
                              })}
                              .path=${mdiChevronRight}
                              .category=${category.slug}
                              @click=${this._toggleExpanded}
                            ></ha-svg-icon>`
                      }
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
                      ${this._narrow ? html`<ha-icon-next slot="end"></ha-icon-next>` : nothing}
                    </ha-list-item-button>
                    ${
                      expanded
                        ? category.subcategories.map(
                            (subcategory) => html`
                              <ha-list-item-button
                                class=${classMap({
                                  subcategory: true,
                                  selected:
                                    isCurrent &&
                                    subcategory.slug === this._subcategory,
                                })}
                                role="treeitem"
                                aria-level="2"
                                aria-selected=${String(
                                  isCurrent &&
                                    subcategory.slug === this._subcategory
                                )}
                                .category=${category.slug}
                                .subcategory=${subcategory.slug}
                                @click=${this._subcategoryPicked}
                              >
                                <ha-svg-icon
                                  slot="start"
                                  class="expand empty indent"
                                  .path=${mdiChevronRight}
                                ></ha-svg-icon>
                                ${
                                  icons?.subcategory?.[subcategory.slug]
                                    ?.default
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
              </ha-list-base>`
        }
      </div>
    </div>`;
  }

  private _browseBySelected(ev: HaDropdownSelectEvent) {
    this._browseBy = ev.detail.item.value as BrowseBy;
    this._showDiscoveredView = false;
    this._category = undefined;
    this._subcategory = undefined;
    this._brand = undefined;
  }

  // Like the categories: all brands, or one brand's integrations
  private _renderBrandList() {
    const brands = this._integrations
      ? this._getBrands(
          this._integrations,
          this._helpers!,
          this.hass.localize,
          this._getFilters(this._connection)
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

  private _brandPicked(ev: Event) {
    this._filter = "";
    this._showDiscoveredView = false;
    this._brand = (ev.currentTarget as any).brand as string | undefined;
    this._category = undefined;
    this._subcategory = undefined;
    this._drillIn();
  }

  private _discoveredPicked() {
    this._brand = undefined;
    this._filter = "";
    this._showDiscoveredView = true;
    this._category = undefined;
    this._subcategory = undefined;
    this._drillIn();
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
    this._filter = "";
    this._brand = undefined;
    this._showDiscoveredView = false;
    this._category = undefined;
    this._subcategory = undefined;
    this._drillIn();
  }

  private _categoryPicked(ev: Event) {
    this._filter = "";
    const category = (ev.currentTarget as any).category as string;
    this._showDiscoveredView = false;
    this._brand = undefined;
    this._category = category;
    this._subcategory = undefined;
    this._expanded = new Set([...this._expanded, category]);
    this._drillIn();
  }

  private _subcategoryPicked(ev: Event) {
    this._filter = "";
    this._showDiscoveredView = false;
    this._brand = undefined;
    this._category = (ev.currentTarget as any).category as string;
    this._subcategory = (ev.currentTarget as any).subcategory as string;
    this._drillIn();
  }

  // Says why picking it first shows what was found
  private _isDiscovered(integration: IntegrationListItem) {
    return Boolean(
      !integration.result &&
      !integration.is_add &&
      !this._integrationFilter &&
      integration.config_flow &&
      this._getFlowsInProgressForDomains([integration.domain]).length
    );
  }

  // Picking it shows another step in this dialog, like _handleIntegrationPicked
  // decides, instead of closing it for a flow
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

  // Rows are positioned by the virtualizer, so CSS sticky can't hold the
  // brand; like findSectionTitle, it gives way while a brand scrolls in
  @eventOptions({ passive: true })
  private _visibilityChanged(ev: HASSDomEvent<HaListVisibilityChangedDetail>) {
    const rows = this._getRows();
    const row = rows[ev.detail.first];
    this._listScrolled = ev.detail.first > 0;
    // Only a brand's rows have an id like `brand/domain`
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
    // Search results are a plain list with gray titles, like the
    // automation editor's search; browsing has cards
    if (integration.is_header) {
      return this._filter
        ? html`<ha-section-title>${integration.name}</ha-section-title>`
        : html`<div style=${styleMap(ROW_TITLE_STYLE)}>
            ${integration.name}
          </div>`;
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
    this._flowsInProgress = addIntegrationDemo.flows ?? this._flowsInProgress; // DEMO
    // Start with what was found, it is what most people come for
    // A phone starts on the browse pane, with what was found at its top
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

    // The discovered flows are on screen, not the list of integrations
    if (this._showDiscoveredView && !this._filter) {
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
        /* A steady sheet, the views in it have different heights. As tall
           as the automation editor's add dialog. */
        --add-integration-sheet-height: 90vh;
        --add-integration-sheet-height: calc(100dvh - var(--ha-space-12));
        --ha-bottom-sheet-height: var(--add-integration-sheet-height);
        --ha-bottom-sheet-max-height: var(--add-integration-sheet-height);
        /* A steady dialog too, as tall as the automation editor's add
           dialog; the lists take what the header and search leave */
        --add-integration-height: min(
          920px,
          calc(
            100vh - max(var(--safe-area-inset-bottom), var(--ha-space-4)) - max(
                var(--safe-area-inset-top),
                var(--ha-space-4)
              )
          )
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
        --ha-dialog-min-height: var(--add-integration-height);
        --ha-dialog-max-height: var(--add-integration-height);
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
        /* Scrolls edge to edge on a phone, like the data tables' chips */
        /* The search and filters close together, then the room between the
           panes */
        margin: calc(var(--ha-space-1) * -1) 0 var(--ha-space-4);
        padding: 0 var(--ha-space-4);
        overflow-x: auto;
        /* Scrolls sideways only, overflow-x alone also lets it scroll up and
           down */
        overflow-y: hidden;
        overscroll-behavior-x: contain;
        scrollbar-width: none;
        flex-shrink: 0;
        /* Shaped like the search's filter chips */
        --ha-assist-chip-container-shape: var(--ha-border-radius-md);
      }
      .connection-row > * {
        flex-shrink: 0;
      }
      /* Like the menus of the data tables */
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
      }
      /* In the dialog, the panes and lists fill what the header and search
         leave of its fixed height */
      .content.fill {
        flex: 1;
        min-height: 0;
      }
      .fill .items,
      .fill .list {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .fill .list,
      .fill .discovered,
      .fill ha-list-virtualized {
        flex: 1;
        min-height: 0;
      }
      .pane {
        flex: 0 0 300px;
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-3);
        min-height: 0;
        margin: 0 0 var(--ha-space-3) var(--ha-space-4);
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
      /* Like the titles of the automation editor's items */
      /* Like the automation editor's search */
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
      .items-title {
        display: flex;
        align-items: center;
        box-sizing: border-box;
        height: 40px;
        padding: var(--ha-space-2) var(--ha-space-3) var(--ha-space-2)
          calc(var(--ha-space-4) + 1px + var(--ha-space-3));
        font-weight: var(--ha-font-weight-medium);
        background-color: var(--card-background-color);
      }
      .items-title.raised {
        position: relative;
        z-index: 1;
        box-shadow: var(--bar-box-shadow);
        /* Only below, over the list, not around the title */
        clip-path: inset(0 0 -16px 0);
        border-bottom: 1px solid var(--ha-color-border-neutral-quiet);
      }
      .list {
        position: relative;
      }
      /* Like the automation editor's devices of an area on a phone */
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
        --ha-row-item-min-height: 40px;
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
        margin: 0 var(--ha-space-4) var(--ha-space-3);
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
      /* Keyboard focus scrolls rows clear of the held brand */
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
        --ha-row-item-min-height: 40px;
      }
      /* Like the tree chevrons of the automation editor */
      .groups ha-icon-next {
        color: var(--ha-color-on-neutral-quiet);
      }
      .groups ha-list-item-button::part(start) {
        color: var(--ha-color-on-neutral-quiet);
      }
      /* A level in, like the automation editor's tree: the room of a
         chevron and the tree's indent */
      .groups .expand.indent {
        margin-inline-start: var(--ha-space-4);
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
      /* Waiting for you, so it stands out from the other counts */
      .groups ha-label {
        border: none;
        --ha-label-background-color: var(
          --ha-color-fill-primary-normal-resting
        );
        --ha-label-text-color: var(--ha-color-on-primary-normal);
      }
      .groups .expand {
        width: 20px;
        transition: transform 150ms ease;
      }
      .groups .expand.expanded {
        transform: rotate(90deg);
      }
      .groups wa-divider {
        --spacing: var(--ha-space-2);
      }
      .groups .expand.empty {
        visibility: hidden;
      }
      /* A phone shows the pane on its own, so nothing in it is open */
      .groups:not(.narrow) .selected {
        background-color: var(--ha-color-fill-primary-normal-active);
        --icon-primary-color: var(--ha-color-on-primary-normal);
      }
      .groups:not(.narrow) .selected::part(headline),
      .groups:not(.narrow) .selected::part(start) {
        color: var(--ha-color-on-primary-normal);
      }
      @media all and (max-width: 450px), all and (max-height: 500px) {
        .pane {
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
