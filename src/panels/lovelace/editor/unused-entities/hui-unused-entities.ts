import {
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
  property,
  customElement,
  css,
  CSSResult,
} from "lit-element";

import { classMap } from "lit-html/directives/class-map";

import memoizeOne from "memoize-one";

import "../../../../components/ha-fab";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-relative-time";
import "../../../../components/ha-icon";

import "../../../../components/data-table/ha-data-table";
// tslint:disable-next-line
import {
  SelectionChangedEvent,
  DataTableColumnContainer,
} from "../../../../components/data-table/ha-data-table";

import { computeStateName } from "../../../../common/entity/compute_state_name";
import { computeDomain } from "../../../../common/entity/compute_domain";

import { computeRTL } from "../../../../common/util/compute_rtl";
import { computeUnusedEntities } from "../../common/compute-unused-entities";

import { HomeAssistant } from "../../../../types";
import { Lovelace } from "../../types";
import { LovelaceConfig } from "../../../../data/lovelace";
import { fireEvent } from "../../../../common/dom/fire_event";
import { addEntitiesToLovelaceView } from "../add-entities-to-view";

@customElement("hui-unused-entities")
export class HuiUnusedEntities extends LitElement {
  @property() public lovelace?: Lovelace;

  @property() public hass!: HomeAssistant;

  @property() public narrow?: boolean;

  @property() private _unusedEntities: string[] = [];

  private _selectedEntities: string[] = [];

  private get _config(): LovelaceConfig {
    return this.lovelace!.config;
  }

  private _columns = memoizeOne((narrow: boolean) => {
    const columns: DataTableColumnContainer = {
      entity: {
        title: this.hass!.localize("ui.panel.lovelace.unused_entities.entity"),
        sortable: true,
        filterable: true,
        filterKey: "friendly_name",
        direction: "asc",
        template: (stateObj) => html`
          <div @click=${this._handleEntityClicked} style="cursor: pointer;">
            <state-badge
              .hass=${this.hass!}
              .stateObj=${stateObj}
            ></state-badge>
            ${stateObj.friendly_name}
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
    };
    columns.domain = {
      title: this.hass!.localize("ui.panel.lovelace.unused_entities.domain"),
      sortable: true,
      filterable: true,
    };
    columns.last_changed = {
      title: this.hass!.localize(
        "ui.panel.lovelace.unused_entities.last_changed"
      ),
      type: "numeric",
      sortable: true,
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
      <ha-data-table
        .columns=${this._columns(this.narrow!)}
        .data=${this._unusedEntities.map((entity) => {
          const stateObj = this.hass!.states[entity];
          return {
            entity_id: entity,
            entity: {
              ...stateObj,
              friendly_name: computeStateName(stateObj),
            },
            domain: computeDomain(entity),
            last_changed: stateObj!.last_changed,
          };
        })}
        .id=${"entity_id"}
        selectable
        @selection-changed=${this._handleSelectionChanged}
      ></ha-data-table>

      <ha-fab
        class="${classMap({
          rtl: computeRTL(this.hass),
        })}"
        icon="hass:plus"
        label="${this.hass.localize("ui.panel.lovelace.editor.edit_card.add")}"
        @click="${this._addToLovelaceView}"
      ></ha-fab>
    `;
  }

  private _getUnusedEntities(): void {
    if (!this.hass || !this.lovelace) {
      return;
    }
    this._selectedEntities = [];
    this._unusedEntities = computeUnusedEntities(this.hass, this._config!);
  }

  private _handleSelectionChanged(ev: CustomEvent): void {
    const changedSelection = ev.detail as SelectionChangedEvent;
    const entity = changedSelection.id;
    if (changedSelection.selected) {
      this._selectedEntities.push(entity);
    } else {
      const index = this._selectedEntities.indexOf(entity);
      if (index !== -1) {
        this._selectedEntities.splice(index, 1);
      }
    }
  }

  private _handleEntityClicked(ev: Event) {
    const entityId = (ev.target as HTMLElement)
      .closest("tr")!
      .getAttribute("data-row-id")!;
    fireEvent(this, "hass-more-info", {
      entityId,
    });
  }

  private _addToLovelaceView(): void {
    addEntitiesToLovelaceView(
      this,
      this.hass,
      this._selectedEntities,
      this.lovelace!.config,
      this.lovelace!.saveConfig
    );
  }

  static get styles(): CSSResult {
    return css`
      :host {
        background: var(--lovelace-background);
        padding: 16px;
        box-sizing: border-box;
      }
      ha-fab {
        position: sticky;
        float: right;
        bottom: 16px;
        z-index: 1;
      }
      ha-fab.rtl {
        float: left;
      }
      ha-card {
        margin-bottom: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-unused-entities": HuiUnusedEntities;
  }
}
