import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeEntityName } from "../../../../common/entity/compute_entity_name";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import { computeRTL } from "../../../../common/util/compute_rtl";
import "../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  SelectionChangedEvent,
} from "../../../../components/data-table/ha-data-table";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-relative-time";
import { domainToName } from "../../../../data/integration";
import type { HomeAssistant } from "../../../../types";

const ENTITY_ID_STYLE = styleMap({
  fontFamily: "var(--ha-font-family-code)",
  fontSize: "var(--ha-font-size-xs)",
});

interface EntityPickerTableRowData extends DataTableRowData {
  icon: string;
  entity_id: string;
  stateObj: any;
  name: string;
  entity_name?: string;
  device_name?: string;
  area_name?: string;
  domain_name: string;
  last_changed: string;
}

@customElement("hui-entity-picker-table")
export class HuiEntityPickerTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, attribute: "no-label-float" })
  public noLabelFloat? = false;

  @property({ type: Array }) public entities?: string[];

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this.hass.loadBackendTranslation("title");
  }

  private _data = memoizeOne(
    (
      states: HomeAssistant["states"],
      localize: LocalizeFunc,
      entities?: string[]
    ): EntityPickerTableRowData[] =>
      (entities || Object.keys(states)).map<EntityPickerTableRowData>(
        (entity) => {
          const stateObj = this.hass.states[entity];

          const { area, device } = getEntityContext(stateObj, this.hass);

          const entityName = computeEntityName(stateObj, this.hass);
          const deviceName = device ? computeDeviceName(device) : undefined;
          const areaName = area ? computeAreaName(area) : undefined;
          const name = [deviceName, entityName].filter(Boolean).join(" ");
          const domain = computeDomain(entity);

          return {
            icon: "",
            entity_id: entity,
            stateObj,
            name: name,
            entity_name: entityName,
            device_name: deviceName,
            area_name: areaName,
            domain_name: domainToName(localize, domain),
            last_changed: stateObj!.last_changed,
          } satisfies EntityPickerTableRowData;
        }
      )
  );

  protected render(): TemplateResult {
    const data = this._data(
      this.hass.states,
      this.hass.localize,
      this.entities
    );

    const showEntityId = Boolean(this.hass.userData?.showEntityIdPicker);

    const columns = this._columns(
      this.narrow,
      computeRTL(this.hass),
      showEntityId
    );

    return html`
      <ha-data-table
        class=${showEntityId ? "show-entity-id" : ""}
        .hass=${this.hass}
        selectable
        .id=${"entity_id"}
        .columns=${columns}
        .data=${data}
        .searchLabel=${this.hass.localize(
          "ui.panel.lovelace.unused_entities.search"
        )}
        .noLabelFloat=${this.noLabelFloat}
        .noDataText=${this.hass.localize(
          "ui.panel.lovelace.unused_entities.no_data"
        )}
        @selection-changed=${this._handleSelectionChanged}
      ></ha-data-table>
    `;
  }

  private _columns = memoizeOne(
    (narrow: boolean, isRTL: boolean, showEntityId: boolean) => {
      const columns: DataTableColumnContainer = {
        icon: {
          title: "",
          label: this.hass!.localize(
            "ui.panel.lovelace.unused_entities.state_icon"
          ),
          type: "icon",
          template: (entity) => html`
            <state-badge
              @click=${this._handleEntityClicked}
              .hass=${this.hass!}
              .stateObj=${entity.stateObj}
            ></state-badge>
          `,
        },
        name: {
          title: this.hass!.localize(
            "ui.panel.lovelace.unused_entities.entity"
          ),
          sortable: true,
          filterable: true,
          flex: 2,
          main: true,
          direction: "asc",
          template: (entity: any) => {
            const primary =
              entity.entity_name || entity.device_name || entity.entity_id;
            const secondary = [
              entity.area_name,
              entity.entity_name ? entity.device_name : undefined,
            ]
              .filter(Boolean)
              .join(isRTL ? " ◂ " : " ▸ ");
            return html`
              <div @click=${this._handleEntityClicked} style="cursor: pointer;">
                ${primary}
                ${secondary
                  ? html`<div class="secondary">${secondary}</div>`
                  : nothing}
                ${narrow && showEntityId
                  ? html`
                      <div class="secondary" style=${ENTITY_ID_STYLE}>
                        ${entity.entity_id}
                      </div>
                    `
                  : nothing}
              </div>
            `;
          },
        },
      };

      columns.entity_name = {
        title: "entity_name",
        filterable: true,
        hidden: true,
      };

      columns.device_name = {
        title: "device_name",
        filterable: true,
        hidden: true,
      };

      columns.area_name = {
        title: "area_name",
        filterable: true,
        hidden: true,
      };

      columns.entity_id = {
        title: this.hass!.localize(
          "ui.panel.lovelace.unused_entities.entity_id"
        ),
        sortable: true,
        filterable: true,
        hidden: narrow || !showEntityId,
      };

      columns.domain_name = {
        title: this.hass!.localize("ui.panel.lovelace.unused_entities.domain"),
        sortable: true,
        filterable: true,
        hidden: narrow || showEntityId,
      };

      columns.last_changed = {
        title: this.hass!.localize(
          "ui.panel.lovelace.unused_entities.last_changed"
        ),
        type: "numeric",
        sortable: true,
        hidden: narrow,
        template: (entity) => html`
          <ha-relative-time
            .hass=${this.hass!}
            .datetime=${entity.last_changed}
            capitalize
          ></ha-relative-time>
        `,
      };

      return columns;
    }
  );

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    const selectedEntities = ev.detail.value;

    fireEvent(this, "selected-changed", { selectedEntities });
  }

  private _handleEntityClicked(ev: Event) {
    const entityId = (
      (ev.target as HTMLElement).closest(".mdc-data-table__row") as any
    ).rowId;
    fireEvent(this, "hass-more-info", {
      entityId,
    });
  }

  static styles = css`
    ha-data-table {
      --data-table-border-width: 0;
      height: 100%;
    }
    ha-data-table.show-entity-id {
      --data-table-row-height: 64px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-picker-table": HuiEntityPickerTable;
  }
}
