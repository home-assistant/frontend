import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { mdiAlertCircle, mdiPencilOff, mdiPlus } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { LitElement, PropertyValues, TemplateResult, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { navigate } from "../../../common/navigate";
import {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import { extractSearchParam } from "../../../common/url/search-params";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import {
  ConfigEntry,
  subscribeConfigEntries,
} from "../../../data/config_entries";
import { getConfigFlowHandlers } from "../../../data/config_flow";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import { domainToName } from "../../../data/integration";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import "../integrations/ha-integration-overflow-menu";
import { isHelperDomain } from "./const";
import { showHelperDetailDialog } from "./show-dialog-helper-detail";

type HelperItem = {
  id: string;
  name: string;
  icon?: string;
  entity_id: string;
  editable?: boolean;
  type: string;
  configEntry?: ConfigEntry;
  entity?: HassEntity;
};

// This groups items by a key but only returns last entry per key.
const groupByOne = <T>(
  items: T[],
  keySelector: (item: T) => string
): Record<string, T> => {
  const result: Record<string, T> = {};
  for (const item of items) {
    result[keySelector(item)] = item;
  }
  return result;
};

const getConfigEntry = (
  entityEntries: Record<string, EntityRegistryEntry>,
  configEntries: Record<string, ConfigEntry>,
  entityId: string
) => {
  const configEntryId = entityEntries![entityId]?.config_entry_id;
  return configEntryId ? configEntries![configEntryId] : undefined;
};

@customElement("ha-config-helpers")
export class HaConfigHelpers extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @state() private _stateItems: HassEntity[] = [];

  @state() private _entityEntries?: Record<string, EntityRegistryEntry>;

  @state() private _configEntries?: Record<string, ConfigEntry>;

  public hassSubscribe() {
    return [
      subscribeConfigEntries(
        this.hass,
        async (messages) => {
          const newEntries = this._configEntries
            ? { ...this._configEntries }
            : {};
          messages.forEach((message) => {
            if (message.type === null || message.type === "added") {
              newEntries[message.entry.entry_id] = message.entry;
            } else if (message.type === "removed") {
              delete newEntries[message.entry.entry_id];
            } else if (message.type === "updated") {
              newEntries[message.entry.entry_id] = message.entry;
            }
          });
          this._configEntries = newEntries;
        },
        { type: ["helper"] }
      ),
      subscribeEntityRegistry(this.hass.connection!, (entries) => {
        this._entityEntries = groupByOne(entries, (entry) => entry.entity_id);
      }),
    ];
  }

  private _columns = memoizeOne(
    (narrow: boolean, localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<HelperItem> = {
        icon: {
          title: "",
          label: localize("ui.panel.config.helpers.picker.headers.icon"),
          type: "icon",
          template: (helper) =>
            helper.entity
              ? html`<ha-state-icon .state=${helper.entity}></ha-state-icon>`
              : html`<ha-svg-icon
                  .path=${helper.icon}
                  style="color: var(--error-color)"
                ></ha-svg-icon>`,
        },
        name: {
          title: localize("ui.panel.config.helpers.picker.headers.name"),
          main: true,
          sortable: true,
          filterable: true,
          grows: true,
          direction: "asc",
          template: (helper) => html`
            ${helper.name}
            ${narrow
              ? html`<div class="secondary">${helper.entity_id}</div> `
              : ""}
          `,
        },
      };
      if (!narrow) {
        columns.entity_id = {
          title: localize("ui.panel.config.helpers.picker.headers.entity_id"),
          sortable: true,
          filterable: true,
          width: "25%",
        };
      }
      columns.type = {
        title: localize("ui.panel.config.helpers.picker.headers.type"),
        sortable: true,
        width: "25%",
        filterable: true,
        template: (helper) =>
          helper.configEntry
            ? domainToName(localize, helper.type)
            : html`
                ${localize(
                  `ui.panel.config.helpers.types.${helper.type}` as LocalizeKeys
                ) || helper.type}
              `,
      };
      columns.editable = {
        title: "",
        label: this.hass.localize(
          "ui.panel.config.helpers.picker.headers.editable"
        ),
        type: "icon",
        template: (helper) => html`
          ${!helper.editable
            ? html`
                <div
                  tabindex="0"
                  style="display:inline-block; position: relative;"
                >
                  <ha-svg-icon .path=${mdiPencilOff}></ha-svg-icon>
                  <simple-tooltip animation-delay="0" position="left">
                    ${this.hass.localize(
                      "ui.panel.config.entities.picker.status.readonly"
                    )}
                  </simple-tooltip>
                </div>
              `
            : ""}
        `,
      };
      return columns;
    }
  );

  private _getItems = memoizeOne(
    (
      stateItems: HassEntity[],
      entityEntries: Record<string, EntityRegistryEntry>,
      configEntries: Record<string, ConfigEntry>
    ): HelperItem[] => {
      const configEntriesCopy = { ...configEntries };

      const states = stateItems.map((entityState) => {
        const configEntry = getConfigEntry(
          entityEntries,
          configEntries,
          entityState.entity_id
        );

        if (configEntry) {
          delete configEntriesCopy[configEntry!.entry_id];
        }

        return {
          id: entityState.entity_id,
          name: entityState.attributes.friendly_name || "",
          entity_id: entityState.entity_id,
          editable:
            configEntry !== undefined || entityState.attributes.editable,
          type: configEntry
            ? configEntry.domain
            : computeStateDomain(entityState),
          configEntry,
          entity: entityState,
        };
      });

      if (!Object.keys(configEntriesCopy).length) {
        return states;
      }

      const entries = Object.values(configEntriesCopy).map((configEntry) => ({
        id: configEntry.entry_id,
        entity_id: "",
        icon: mdiAlertCircle,
        name: configEntry.title || "",
        editable: true,
        type: configEntry.domain,
        configEntry,
        entity: undefined,
      }));

      return [...states, ...entries];
    }
  );

  protected render(): TemplateResult {
    if (
      !this.hass ||
      this._stateItems === undefined ||
      this._entityEntries === undefined ||
      this._configEntries === undefined
    ) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.devices}
        .columns=${this._columns(this.narrow, this.hass.localize)}
        .data=${this._getItems(
          this._stateItems,
          this._entityEntries,
          this._configEntries
        )}
        @row-click=${this._openEditDialog}
        hasFab
        clickable
        .noDataText=${this.hass.localize(
          "ui.panel.config.helpers.picker.no_helpers"
        )}
      >
        <ha-integration-overflow-menu
          .hass=${this.hass}
          slot="toolbar-icon"
        ></ha-integration-overflow-menu>
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.helpers.picker.create_helper"
          )}
          extended
          @click=${this._createHelpler}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    if (this.route.path === "/add") {
      this._handleAdd();
    }
  }

  private async _handleAdd() {
    const domain = extractSearchParam("domain");
    navigate("/config/helpers", { replace: true });
    if (!domain) {
      return;
    }
    if (isHelperDomain(domain)) {
      showHelperDetailDialog(this, {
        domain,
      });
      return;
    }
    const handlers = await getConfigFlowHandlers(this.hass, ["helper"]);

    if (!handlers.includes(domain)) {
      const integrations = await getConfigFlowHandlers(this.hass, [
        "device",
        "hub",
        "service",
      ]);
      if (integrations.includes(domain)) {
        navigate(`/config/integrations/add?domain=${domain}`, {
          replace: true,
        });
        return;
      }
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_flow.error"
        ),
        text: this.hass.localize(
          "ui.panel.config.integrations.config_flow.no_config_flow"
        ),
      });
      return;
    }
    const localize = await this.hass.loadBackendTranslation(
      "title",
      domain,
      true
    );
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.integrations.confirm_new", {
          integration: domainToName(localize, domain),
        }),
      }))
    ) {
      return;
    }
    showConfigFlowDialog(this, {
      startFlowHandler: domain,
      showAdvanced: this.hass.userData?.showAdvanced,
    });
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this._entityEntries || !this._configEntries) {
      return;
    }

    let changed =
      !this._stateItems ||
      changedProps.has("_entityEntries") ||
      changedProps.has("_configEntries");

    if (!changed && changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      changed = !oldHass || oldHass.states !== this.hass.states;
    }
    if (!changed) {
      return;
    }

    const extraEntities = new Set<string>();

    for (const entityEntry of Object.values(this._entityEntries)) {
      if (
        entityEntry.config_entry_id &&
        entityEntry.config_entry_id in this._configEntries
      ) {
        extraEntities.add(entityEntry.entity_id);
      }
    }

    const newStates = Object.values(this.hass!.states).filter(
      (entity) =>
        extraEntities.has(entity.entity_id) ||
        isHelperDomain(computeStateDomain(entity))
    );

    if (
      this._stateItems.length !== newStates.length ||
      !this._stateItems.every((val, idx) => newStates[idx] === val)
    ) {
      this._stateItems = newStates;
    }
  }

  private async _openEditDialog(ev: CustomEvent): Promise<void> {
    const id = (ev.detail as RowClickedEvent).id;
    if (id.includes(".")) {
      showMoreInfoDialog(this, { entityId: id });
    } else {
      showOptionsFlowDialog(this, this._configEntries![id]);
    }
  }

  private _createHelpler() {
    showHelperDetailDialog(this, {});
  }
}
