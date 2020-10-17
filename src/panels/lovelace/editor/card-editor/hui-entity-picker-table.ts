import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import "../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  SelectionChangedEvent,
} from "../../../../components/data-table/ha-data-table";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-relative-time";
import type { HomeAssistant } from "../../../../types";

@customElement("hui-entity-picker-table")
export class HuiEntityPickerTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow?: boolean;

  @property({ type: Boolean, attribute: "no-label-float" })
  public noLabelFloat? = false;

  @property({ type: Array }) public entities!: DataTableRowData[];

  protected render(): TemplateResult {
    return html`
      <ha-data-table
        selectable
        .id=${"entity_id"}
        .columns=${this._columns(this.narrow!)}
        .data=${this.entities}
        .dir=${computeRTLDirection(this.hass)}
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

  private _columns = memoizeOne((narrow: boolean) => {
    const columns: DataTableColumnContainer = {
      icon: {
        title: "",
        type: "icon",
        template: (_icon, entity: any) => html`
          <state-badge
            @click=${this._handleEntityClicked}
            .hass=${this.hass!}
            .stateObj=${entity.stateObj}
          ></state-badge>
        `,
      },
      name: {
        title: this.hass!.localize("ui.panel.lovelace.unused_entities.entity"),
        sortable: true,
        filterable: true,
        grows: true,
        direction: "asc",
        template: (name, entity: any) => html`
          <div @click=${this._handleEntityClicked} style="cursor: pointer;">
            ${name}
            ${narrow
              ? html`
                  <div class="secondary">
                    ${entity.stateObj.entity_id}
                  </div>
                `
              : ""}
          </div>
        `,
      },
    };

    columns.entity_id = {
      title: this.hass!.localize("ui.panel.lovelace.unused_entities.entity_id"),
      sortable: true,
      filterable: true,
      width: "30%",
      hidden: narrow,
    };

    columns.domain = {
      title: this.hass!.localize("ui.panel.lovelace.unused_entities.domain"),
      sortable: true,
      filterable: true,
      width: "15%",
      hidden: narrow,
    };

    columns.last_changed = {
      title: this.hass!.localize(
        "ui.panel.lovelace.unused_entities.last_changed"
      ),
      type: "numeric",
      sortable: true,
      width: "15%",
      hidden: narrow,
      template: (lastChanged: string) => html`
        <ha-relative-time
          .hass=${this.hass!}
          .datetime=${lastChanged}
        ></ha-relative-time>
      `,
    };

    return columns;
  });

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    const selectedEntities = ev.detail.value;

    fireEvent(this, "selected-changed", { selectedEntities });
  }

  private _handleEntityClicked(ev: Event) {
    const entityId = ((ev.target as HTMLElement).closest(
      ".mdc-data-table__row"
    ) as any).rowId;
    fireEvent(this, "hass-more-info", {
      entityId,
    });
  }

  static get styles(): CSSResult {
    return css`
      ha-data-table {
        --data-table-border-width: 0;
        height: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-picker-table": HuiEntityPickerTable;
  }
}
