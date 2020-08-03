import "@material/mwc-fab";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import {
  computeRTL,
  computeRTLDirection,
} from "../../../../common/util/compute_rtl";
import "../../../../components/data-table/ha-data-table";
import type {
  DataTableColumnContainer,
  SelectionChangedEvent,
} from "../../../../components/data-table/ha-data-table";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-icon";
import "../../../../components/ha-relative-time";
import type { LovelaceConfig } from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import { computeUnusedEntities } from "../../common/compute-unused-entities";
import type { Lovelace } from "../../types";
import "../../../../components/ha-svg-icon";
import { mdiPlus } from "@mdi/js";
import { showSuggestCardDialog } from "../card-editor/show-suggest-card-dialog";
import { showSelectViewDialog } from "../select-view/show-select-view-dialog";

@customElement("hui-unused-entities")
export class HuiUnusedEntities extends LitElement {
  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow?: boolean;

  @internalProperty() private _unusedEntities: string[] = [];

  @internalProperty() private _selectedEntities: string[] = [];

  private get _config(): LovelaceConfig {
    return this.lovelace.config;
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

    if (narrow) {
      return columns;
    }

    columns.entity_id = {
      title: this.hass!.localize("ui.panel.lovelace.unused_entities.entity_id"),
      sortable: true,
      filterable: true,
      width: "30%",
    };
    columns.domain = {
      title: this.hass!.localize("ui.panel.lovelace.unused_entities.domain"),
      sortable: true,
      filterable: true,
      width: "15%",
    };
    columns.last_changed = {
      title: this.hass!.localize(
        "ui.panel.lovelace.unused_entities.last_changed"
      ),
      type: "numeric",
      sortable: true,
      width: "15%",
      template: (lastChanged: string) => html`
        <ha-relative-time
          .hass=${this.hass!}
          .datetime=${lastChanged}
        ></ha-relative-time>
      `,
    };

    return columns;
  });

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("lovelace")) {
      this._getUnusedEntities();
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this.lovelace) {
      return html``;
    }

    if (this.lovelace.mode === "storage" && this.lovelace.editMode === false) {
      return html``;
    }

    return html`
      <div class="container">
        ${!this.narrow
          ? html`
              <ha-card
                header="${this.hass.localize(
                  "ui.panel.lovelace.unused_entities.title"
                )}"
              >
                <div class="card-content">
                  ${this.hass.localize(
                    "ui.panel.lovelace.unused_entities.available_entities"
                  )}
                  ${this.lovelace.mode === "storage"
                    ? html`
                        <br />${this.hass.localize(
                          "ui.panel.lovelace.unused_entities.select_to_add"
                        )}
                      `
                    : ""}
                </div>
              </ha-card>
            `
          : ""}
        <ha-data-table
          .columns=${this._columns(this.narrow!)}
          .data=${this._unusedEntities.map((entity) => {
            const stateObj = this.hass!.states[entity];
            return {
              icon: "",
              entity_id: entity,
              stateObj,
              name: computeStateName(stateObj),
              domain: computeDomain(entity),
              last_changed: stateObj!.last_changed,
            };
          })}
          .id=${"entity_id"}
          selectable
          @selection-changed=${this._handleSelectionChanged}
          .dir=${computeRTLDirection(this.hass)}
          .searchLabel=${this.hass.localize(
            "ui.panel.lovelace.unused_entities.search"
          )}
          .noDataText=${this.hass.localize(
            "ui.panel.lovelace.unused_entities.no_data"
          )}
        ></ha-data-table>
      </div>
      <div
        class="fab ${classMap({
          rtl: computeRTL(this.hass),
          selected: this._selectedEntities.length,
        })}"
      >
        <mwc-fab
          .label=${this.hass.localize("ui.panel.lovelace.editor.edit_card.add")}
          @click=${this._addToLovelaceView}
        >
          <ha-svg-icon slot="icon" path=${mdiPlus}></ha-svg-icon>
        </mwc-fab>
      </div>
    `;
  }

  private _getUnusedEntities(): void {
    if (!this.hass || !this.lovelace) {
      return;
    }
    this._selectedEntities = [];
    const unusedEntities = computeUnusedEntities(this.hass, this._config!);
    this._unusedEntities = [...unusedEntities].sort();
  }

  private _handleSelectionChanged(
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void {
    this._selectedEntities = ev.detail.value;
  }

  private _handleEntityClicked(ev: Event) {
    const entityId = ((ev.target as HTMLElement).closest(
      ".mdc-data-table__row"
    ) as any).rowId;
    fireEvent(this, "hass-more-info", {
      entityId,
    });
  }

  private _addToLovelaceView(): void {
    if (this.lovelace.config.views.length === 1) {
      showSuggestCardDialog(this, {
        lovelaceConfig: this.lovelace.config!,
        saveConfig: this.lovelace.saveConfig,
        path: [0],
        entities: this._selectedEntities,
      });
      return;
    }
    showSelectViewDialog(this, {
      lovelaceConfig: this.lovelace.config,
      allowDashboardChange: false,
      viewSelectedCallback: (_urlPath, _selectedDashConfig, viewIndex) => {
        showSuggestCardDialog(this, {
          lovelaceConfig: this.lovelace.config!,
          saveConfig: this.lovelace.saveConfig,
          path: [viewIndex],
          entities: this._selectedEntities,
        });
      },
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        background: var(--lovelace-background);
      }
      .container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      ha-card {
        --ha-card-box-shadow: none;
        --ha-card-border-radius: 0;
      }
      ha-data-table {
        --data-table-border-width: 0;
        flex-grow: 1;
        margin-top: -20px;
      }
      .fab {
        overflow: hidden;
        position: absolute;
        right: 0;
        bottom: 0;
        padding: 16px;
        padding-right: calc(16px + env(safe-area-inset-right));
        padding-bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 1;
      }
      .fab.rtl {
        right: initial;
        left: 0;
        bottom: 0;
        padding-right: 16px;
        padding-left: calc(16px + env(safe-area-inset-left));
      }
      mwc-fab {
        position: relative;
        bottom: calc(-80px - env(safe-area-inset-bottom));
        transition: bottom 0.3s;
      }
      .fab.selected mwc-fab {
        bottom: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-unused-entities": HuiUnusedEntities;
  }
}
