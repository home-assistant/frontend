import { mdiPlus } from "@mdi/js";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-tooltip/paper-tooltip";
import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoize from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { domainIcon } from "../../../common/entity/domain_icon";
import "../../../common/search/search-input";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-icon";
import "../../../components/ha-svg-icon";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../types";
import { showEntityEditorDialog } from "../entities/show-dialog-entity-editor";
import { configSections } from "../ha-panel-config";
import { HELPER_DOMAINS } from "./const";
import { showHelperDetailDialog } from "./show-dialog-helper-detail";

@customElement("ha-config-helpers")
export class HaConfigHelpers extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public isWide!: boolean;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @state() private _stateItems: HassEntity[] = [];

  private _columns = memoize((narrow, _language): DataTableColumnContainer => {
    const columns: DataTableColumnContainer = {
      icon: {
        title: "",
        type: "icon",
        template: (icon, helper: any) => html`
          <ha-icon .icon=${icon || domainIcon(helper.type)}></ha-icon>
        `,
      },
      name: {
        title: this.hass.localize(
          "ui.panel.config.helpers.picker.headers.name"
        ),
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
        title: this.hass.localize(
          "ui.panel.config.helpers.picker.headers.entity_id"
        ),
        sortable: true,
        filterable: true,
        width: "25%",
      };
    }
    columns.type = {
      title: this.hass.localize("ui.panel.config.helpers.picker.headers.type"),
      sortable: true,
      width: "25%",
      filterable: true,
      template: (type) =>
        html`
          ${this.hass.localize(`ui.panel.config.helpers.types.${type}`) || type}
        `,
    };
    columns.editable = {
      title: "",
      type: "icon",
      template: (editable) => html`
        ${!editable
          ? html`
              <div
                tabindex="0"
                style="display:inline-block; position: relative;"
              >
                <ha-icon icon="hass:pencil-off"></ha-icon>
                <paper-tooltip animation-delay="0" position="left">
                  ${this.hass.localize(
                    "ui.panel.config.entities.picker.status.readonly"
                  )}
                </paper-tooltip>
              </div>
            `
          : ""}
      `,
    };
    return columns;
  });

  private _getItems = memoize((stateItems: HassEntity[]) =>
    stateItems.map((entityState) => ({
      id: entityState.entity_id,
      icon: entityState.attributes.icon,
      name: entityState.attributes.friendly_name || "",
      entity_id: entityState.entity_id,
      editable: entityState.attributes.editable,
      type: computeStateDomain(entityState),
    }))
  );

  protected render(): TemplateResult {
    if (!this.hass || this._stateItems === undefined) {
      return html` <hass-loading-screen></hass-loading-screen> `;
    }

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.helpers}
        .columns=${this._columns(this.narrow, this.hass.language)}
        .data=${this._getItems(this._stateItems)}
        @row-click=${this._openEditDialog}
        hasFab
        clickable
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
    this._getStates();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (oldHass && this._stateItems) {
      this._getStates(oldHass);
    }
  }

  private _getStates(oldHass?: HomeAssistant) {
    let changed = false;
    const tempStates = Object.values(this.hass!.states).filter((entity) => {
      if (!HELPER_DOMAINS.includes(computeStateDomain(entity))) {
        return false;
      }
      if (oldHass?.states[entity.entity_id] !== entity) {
        changed = true;
      }
      return true;
    });

    if (changed || this._stateItems.length !== tempStates.length) {
      this._stateItems = tempStates;
    }
  }

  private async _openEditDialog(ev: CustomEvent): Promise<void> {
    const entityId = (ev.detail as RowClickedEvent).id;
    showEntityEditorDialog(this, {
      entity_id: entityId,
    });
  }

  private _createHelpler() {
    showHelperDetailDialog(this);
  }
}
