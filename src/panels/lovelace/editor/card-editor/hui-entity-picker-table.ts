import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
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
        .hass=${this.hass}
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
        title: this.hass!.localize("ui.panel.lovelace.unused_entities.entity"),
        sortable: true,
        filterable: true,
        grows: true,
        direction: "asc",
        template: (entity: any) => html`
          <div @click=${this._handleEntityClicked} style="cursor: pointer;">
            ${entity.name}
            ${narrow
              ? html` <div class="secondary">${entity.entity_id}</div> `
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
      template: (entity) => html`
        <ha-relative-time
          .hass=${this.hass!}
          .datetime=${entity.last_changed}
          capitalize
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
    const entityId = (
      (ev.target as HTMLElement).closest(".mdc-data-table__row") as any
    ).rowId;
    fireEvent(this, "hass-more-info", {
      entityId,
    });
  }

  static get styles(): CSSResultGroup {
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
