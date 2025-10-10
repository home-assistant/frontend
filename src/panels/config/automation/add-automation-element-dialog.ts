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
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stringCompare } from "../../../common/string/compare";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { deepEqual } from "../../../common/util/deep-equal";
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
  ACTION_GROUPS,
  ACTION_ICONS,
  SERVICE_PREFIX,
  getService,
  isService,
} from "../../../data/action";
import type { AutomationElementGroup } from "../../../data/automation";
import { CONDITION_GROUPS, CONDITION_ICONS } from "../../../data/condition";
import { getServiceIcons } from "../../../data/icons";
import type { IntegrationManifest } from "../../../data/integration";
import {
  domainToName,
  fetchIntegrationManifests,
} from "../../../data/integration";
import { TRIGGER_GROUPS, TRIGGER_ICONS } from "../../../data/trigger";
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
  trigger: { groups: TRIGGER_GROUPS, icons: TRIGGER_ICONS },
  condition: {
    groups: CONDITION_GROUPS,
    icons: CONDITION_ICONS,
  },
  action: {
    groups: ACTION_GROUPS,
    icons: ACTION_ICONS,
  },
};

interface ListItem {
  key: string;
  name: string;
  description: string;
  iconPath?: string;
  icon?: TemplateResult;
  group: boolean;
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

@customElement("add-automation-element-dialog")
class DialogAddAutomationElement
  extends KeyboardShortcutMixin(LitElement)
  implements HassDialog
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: AddAutomationElementDialogParams;

  @state() private _group?: string;

  @state() private _prev?: string;

  @state() private _filter = "";

  @state() private _manifests?: DomainManifestLookup;

  @state() private _domains?: Set<string>;

  @query("#content") private _contentElement?: HaMdList;

  @query("ha-wa-dialog") private _dialogElement?: HaWaDialog;

  private _fullScreen = false;

  @state() private _height?: number;

  @state() private _narrow = false;

  public showDialog(params): void {
    this._params = params;
    this._group = params.group;

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

    this._narrow = matchMedia("(max-width: 870px)").matches;
  }

  public closeDialog() {
    this.removeKeyboardShortcuts();
    if (this._params) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._height = undefined;
    this._params = undefined;
    this._group = undefined;
    this._prev = undefined;
    this._filter = "";
    this._manifests = undefined;
    this._domains = undefined;
    return true;
  }

  private _getGroups = (
    type: AddAutomationElementDialogParams["type"],
    group: string | undefined
  ): AutomationElementGroup =>
    group
      ? isService(group)
        ? {}
        : TYPES[type].groups[group].members!
      : TYPES[type].groups;

  private _convertToItem = (
    key: string,
    options,
    type: AddAutomationElementDialogParams["type"],
    localize: LocalizeFunc
  ): ListItem => ({
    group: Boolean(options.members),
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
      filter: string,
      domains: Set<string> | undefined,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): ListItem[] => {
      const items = this._items(type, group, localize, services, manifests);

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
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): ListItem[] => {
      const groups = this._getGroups(type, group);

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

  private _getGroupItems = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      group: string | undefined,
      domains: Set<string> | undefined,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): ListItem[] => {
      if (type === "action" && isService(group)) {
        return this._services(localize, services, manifests, group);
      }

      const groups = this._getGroups(type, group);

      const result = Object.entries(groups).map(([key, options]) =>
        this._convertToItem(key, options, type, localize)
      );

      if (type === "action") {
        if (!this._group) {
          result.unshift(
            ...this._serviceGroups(
              localize,
              services,
              manifests,
              domains,
              undefined
            )
          );
        } else if (this._group === "helpers") {
          result.unshift(
            ...this._serviceGroups(
              localize,
              services,
              manifests,
              domains,
              "helper"
            )
          );
        } else if (this._group === "other") {
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

      return result.sort((a, b) => {
        if (a.group && b.group) {
          return 0;
        }
        if (a.group && !b.group) {
          return 1;
        }
        if (!a.group && b.group) {
          return -1;
        }
        return stringCompare(a.name, b.name, this.hass.locale.language);
      });
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
          group: true,
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
            group: false,
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

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const items = this._filter
      ? this._getFilteredItems(
          this._params.type,
          this._group,
          this._filter,
          this._domains,
          this.hass.localize,
          this.hass.services,
          this._manifests
        )
      : this._getGroupItems(
          this._params.type,
          this._group,
          this._domains,
          this.hass.localize,
          this.hass.services,
          this._manifests
        );

    const groupItems = this._getGroupItems(
      this._params.type,
      undefined,
      undefined,
      this.hass.localize,
      this.hass.services,
      this._manifests
    );

    const groupName = isService(this._group)
      ? domainToName(
          this.hass.localize,
          getService(this._group!),
          this._manifests?.[getService(this._group!)]
        )
      : this.hass.localize(
          // @ts-ignore
          `ui.panel.config.automation.editor.${this._params.type}s.groups.${this._group}.label`
        );

    return html`
      <ha-wa-dialog
        open
        persist-initial-height
        @after-show=${this._opened}
        @closed=${this.closeDialog}
      >
        <div slot="header">
          <ha-dialog-header>
            <span slot="title"
              >${this._group
                ? groupName
                : this.hass.localize(
                    `ui.panel.config.automation.editor.${this._params.type}s.add`
                  )}</span
            >
            ${this._group && this._group !== this._params.group
              ? html`<ha-icon-button-prev
                  slot="navigationIcon"
                  @click=${this._back}
                ></ha-icon-button-prev>`
              : html`<ha-icon-button
                  .path=${mdiClose}
                  slot="navigationIcon"
                  data-dialog="close"
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
                  `ui.panel.config.automation.editor.${this._params.type}s.search`
                )}
          ></search-input>
        </div>
        <div
          id="content"
          style=${styleMap({
            height: this._height ? `${Math.min(468, this._height)}px` : "100vh",
          })}
        >
          <ha-md-list
            class="groups"
            dialogInitialFocus=${ifDefined(this._fullScreen ? "" : undefined)}
          >
            ${this._params.clipboardItem &&
            !this._filter &&
            (!this._group ||
              items.find((item) => item.key === this._params!.clipboardItem))
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
                            `ui.panel.config.automation.editor.${this._params.type}s.paste`
                          )}
                        </div>
                        <div class="supporting-text">
                          ${this.hass.localize(
                            // @ts-ignore
                            `ui.panel.config.automation.editor.${this._params.type}s.type.${this._params.clipboardItem}.label`
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
                  <ha-md-divider
                    role="separator"
                    tabindex="-1"
                  ></ha-md-divider>`
              : nothing}
            ${repeat(
              groupItems,
              (item) => item.key,
              (item) => html`
                <ha-md-list-item
                  interactive
                  type="button"
                  .value=${item.key}
                  .group=${item.group}
                  @click=${this._selected}
                  class=${item.key === this._group ? "selected" : ""}
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
          </ha-md-list>
          <div class="items ${!this._group ? "blank" : ""}">
            ${!this._group
              ? "Select a group"
              : html`<h3>${this._params.type}</h3>
                  <ha-md-list
                    dialogInitialFocus=${ifDefined(
                      this._fullScreen ? "" : undefined
                    )}
                  >
                    ${this._params.clipboardItem &&
                    !this._filter &&
                    (!this._group ||
                      items.find(
                        (item) => item.key === this._params!.clipboardItem
                      ))
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
                                    `ui.panel.config.automation.editor.${this._params.type}s.paste`
                                  )}
                                </div>
                                <div class="supporting-text">
                                  ${this.hass.localize(
                                    // @ts-ignore
                                    `ui.panel.config.automation.editor.${this._params.type}s.type.${this._params.clipboardItem}.label`
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
                          <ha-md-divider
                            role="separator"
                            tabindex="-1"
                          ></ha-md-divider>`
                      : nothing}
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
      </ha-wa-dialog>
    `;
  }

  private _back() {
    this._dialogElement?.bodyContainer.scrollTo(0, 0);
    if (this._filter) {
      this._filter = "";
      return;
    }
    if (this._prev) {
      this._group = this._prev;
      this._prev = undefined;
      return;
    }
    this._group = undefined;
  }

  private _selected(ev) {
    this._dialogElement?.bodyContainer.scrollTo(0, 0);
    const item = ev.currentTarget;
    if (item.group) {
      this._prev = this._group;
      this._group = item.value;
      return;
    }
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-wa-dialog {
          --dialog-content-padding: 0;
          --ha-dialog-width-md: 888px;
          --mdc-dialog-max-height: 60vh;
          --mdc-dialog-max-height: 60dvh;
        }
        @media all and (min-width: 550px) {
          ha-wa-dialog {
            --mdc-dialog-min-width: 500px;
          }
        }
        ha-icon-next {
          width: 24px;
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
