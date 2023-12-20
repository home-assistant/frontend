import "@material/mwc-list/mwc-list";
import { mdiClose, mdiContentPaste, mdiPlus } from "@mdi/js";
import Fuse, { IFuseOptions } from "fuse.js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { domainIcon } from "../../../common/entity/domain_icon";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { stringCompare } from "../../../common/string/compare";
import { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-dialog";
import type { HaDialog } from "../../../components/ha-dialog";
import "../../../components/ha-header-bar";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../components/search-input";
import {
  ACTION_BUILDING_BLOCKS_GROUPS,
  ACTION_GROUPS,
  ACTION_ICONS,
} from "../../../data/action";
import { AutomationElementGroup } from "../../../data/automation";
import {
  CONDITION_BUILDING_BLOCKS_GROUPS,
  CONDITION_GROUPS,
  CONDITION_ICONS,
} from "../../../data/condition";
import {
  IntegrationManifest,
  domainToName,
  fetchIntegrationManifests,
} from "../../../data/integration";
import { TRIGGER_GROUPS, TRIGGER_ICONS } from "../../../data/trigger";
import { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import {
  AddAutomationElementDialogParams,
  PASTE_VALUE,
} from "./show-add-automation-element-dialog";

const TYPES = {
  trigger: { groups: TRIGGER_GROUPS, icons: TRIGGER_ICONS },
  condition: {
    groups: CONDITION_GROUPS,
    building_blocks: CONDITION_BUILDING_BLOCKS_GROUPS,
    icons: CONDITION_ICONS,
  },
  action: {
    groups: ACTION_GROUPS,
    building_blocks: ACTION_BUILDING_BLOCKS_GROUPS,
    icons: ACTION_ICONS,
  },
};

interface ListItem {
  key: string;
  name: string;
  description: string;
  icon: string;
  group: boolean;
}

interface DomainManifestLookup {
  [domain: string]: IntegrationManifest;
}

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

@customElement("add-automation-element-dialog")
class DialogAddAutomationElement extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: AddAutomationElementDialogParams;

  @state() private _group?: string;

  @state() private _prev?: string;

  @state() private _filter = "";

  @state() private _manifests?: DomainManifestLookup;

  @query("ha-dialog") private _dialog?: HaDialog;

  public showDialog(params): void {
    this._params = params;
    if (this._params?.type === "action") {
      this.hass.loadBackendTranslation("services");
      this._fetchManifests();
    }
  }

  public closeDialog(): void {
    if (this._params) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._params = undefined;
    this._group = undefined;
    this._prev = undefined;
    this._filter = "";
    this._manifests = undefined;
  }

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
    icon: options.icon || TYPES[type].icons[key],
  });

  private _getFilteredItems = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      buildingBlocks: AddAutomationElementDialogParams["building_block"],
      group: string | undefined,
      filter: string,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): ListItem[] => {
      const groupKey = buildingBlocks ? "building_blocks" : "groups";
      const groups: AutomationElementGroup = group
        ? group.startsWith("service_")
          ? {}
          : TYPES[type][groupKey][group].members
        : TYPES[type][groupKey];

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

      const options: IFuseOptions<ListItem> = {
        keys: ["key", "name", "description"],
        isCaseSensitive: false,
        minMatchCharLength: Math.min(filter.length, 2),
        threshold: 0.2,
      };
      const fuse = new Fuse(items, options);
      return fuse.search(filter).map((result) => result.item);
    }
  );

  private _getGroupItems = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      buildingBlocks: AddAutomationElementDialogParams["building_block"],
      group: string | undefined,
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests?: DomainManifestLookup
    ): ListItem[] => {
      const groupKey = buildingBlocks ? "building_blocks" : "groups";

      if (type === "action" && group?.startsWith("service_")) {
        const result = this._services(localize, services, manifests, group);
        if (group === "service_media_player") {
          result.unshift(this._convertToItem("play_media", {}, type, localize));
        }
        return result;
      }

      const groups: AutomationElementGroup = group
        ? TYPES[type][groupKey][group].members
        : TYPES[type][groupKey];

      const result = Object.entries(groups).map(([key, options]) =>
        this._convertToItem(key, options, type, localize)
      );

      if (type === "action" && !buildingBlocks) {
        if (!this._group) {
          result.unshift(
            ...this._serviceGroups(localize, services, manifests, false, false)
          );
        } else if (this._group === "helpers") {
          result.unshift(
            ...this._serviceGroups(localize, services, manifests, true, false)
          );
        } else if (this._group === "other") {
          result.unshift(
            ...this._serviceGroups(localize, services, manifests, false, true)
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

  private _serviceGroups = memoizeOne(
    (
      localize: LocalizeFunc,
      services: HomeAssistant["services"],
      manifests: DomainManifestLookup | undefined,
      helper: boolean,
      other: boolean
    ): ListItem[] => {
      if (!services || !manifests) {
        return [];
      }
      const result: ListItem[] = [];
      Object.keys(services)
        .sort()
        .forEach((domain) => {
          const manifest = manifests[domain];
          if (
            (!helper &&
              !other &&
              manifest?.integration_type === "entity" &&
              !ENTITY_DOMAINS_OTHER.has(domain)) ||
            (helper && manifest?.integration_type === "helper") ||
            (other &&
              (ENTITY_DOMAINS_OTHER.has(domain) ||
                !["helper", "entity"].includes(
                  manifest?.integration_type || ""
                )))
          ) {
            result.push({
              group: true,
              icon: domainIcon(domain),
              key: `service_${domain}`,
              name: domainToName(localize, domain, manifest),
              description: "",
            });
          }
        });
      return result;
    }
  );

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

      if (group && group.startsWith("service_")) {
        domain = group.substring(8);
      }

      const addDomain = (dmn: string) => {
        const services_keys = Object.keys(services[dmn]);

        for (const service of services_keys) {
          result.push({
            group: false,
            icon: domainIcon(dmn),
            key: `service_${dmn}.${service}`,
            name: `${domain ? "" : `${domainToName(localize, dmn)}: `}${
              this.hass.localize(`component.${dmn}.services.${service}.name`) ||
              services[dmn][service]?.name ||
              service
            }`,
            description:
              this.hass.localize(
                `component.${domain}.services.${service}.description`
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

      Object.keys(services)
        .sort()
        .forEach((dmn) => {
          const manifest = manifests?.[dmn];
          if (group === "helper" && manifest?.integration_type !== "helper") {
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

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const items = this._filter
      ? this._getFilteredItems(
          this._params.type,
          this._params.building_block,
          this._group,
          this._filter,
          this.hass.localize,
          this.hass.services,
          this._manifests
        )
      : this._getGroupItems(
          this._params.type,
          this._params.building_block,
          this._group,
          this.hass.localize,
          this.hass.services,
          this._manifests
        );

    const groupName = this._group?.startsWith("service_")
      ? domainToName(
          this.hass.localize,
          this._group.substring(8),
          this._manifests?.[this._group.substring(8)]
        )
      : this.hass.localize(
          // @ts-ignore
          `ui.panel.config.automation.editor.${this._params.type}s.groups.${this._group}.label`
        );

    return html`
      <ha-dialog open hideActions @closed=${this.closeDialog} .heading=${true}>
        <div slot="heading">
          <ha-header-bar>
            <span slot="title"
              >${this._group
                ? groupName
                : this.hass.localize(
                    `ui.panel.config.automation.editor.${this._params.type}s.add`
                  )}</span
            >
            ${this._group
              ? html`<ha-icon-button-prev
                  slot="navigationIcon"
                  @click=${this._back}
                ></ha-icon-button-prev>`
              : html`<ha-icon-button
                  .path=${mdiClose}
                  slot="navigationIcon"
                  dialogAction="cancel"
                ></ha-icon-button>`}
          </ha-header-bar>
          <search-input
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
        <mwc-list
          innerRole="listbox"
          itemRoles="option"
          rootTabbable
          dialogInitialFocus
        >
          ${this._params.clipboardItem &&
          !this._filter &&
          (!this._group ||
            items.find((item) => item.key === this._params!.clipboardItem))
            ? html`<ha-list-item
                  twoline
                  class="paste"
                  .value=${PASTE_VALUE}
                  graphic="icon"
                  hasMeta
                  @request-selected=${this._selected}
                >
                  ${this.hass.localize(
                    `ui.panel.config.automation.editor.${this._params.type}s.paste`
                  )}
                  <span slot="secondary"
                    >${this.hass.localize(
                      // @ts-ignore
                      `ui.panel.config.automation.editor.${this._params.type}s.type.${this._params.clipboardItem}.label`
                    )}</span
                  >
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiContentPaste}
                  ></ha-svg-icon
                  ><ha-svg-icon slot="meta" .path=${mdiPlus}></ha-svg-icon>
                </ha-list-item>
                <li divider role="separator"></li>`
            : ""}
          ${items.map(
            (item) => html`
              <ha-list-item
                .twoline=${Boolean(item.description)}
                .value=${item.key}
                .group=${item.group}
                graphic="icon"
                hasMeta
                @request-selected=${this._selected}
              >
                ${item.name}
                <span slot="secondary">${item.description}</span>
                <ha-svg-icon slot="graphic" .path=${item.icon}></ha-svg-icon>
                ${item.group
                  ? html`<ha-icon-next slot="meta"></ha-icon-next>`
                  : html`<ha-svg-icon
                      slot="meta"
                      .path=${mdiPlus}
                    ></ha-svg-icon>`}
              </ha-list-item>
            `
          )}
        </mwc-list>
      </ha-dialog>
    `;
  }

  private _back() {
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
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._dialog!.scrollToPos(0, 0);
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

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
          --mdc-dialog-max-height: 60vh;
        }
        @media all and (min-width: 550px) {
          ha-dialog {
            --mdc-dialog-min-width: 500px;
          }
        }
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          margin-top: 8px;
          display: block;
        }
        ha-icon-next {
          width: 24px;
        }
        search-input {
          display: block;
          margin: 0 16px;
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
