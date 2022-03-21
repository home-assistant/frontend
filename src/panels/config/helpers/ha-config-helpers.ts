import { mdiDelete, mdiPencil, mdiPencilOff, mdiPlus } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { domainIcon } from "../../../common/entity/domain_icon";
import { LocalizeFunc } from "../../../common/translations/localize";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-icon";
import "../../../components/ha-svg-icon";
import {
  ConfigEntry,
  deleteConfigEntry,
  getConfigEntries,
} from "../../../data/config_entries";
import {
  EntityRegistryEntry,
  getExtendedEntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import { domainToName } from "../../../data/integration";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { HomeAssistant, Route } from "../../../types";
import { showEntityEditorDialog } from "../entities/show-dialog-entity-editor";
import { configSections } from "../ha-panel-config";
import { HELPER_DOMAINS } from "./const";
import { showHelperDetailDialog } from "./show-dialog-helper-detail";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { computeDomain } from "../../../common/entity/compute_domain";
import { HELPERS_CRUD } from "../../../data/helpers_crud";

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

  // @state() private _entitiesConfigEntryLookup?: Record<string, string>;

  @state() private _configEntries?: Record<string, ConfigEntry>;

  private _columns = memoizeOne(
    (narrow: boolean, localize: LocalizeFunc): DataTableColumnContainer => {
      const columns: DataTableColumnContainer = {
        icon: {
          title: "",
          label: localize("ui.panel.config.helpers.picker.headers.icon"),
          type: "icon",
          template: (icon, helper: any) =>
            icon
              ? html` <ha-icon .icon=${icon}></ha-icon> `
              : html`<ha-svg-icon
                  .path=${domainIcon(helper.type)}
                ></ha-svg-icon>`,
        },
        name: {
          title: localize("ui.panel.config.helpers.picker.headers.name"),
          sortable: true,
          filterable: true,
          grows: true,
          direction: "asc",
          template: (name, item: any) =>
            html`
              ${name}
              ${narrow
                ? html` <div class="secondary">${item.entity_id}</div> `
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
        template: (type, row) =>
          row.configEntry
            ? domainToName(localize, type)
            : html`
                ${localize(`ui.panel.config.helpers.types.${type}`) || type}
              `,
      };
      columns.editable = {
        title: "",
        label: localize("ui.panel.config.helpers.picker.headers.actions"),
        type: "overflow-menu",
        template: (editable, item) => html`
          <ha-icon-overflow-menu
            .hass=${this.hass}
            .narrow=${this.narrow}
            .items=${[
              editable
                ? {
                    path: mdiPencil,
                    label: localize(
                      "ui.panel.config.helpers.picker.edit_helper"
                    ),
                    action: () => this._openEditDialog(item.entity_id),
                  }
                : {
                    path: mdiPencilOff,
                    disabled: true,
                    tooltip: localize(
                      "ui.panel.config.entities.picker.status.readonly"
                    ),
                  },
              {
                path: mdiDelete,
                label: localize("ui.panel.config.helpers.picker.delete_helper"),
                action: () => this._handleRemove(item.entity_id),
              },
            ]}
            style="color: var(--secondary-text-color)"
          ></ha-icon-overflow-menu>
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
    ) =>
      stateItems.map((entityState) => {
        const configEntry = getConfigEntry(
          entityEntries,
          configEntries,
          entityState.entity_id
        );

        return {
          id: entityState.entity_id,
          icon: entityState.attributes.icon,
          name: entityState.attributes.friendly_name || "",
          entity_id: entityState.entity_id,
          editable:
            configEntry !== undefined || entityState.attributes.editable,
          type: configEntry
            ? configEntry.domain
            : computeStateDomain(entityState),
          configEntry,
        };
      })
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
        .tabs=${configSections.automations}
        .columns=${this._columns(this.narrow, this.hass.localize)}
        .data=${this._getItems(
          this._stateItems,
          this._entityEntries,
          this._configEntries
        )}
        hasFab
        .noDataText=${this.hass.localize(
          "ui.panel.config.helpers.picker.no_helpers"
        )}
      >
        <ha-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.helpers.picker.add_helper"
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
    this._getConfigEntries();
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
        HELPER_DOMAINS.includes(computeStateDomain(entity))
    );

    if (
      this._stateItems.length !== newStates.length ||
      !this._stateItems.every((val, idx) => newStates[idx] === val)
    ) {
      this._stateItems = newStates;
    }
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entries) => {
        this._entityEntries = groupByOne(entries, (entry) => entry.entity_id);
      }),
    ];
  }

  private async _getConfigEntries() {
    this._configEntries = groupByOne(
      await getConfigEntries(this.hass, { type: "helper" }),
      (entry) => entry.entry_id
    );
  }

  private async _openEditDialog(entityId: string): Promise<void> {
    const configEntry = getConfigEntry(
      this._entityEntries!,
      this._configEntries!,
      entityId
    );

    if (!configEntry) {
      showEntityEditorDialog(this, {
        entity_id: entityId,
      });
      return;
    }

    showOptionsFlowDialog(this, configEntry);
  }

  private async _handleRemove(entityId: string): Promise<void> {
    const configEntry = getConfigEntry(
      this._entityEntries!,
      this._configEntries!,
      entityId
    );

    if (
      !(await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.helpers.picker.delete_confirm"
        ),
        confirmText: this.hass!.localize("ui.common.delete"),
        dismissText: this.hass!.localize("ui.common.cancel"),
      }))
    ) {
      return;
    }

    if (configEntry) {
      await deleteConfigEntry(this.hass, configEntry.entry_id);
      this._getConfigEntries();
      return;
    }

    const domain = computeDomain(entityId);
    const entityEntry = await getExtendedEntityRegistryEntry(
      this.hass,
      entityId
    );
    await HELPERS_CRUD[domain].delete(this.hass, entityEntry.unique_id);
  }

  private _createHelpler() {
    showHelperDetailDialog(this, {
      dialogClosedCallback: (params) => {
        if (params.flowFinished) {
          this._getConfigEntries();
        }
      },
    });
  }
}
