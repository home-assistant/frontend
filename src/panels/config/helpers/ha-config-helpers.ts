import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-tooltip/paper-tooltip";
import { HassEntity } from "home-assistant-js-websocket";
import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import memoize from "memoize-one";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import "../../../common/search/search-input";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-icon";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { showEntityEditorDialog } from "../entities/show-dialog-entity-editor";
import { showHelperDetailDialog } from "./show-dialog-helper-detail";
import { HELPER_DOMAINS } from "./const";

@customElement("ha-config-helpers")
export class HaConfigHelpers extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property() public narrow!: boolean;
  @property() public route!: Route;
  @property() private _stateItems: HassEntity[] = [];

  private _columns = memoize(
    (_language): DataTableColumnContainer => {
      return {
        icon: {
          title: "",
          type: "icon",
          template: (icon) => html`
            <ha-icon slot="item-icon" .icon=${icon}></ha-icon>
          `,
        },
        name: {
          title: this.hass.localize(
            "ui.panel.config.helpers.picker.headers.name"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          template: (name, item: any) =>
            html`
              ${name}
              <div class="secondary">
                ${item.entity_id}
              </div>
            `,
        },
        type: {
          title: this.hass.localize(
            "ui.panel.config.helpers.picker.headers.type"
          ),
          sortable: true,
          filterable: true,
          template: (type) =>
            html`
              ${this.hass.localize(`ui.panel.config.helpers.types.${type}`) ||
                type}
            `,
        },
      };
    }
  );

  private _getItems = memoize((stateItems: HassEntity[]) => {
    return stateItems.map((state) => {
      return {
        id: state.entity_id,
        icon: state.attributes.icon,
        name: state.attributes.friendly_name || "",
        entity_id: state.entity_id,
        editable: state.attributes.editable,
        type: computeStateDomain(state),
      };
    });
  });

  protected render(): TemplateResult {
    if (!this.hass || this._stateItems === undefined) {
      return html`
        <hass-loading-screen></hass-loading-screen>
      `;
    }

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automation}
        .columns=${this._columns(this.hass.language)}
        .data=${this._getItems(this._stateItems)}
        @row-click=${this._openEditDialog}
      >
      </hass-tabs-subpage-data-table>
      <ha-fab
        ?is-wide=${this.isWide}
        ?narrow=${this.narrow}
        icon="hass:plus"
        title="${this.hass.localize(
          "ui.panel.config.helpers.picker.add_helper"
        )}"
        @click=${this._createHelpler}
      ></ha-fab>
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

  static get styles(): CSSResult {
    return css`
      ha-fab {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 1;
      }
      ha-fab[is-wide] {
        bottom: 24px;
        right: 24px;
      }
      ha-fab[narrow] {
        bottom: 84px;
      }
    `;
  }
}
