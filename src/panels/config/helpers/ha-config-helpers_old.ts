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
} from "lit-element";
import memoize from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import "../../../common/search/search-input";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-icon";
import { fetchInputBoolean } from "../../../data/input_boolean";
import { fetchInputDateTime } from "../../../data/input_datetime";
import { fetchInputNumber } from "../../../data/input_number";
import { fetchInputSelect } from "../../../data/input_select";
import { fetchInputText } from "../../../data/input_text";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-tabs-subpage-data-table";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { showEntityEditorDialog } from "../entities/show-dialog-entity-editor";
import { EntityRegistryEntry } from "../../../data/entity_registry";

export interface Helper {
  name: string;
  type: string;
  id: string;
  [key: string]: any;
}

const HELPER_DOMAINS = [
  "input_boolean",
  "input_text",
  "input_number",
  "input_datetime",
  "input_select",
];

@customElement("ha-config-helpers")
export class HaConfigHelpers extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public isWide!: boolean;
  @property() public narrow!: boolean;
  @property() public route!: Route;
  @property() private _storageItems?: Helper[];
  @property() private _stateItems: HassEntity[] = [];

  private _columns = memoize(
    (_narrow, _language): DataTableColumnContainer => {
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
        },
        type: {
          title: this.hass.localize(
            "ui.panel.config.helpers.picker.headers.type"
          ),
          sortable: true,
          filterable: true,
          template: (type) =>
            html`
              ${this.hass.localize(
                `ui.panel.config.helpers.picker.types.${type}`
              ) || type}
            `,
        },
      };
    }
  );

  private _filteredItems = memoize(
    (storageItems: Helper[], stateItems: HassEntity[]) => {
      const stateHelpers = stateItems.map((state) => {
        return {
          uid: state.entity_id,
          icon: state.attributes.icon,
          name: state.attributes.friendly_name || state.entity_id,
          type: computeStateDomain(state),
        };
      });
      return storageItems.concat(stateHelpers);
    }
  );

  protected render(): TemplateResult {
    if (!this.hass || this._storageItems === undefined) {
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
        .columns=${this._columns(this.narrow, this.hass.language)}
        .data=${this._filteredItems(this._storageItems, this._stateItems)}
        id="uid"
        @row-click=${this._openEditDialog}
      >
      </hass-tabs-subpage-data-table>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._fetchData();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (oldHass && this._stateItems) {
      this._getStates(oldHass);
    }
  }

  private async _fetchData() {
    const inputBooleanProm = isComponentLoaded(this.hass, "input_boolean")
      ? fetchInputBoolean(this.hass!)
      : Promise.resolve([]);
    const inputDateTimeProm = isComponentLoaded(this.hass, "input_datetime")
      ? fetchInputDateTime(this.hass!)
      : Promise.resolve([]);
    const inputTextProm = isComponentLoaded(this.hass, "input_text")
      ? fetchInputText(this.hass!)
      : Promise.resolve([]);
    const inputNumberProm = isComponentLoaded(this.hass, "input_number")
      ? fetchInputNumber(this.hass!)
      : Promise.resolve([]);
    const inputSelectProm = isComponentLoaded(this.hass, "input_select")
      ? fetchInputSelect(this.hass!)
      : Promise.resolve([]);
    await Promise.all([
      inputBooleanProm,
      inputDateTimeProm,
      inputTextProm,
      inputNumberProm,
      inputSelectProm,
    ]).then((values) => {
      const [
        inputBoolean,
        inputDateTime,
        inputText,
        inputNumber,
        inputSelect,
      ] = values;
      this._storageItems = inputBoolean
        .map((input) => {
          return {
            ...input,
            type: "input_boolean",
            uid: `input_boolean.${input.id}`,
          };
        })
        .concat(
          // @ts-ignore
          inputDateTime.map((input) => {
            return {
              ...input,
              type: "input_datetime",
              uid: `input_datetime.${input.id}`,
            };
          })
        )
        .concat(
          inputText.map((input) => {
            return {
              ...input,
              type: "input_text",
              uid: `input_text.${input.id}`,
            };
          })
        )
        .concat(
          inputNumber.map((input) => {
            return {
              ...input,
              type: "input_number",
              uid: `input_number.${input.id}`,
            };
          })
        )
        .concat(
          inputSelect.map((input) => {
            return {
              ...input,
              type: "input_select",
              uid: `input_select.${input.id}`,
            };
          })
        );
    });
    this._getStates();
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
      if (entity.attributes.editable) {
        return false;
      }
      return true;
    });

    if (changed) {
      this._stateItems = tempStates;
    }
  }

  private async _openEditDialog(ev: CustomEvent): Promise<void> {
    const itemId = (ev.detail as RowClickedEvent).id;
    const item = this._storageItems!.find((i) => i.uid === itemId);
    if (item) {
    } else {
      const entry: EntityRegistryEntry = await this.hass.callWS({
        type: "config/entity_registry/get",
        entity_id: itemId,
      });

      showEntityEditorDialog(this, {
        entry,
        entity_id: itemId,
      });
    }
  }
}
