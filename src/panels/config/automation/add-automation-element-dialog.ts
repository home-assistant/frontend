import {
  mdiAppleKeyboardCommand,
  mdiClose,
  mdiContentPaste,
  mdiPlus,
} from "@mdi/js";
import Fuse from "fuse.js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stringCompare } from "../../../common/string/compare";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import { deepEqual } from "../../../common/util/deep-equal";
import "../../../components/ha-bottom-sheet";
import type { HaBottomSheet } from "../../../components/ha-bottom-sheet";
import "../../../components/ha-button-toggle-group";
import "../../../components/ha-dialog-header";
import "../../../components/ha-domain-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-icon-next";
import "../../../components/ha-md-divider";
import "../../../components/ha-md-list";
import type { HaMdList } from "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-service-icon";
import "../../../components/ha-wa-dialog";
import type { HaWaDialog } from "../../../components/ha-wa-dialog";
import "../../../components/search-input";
import {
  ACTION_COLLECTIONS,
  ACTION_ICONS,
  SERVICE_PREFIX,
  getService,
  isService,
} from "../../../data/action";
import type {
  AutomationElementGroup,
  AutomationElementGroupCollection,
} from "../../../data/automation";
import {
  CONDITION_COLLECTIONS,
  CONDITION_ICONS,
} from "../../../data/condition";
import { getServiceIcons } from "../../../data/icons";
import type { IntegrationManifest } from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifests,
} from "../../../data/integration";
import { TRIGGER_COLLECTIONS, TRIGGER_ICONS } from "../../../data/trigger";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { KeyboardShortcutMixin } from "../../../mixins/keyboard-shortcut-mixin";
import { HaFuse } from "../../../resources/fuse";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { isMac } from "../../../util/is_mac";
import { showToast } from "../../../util/toast";
import type { AddAutomationElementDialogParams } from "./show-add-automation-element-dialog";
import { PASTE_VALUE } from "./show-add-automation-element-dialog";

const TYPES = {
  trigger: { collections: TRIGGER_COLLECTIONS, icons: TRIGGER_ICONS },
  condition: {
    collections: CONDITION_COLLECTIONS,
    icons: CONDITION_ICONS,
  },
  action: {
    collections: ACTION_COLLECTIONS,
    icons: ACTION_ICONS,
  },
};

interface ListItem {
  key: string;
  name: string;
  description: string;
  iconPath?: string;
  icon?: TemplateResult;
}

type DomainManifestLookup = Record<string, IntegrationManifest>;

const ENTITY_DOMAINS_OTHER = new Set([
  "date",
  "datetime",
  "device_tracker",
  "text",
  "time",
  "tts",
  "update",
  "weather",
  "image_processing",
]);

const ENTITY_DOMAINS_MAIN = new Set(["notify"]);

const ACTION_SERVICE_KEYWORDS = ["serviceGroups", "helpers", "other"];

@customElement("add-automation-element-dialog")
class DialogAddAutomationElement
  extends KeyboardShortcutMixin(LitElement)
  implements HassDialog
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: AddAutomationElementDialogParams;

  @state() private _selectedCollectionIndex?: number;

  @state() private _selectedGroup?: string;

  @state() private _tab: "groups" | "blocks" = "groups";

  @state() private _filter = "";

  @state() private _manifests?: DomainManifestLookup;

  @state() private _domains?: Set<string>;

  @state() private _open = true;

  @query("#content") private _contentElement?: HaMdList;

  @query("ha-wa-dialog, ha-bottom-sheet") private _dialogElement?:
    | HaWaDialog
    | HaBottomSheet;

  private _fullScreen = false;

  @state() private _height?: number;

  @state() private _narrow = false;

  public showDialog(params): void {
    this._params = params;
    this._selectedGroup = params.group;

    this.addKeyboardShortcuts();

    if (this._params?.type === "action") {
      this.hass.loadBackendTranslation("services");
      this._fetchManifests();
      this._calculateUsedDomains();
      getServiceIcons(this.hass);
    }
    this._fullScreen = matchMedia(
      "all and (max-width: 450px), all and (max-height: 500px)"
    ).matches;

    this._narrow =
      window.matchMedia("(max-width: 870px)").matches ||
      window.matchMedia("(max-height: 500px)").matches;
  }

  public closeDialog() {
    this.removeKeyboardShortcuts();
    if (this._params) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._open = true;
    this._height = undefined;
    this._params = undefined;
    this._selectedGroup = undefined;
    this._selectedCollectionIndex = undefined;
    this._filter = "";
    this._manifests = undefined;
    this._domains = undefined;
    return true;
  }

  private _getGroups = (
    type: AddAutomationElementDialogParams["type"],
    group: string | undefined,
    collectionIndex: number | undefined
  ): AutomationElementGroup =>
    group && collectionIndex !== undefined
      ? isService(group)
        ? {}
        : TYPES[type].collections[collectionIndex].groups[group].members || {
            [group]: {},
          }
      : TYPES[type].collections[0].groups;

  private _convertToItem = (
    key: string,
    options,
    type: AddAutomationElementDialogParams["type"],
    localize: LocalizeFunc
  ): ListItem => ({
    key,
    name: localize(
      // @ts-ignore
      `ui.panel.config.automation.editor.${type}s.${
        options.members ? "groups" : "type"
      }.${key}.label`
    ),
    description: localize(
      // @ts-ignore
      `ui.panel.config.automation.editor.${type}s.${
        options.members ? "groups" : "type"
      }.${key}.description${options.members ? "" : ".picker"}`
    ),
    iconPath: options.icon || TYPES[type].icons[key],
  });

  private _getFilteredItems = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      group: string | undefined,
      collectionIndex: number | undefined,
      filter: string,
      domains: Set<string> | undefined,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): ListItem[] => {
      const items = this._items(
        type,
        group,
        collectionIndex,
        localize,
        services,
        manifests
      );

      const index = this._fuseIndex(items);

      const fuse = new HaFuse(
        items,
        { ignoreLocation: true, includeScore: true },
        index
      );

      const results = fuse.multiTermsSearch(filter);
      if (results) {
        return results.map((result) => result.item);
      }
      return this._getGroupItems(
        type,
        group,
        collectionIndex,
        domains,
        localize,
        services,
        manifests
      );
    }
  );

  private _items = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      group: string | undefined,
      collectionIndex: number | undefined,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): ListItem[] => {
      const groups = this._getGroups(type, group, collectionIndex);

      const flattenGroups = (grp: AutomationElementGroup) =>
        Object.entries(grp).map(([key, options]) =>
          options.members
            ? flattenGroups(options.members)
            : this._convertToItem(key, options, type, localize)
        );

      const items = flattenGroups(groups).flat();
      if (type === "action") {
        items.push(...this._services(localize, services, manifests, group));
      }
      return items;
    }
  );

  private _fuseIndex = memoizeOne((items: ListItem[]) =>
    Fuse.createIndex(["key", "name", "description"], items)
  );

  private _getCollections = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      collections: AutomationElementGroupCollection[],
      domains: Set<string> | undefined,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): {
      titleKey?: LocalizeKeys;
      groups: ListItem[];
    }[] => {
      const generatedCollections: any = [];

      collections.forEach((collection) => {
        let collectionGroups = Object.entries(collection.groups);
        const groups: ListItem[] = [];

        if (
          type === "action" &&
          Object.keys(collection.groups).some((item) =>
            ACTION_SERVICE_KEYWORDS.includes(item)
          )
        ) {
          groups.push(
            ...this._serviceGroups(
              localize,
              services,
              manifests,
              domains,
              collection.groups.serviceGroups
                ? undefined
                : collection.groups.helpers
                  ? "helper"
                  : "other"
            )
          );

          collectionGroups = collectionGroups.filter(
            ([key]) => !ACTION_SERVICE_KEYWORDS.includes(key)
          );
        }

        groups.push(
          ...collectionGroups.map(([key, options]) =>
            this._convertToItem(key, options, type, localize)
          )
        );

        generatedCollections.push({
          titleKey: collection.titleKey,
          groups: groups.sort((a, b) =>
            stringCompare(a.name, b.name, this.hass.locale.language)
          ),
        });
      });
      return generatedCollections;
    }
  );

  private _getGroupItems = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      group: string | undefined,
      collectionIndex: number | undefined,
      domains: Set<string> | undefined,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): ListItem[] => {
      if (!group) {
        return [];
      }

      if (type === "action" && isService(group)) {
        return this._services(localize, services, manifests, group);
      }

      const groups = this._getGroups(type, group, collectionIndex);

      const result = Object.entries(groups).map(([key, options]) =>
        this._convertToItem(key, options, type, localize)
      );

      if (type === "action") {
        if (!this._selectedGroup) {
          result.unshift(
            ...this._serviceGroups(
              localize,
              services,
              manifests,
              domains,
              undefined
            )
          );
        } else if (this._selectedGroup === "helpers") {
          result.unshift(
            ...this._serviceGroups(
              localize,
              services,
              manifests,
              domains,
              "helper"
            )
          );
        } else if (this._selectedGroup === "other") {
          result.unshift(
            ...this._serviceGroups(
              localize,
              services,
              manifests,
              domains,
              "other"
            )
          );
        }
      }

      return result.sort((a, b) =>
        stringCompare(a.name, b.name, this.hass.locale.language)
      );
    }
  );

  private _serviceGroups = (
    localize: LocalizeFunc,
    services: HomeAssistant["services"],
    manifests: DomainManifestLookup | undefined,
    domains: Set<string> | undefined,
    type: "helper" | "other" | undefined
  ): ListItem[] => {
    if (!services || !manifests) {
      return [];
    }
    const result: ListItem[] = [];
    Object.keys(services).forEach((domain) => {
      const manifest = manifests[domain];
      const domainUsed = !domains ? true : domains.has(domain);
      if (
        (type === undefined &&
          (ENTITY_DOMAINS_MAIN.has(domain) ||
            (manifest?.integration_type === "entity" &&
              domainUsed &&
              !ENTITY_DOMAINS_OTHER.has(domain)))) ||
        (type === "helper" && manifest?.integration_type === "helper") ||
        (type === "other" &&
          !ENTITY_DOMAINS_MAIN.has(domain) &&
          (ENTITY_DOMAINS_OTHER.has(domain) ||
            (!domainUsed && manifest?.integration_type === "entity") ||
            !["helper", "entity"].includes(manifest?.integration_type || "")))
      ) {
        result.push({
          icon: html`
            <ha-domain-icon
              .hass=${this.hass}
              .domain=${domain}
              brand-fallback
            ></ha-domain-icon>
          `,
          key: `${SERVICE_PREFIX}${domain}`,
          name: domainToName(localize, domain, manifest),
          description: "",
        });
      }
    });
    return result.sort((a, b) =>
      stringCompare(a.name, b.name, this.hass.locale.language)
    );
  };

  private _services = memoizeOne(
    (
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests: DomainManifestLookup | undefined,
      group?: string
    ): ListItem[] => {
      if (!services) {
        return [];
      }
      const result: ListItem[] = [];

      let domain: string | undefined;

      if (isService(group)) {
        domain = getService(group!);
      }

      const addDomain = (dmn: string) => {
        const services_keys = Object.keys(services[dmn]);

        for (const service of services_keys) {
          result.push({
            icon: html`
              <ha-service-icon
                .hass=${this.hass}
                .service=${`${dmn}.${service}`}
              ></ha-service-icon>
            `,
            key: `${SERVICE_PREFIX}${dmn}.${service}`,
            name: `${domain ? "" : `${domainToName(localize, dmn)}: `}${
              this.hass.localize(`component.${dmn}.services.${service}.name`) ||
              services[dmn][service]?.name ||
              service
            }`,
            description:
              this.hass.localize(
                `component.${dmn}.services.${service}.description`
              ) || services[dmn][service]?.description,
          });
        }
      };

      if (domain) {
        addDomain(domain);
        return result.sort((a, b) =>
          stringCompare(a.name, b.name, this.hass.locale.language)
        );
      }

      if (group && !["helpers", "other"].includes(group)) {
        return [];
      }

      Object.keys(services)
        .sort()
        .forEach((dmn) => {
          const manifest = manifests?.[dmn];
          if (group === "helpers" && manifest?.integration_type !== "helper") {
            return;
          }
          if (
            group === "other" &&
            (ENTITY_DOMAINS_OTHER.has(dmn) ||
              ["helper", "entity"].includes(manifest?.integration_type || ""))
          ) {
            return;
          }
          addDomain(dmn);
        });

      return result;
    }
  );

  private async _fetchManifests() {
    const manifests = {};
    const fetched = await fetchIntegrationManifests(this.hass);
    for (const manifest of fetched) {
      manifests[manifest.domain] = manifest;
    }
    this._manifests = manifests;
  }

  private _calculateUsedDomains() {
    const domains = new Set(Object.keys(this.hass.states).map(computeDomain));
    if (!deepEqual(domains, this._domains)) {
      this._domains = domains;
    }
  }

  protected _opened(): void {
    // Store the height so that when we search, box doesn't jump
    const boundingRect = this._contentElement?.getBoundingClientRect();
    this._height = boundingRect?.height;
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (
      this._params?.type === "action" &&
      changedProperties.has("hass") &&
      changedProperties.get("hass")?.states !== this.hass.states
    ) {
      this._calculateUsedDomains();
    }
  }

  private _renderContent() {
    const automationElementType = this._params!.type;

    const items = this._filter
      ? this._getFilteredItems(
          automationElementType,
          this._selectedGroup,
          this._selectedCollectionIndex,
          this._filter,
          this._domains,
          this.hass.localize,
          this.hass.services,
          this._manifests
        )
      : this._getGroupItems(
          automationElementType,
          this._selectedGroup,
          this._selectedCollectionIndex,
          this._domains,
          this.hass.localize,
          this.hass.services,
          this._manifests
        );

    const collections = this._getCollections(
      automationElementType,
      TYPES[automationElementType].collections,
      this._domains,
      this.hass.localize,
      this.hass.services,
      this._manifests
    );

    const groupName = isService(this._selectedGroup)
      ? domainToName(
          this.hass.localize,
          getService(this._selectedGroup!),
          this._manifests?.[getService(this._selectedGroup!)]
        )
      : this.hass.localize(
          // @ts-ignore
          `ui.panel.config.automation.editor.${this._params.type}s.groups.${this._selectedGroup}.label`
        );

    const typeTitle = this.hass.localize(
      `ui.panel.config.automation.editor.${automationElementType}s.header`
    );

    const tabButtons = [
      {
        label: this.hass.localize(
          `ui.panel.config.automation.editor.${automationElementType}s.header`
        ),
        value: "groups",
      },
      {
        label: this.hass.localize(`ui.panel.config.automation.editor.blocks`),
        value: "blocks",
      },
    ];

    return html`
      <div slot="header">
        <ha-dialog-header subtitle-position="above">
          <span slot="title"
            >${this._narrow && this._selectedGroup
              ? groupName
              : typeTitle}</span
          >

          ${this._narrow && this._selectedGroup
            ? html`<span slot="subtitle">${typeTitle}</span>`
            : nothing}
          ${this._narrow &&
          this._selectedGroup &&
          this._selectedGroup !== this._params!.group
            ? html`<ha-icon-button-prev
                slot="navigationIcon"
                @click=${this._back}
              ></ha-icon-button-prev>`
            : html`<ha-icon-button
                .path=${mdiClose}
                @click=${this._close}
                slot="navigationIcon"
              ></ha-icon-button>`}
        </ha-dialog-header>
        <search-input
          dialogInitialFocus=${ifDefined(this._fullScreen ? undefined : "")}
          .hass=${this.hass}
          .filter=${this._filter}
          @value-changed=${this._filterChanged}
          .label=${groupName
            ? this.hass.localize(
                "ui.panel.config.automation.editor.search_in",
                { group: groupName }
              )
            : this.hass.localize(
                `ui.panel.config.automation.editor.${automationElementType}s.search`
              )}
        ></search-input>

        <ha-button-toggle-group
          .buttons=${tabButtons}
          .active=${this._tab}
          @value-changed=${this._switchTab}
        ></ha-button-toggle-group>
      </div>
      <div
        id="content"
        style=${styleMap({
          height: this._height ? `${Math.min(468, this._height)}px` : "100vh",
        })}
      >
        <ha-md-list
          class=${classMap({
            groups: true,
            hidden: this._narrow && this._selectedGroup,
          })}
          dialogInitialFocus=${ifDefined(this._fullScreen ? "" : undefined)}
        >
          ${this._params!.clipboardItem && !this._filter
            ? html`<ha-md-list-item
                  interactive
                  type="button"
                  class="paste"
                  .value=${PASTE_VALUE}
                  @click=${this._selected}
                >
                  <div class="shortcut-label">
                    <div class="label">
                      <div>
                        ${this.hass.localize(
                          `ui.panel.config.automation.editor.${automationElementType}s.paste`
                        )}
                      </div>
                      <div class="supporting-text">
                        ${this.hass.localize(
                          // @ts-ignore
                          `ui.panel.config.automation.editor.${automationElementType}s.type.${this._params.clipboardItem}.label`
                        )}
                      </div>
                    </div>
                    ${!this._narrow
                      ? html`<span class="shortcut">
                          <span
                            >${isMac
                              ? html`<ha-svg-icon
                                  slot="start"
                                  .path=${mdiAppleKeyboardCommand}
                                ></ha-svg-icon>`
                              : this.hass.localize(
                                  "ui.panel.config.automation.editor.ctrl"
                                )}</span
                          >
                          <span>+</span>
                          <span>V</span>
                        </span>`
                      : nothing}
                  </div>
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiContentPaste}
                  ></ha-svg-icon
                  ><ha-svg-icon
                    class="plus"
                    slot="end"
                    .path=${mdiPlus}
                  ></ha-svg-icon>
                </ha-md-list-item>
                <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>`
            : nothing}
          ${collections.map(
            (collection, index) => html`
              ${collection.titleKey
                ? html`<div class="collection-title">
                    ${this.hass.localize(collection.titleKey)}
                  </div>`
                : nothing}
              ${repeat(
                collection.groups,
                (item) => item.key,
                (item) => html`
                  <ha-md-list-item
                    interactive
                    type="button"
                    .value=${item.key}
                    .index=${index}
                    @click=${this._groupSelected}
                    class=${item.key === this._selectedGroup ? "selected" : ""}
                  >
                    <div slot="headline">${item.name}</div>
                    ${item.icon
                      ? html`<span slot="start">${item.icon}</span>`
                      : item.iconPath
                        ? html`<ha-svg-icon
                            slot="start"
                            .path=${item.iconPath}
                          ></ha-svg-icon>`
                        : nothing}
                  </ha-md-list-item>
                `
              )}
            `
          )}
        </ha-md-list>
        <div
          class=${classMap({
            items: true,
            blank: !this._selectedGroup,
            hidden: this._narrow && !this._selectedGroup,
          })}
        >
          ${!this._selectedGroup
            ? this.hass.localize(
                `ui.panel.config.automation.editor.${automationElementType}s.select`
              )
            : html`<div class="items-title">
                  ${this.hass.localize(
                    `ui.panel.config.automation.editor.${automationElementType}s.name`
                  )}
                </div>
                <ha-md-list
                  dialogInitialFocus=${ifDefined(
                    this._fullScreen ? "" : undefined
                  )}
                >
                  ${repeat(
                    items,
                    (item) => item.key,
                    (item) => html`
                      <ha-md-list-item
                        interactive
                        type="button"
                        .value=${item.key}
                        .group=${item.group}
                        @click=${this._selected}
                      >
                        <div slot="headline">${item.name}</div>
                        <div slot="supporting-text">${item.description}</div>
                        ${item.icon
                          ? html`<span slot="start">${item.icon}</span>`
                          : item.iconPath
                            ? html`<ha-svg-icon
                                slot="start"
                                .path=${item.iconPath}
                              ></ha-svg-icon>`
                            : nothing}
                        ${item.group
                          ? html`<ha-icon-next slot="end"></ha-icon-next>`
                          : html`<ha-svg-icon
                              slot="end"
                              class="plus"
                              .path=${mdiPlus}
                            ></ha-svg-icon>`}
                      </ha-md-list-item>
                    `
                  )}
                </ha-md-list>`}
        </div>
      </div>
    `;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    if (this._narrow) {
      return html`
        <ha-bottom-sheet
          .open=${this._open}
          @after-show=${this._opened}
          @closed=${this.closeDialog}
        >
          ${this._renderContent()}
        </ha-bottom-sheet>
      `;
    }

    return html`
      <ha-wa-dialog
        .open=${this._open}
        @after-show=${this._opened}
        @closed=${this.closeDialog}
      >
        ${this._renderContent()}
      </ha-wa-dialog>
    `;
  }

  private _close() {
    this._open = false;
  }

  private _back() {
    this._dialogElement?.bodyContainer.scrollTo(0, 0);
    if (this._filter) {
      this._filter = "";
      return;
    }
    this._selectedGroup = undefined;
  }

  private _groupSelected(ev) {
    const group = ev.currentTarget;
    if (this._selectedGroup === group.value) {
      this._selectedGroup = undefined;
      this._selectedCollectionIndex = undefined;
      return;
    }
    this._dialogElement?.bodyContainer.scrollTo(0, 0);
    this._selectedGroup = group.value;
    this._selectedCollectionIndex = ev.currentTarget.index;
  }

  private _selected(ev) {
    const item = ev.currentTarget;
    this._params!.add(item.value);
    this.closeDialog();
  }

  private _filterChanged(ev) {
    this._filter = ev.detail.value;
  }

  private _addClipboard = () => {
    if (this._params?.clipboardItem) {
      this._params!.add(PASTE_VALUE);
      showToast(this, {
        message: this.hass.localize(
          "ui.panel.config.automation.editor.item_pasted",
          {
            item: this.hass.localize(
              // @ts-ignore
              `ui.panel.config.automation.editor.${this._params.type}s.type.${this._params.clipboardItem}.label`
            ),
          }
        ),
      });
      this.closeDialog();
    }
  };

  protected supportedShortcuts(): SupportedShortcuts {
    return {
      v: () => this._addClipboard(),
    };
  }

  private _switchTab(ev) {
    this._tab = ev.detail.value;
    this._selectedGroup = undefined;
    this._selectedCollectionIndex = undefined;
    this._filter = "";
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-wa-dialog,
        ha-bottom-sheet {
          --dialog-content-padding: 0;
          --ha-dialog-width-md: 888px;
        }
        ha-icon-next {
          width: 24px;
        }
        ha-md-list {
          padding: 0;
        }

        #content {
          max-height: 468px;
          display: flex;
          gap: var(--ha-space-3);
          padding: var(--ha-space-3) var(--ha-space-4);
        }

        ha-md-list.groups {
          overflow: auto;
          flex: 3;
          border-radius: var(--ha-border-radius-xl);
          border: 1px solid var(--ha-color-border-neutral-quiet);
          --md-list-item-leading-space: var(--ha-space-3);
          --md-list-item-trailing-space: var(--md-list-item-leading-space);
          --md-list-item-bottom-space: var(--ha-space-1);
          --md-list-item-top-space: var(--md-list-item-bottom-space);
          --md-list-item-supporting-text-font: var(--ha-font-size-s);
          --md-list-item-one-line-container-height: var(--ha-space-8);
        }

        ha-md-list.groups ha-md-list-item.selected {
          background-color: var(--ha-color-fill-primary-normal-active);
          --md-list-item-label-text-color: var(--primary-color);
          --icon-primary-color: var(--primary-color);
        }
        ha-md-list.groups ha-md-list-item.selected ha-svg-icon {
          color: var(--primary-color);
        }

        #content .items {
          display: flex;
          flex-direction: column;
          overflow: auto;
          flex: 7;
        }

        #content .items.blank {
          border-radius: var(--ha-border-radius-xl);
          background-color: var(--ha-color-surface-default);
          justify-content: center;
          align-items: center;
          color: var(--ha-color-text-secondary);
        }

        #content .items ha-md-list {
          --md-list-item-two-line-container-height: var(--ha-space-12);
          --md-list-item-leading-space: var(--ha-space-3);
          --md-list-item-trailing-space: var(--md-list-item-leading-space);
          --md-list-item-bottom-space: var(--ha-space-2);
          --md-list-item-top-space: var(--md-list-item-bottom-space);
          --md-list-item-supporting-text-font: var(--ha-font-size-s);
          gap: var(--ha-space-2);
        }

        #content .items ha-md-list ha-md-list-item {
          border-radius: var(--ha-border-radius-lg);
          border: 1px solid var(--ha-color-border-neutral-quiet);
        }

        #content .items.hidden,
        ha-md-list.groups.hidden {
          display: none;
        }

        #content .items .items-title {
          font-weight: var(--ha-font-weight-medium);
          margin-bottom: var(--ha-space-2);
        }

        .collection-title {
          background-color: var(--ha-color-fill-neutral-quiet-resting);
          padding: var(--ha-space-1) var(--ha-space-2);
          font-weight: var(--ha-font-weight-bold);
          color: var(--secondary-text-color);
          top: 0;
          position: sticky;
          z-index: 1;
        }

        ha-md-list-item img {
          width: 24px;
        }

        ha-md-list-item.paste {
          border-bottom: 1px solid var(--ha-color-border-neutral-quiet);
        }

        ha-svg-icon.plus {
          color: var(--primary-color);
        }

        search-input {
          display: block;
          margin: 0 16px;
        }
        .shortcut-label {
          display: flex;
          gap: var(--ha-space-3);
          justify-content: space-between;
        }
        .shortcut-label .supporting-text {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-s);
        }
        .shortcut-label .shortcut {
          --mdc-icon-size: 12px;
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          gap: 2px;
        }
        .shortcut-label .shortcut span {
          font-size: var(--ha-font-size-s);
          font-family: var(--ha-font-family-code);
          color: var(--ha-color-text-secondary);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "add-automation-element-dialog": DialogAddAutomationElement;
  }
}
