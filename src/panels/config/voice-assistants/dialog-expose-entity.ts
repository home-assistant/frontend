import "@lit-labs/virtualizer";
import { mdiClose } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import Fuse from "fuse.js";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeEntityNameList } from "../../../common/entity/compute_entity_name_display";
import { computeRTL } from "../../../common/util/compute_rtl";
import { multiTermSortedSearch } from "../../../resources/fuseMultiTerm";
import { entityComboBoxKeys } from "../../../data/entity/entity_picker";
import "../../../components/ha-check-list-item";
import "../../../components/search-input";
import "../../../components/ha-dialog";
import "../../../components/ha-button";
import "../../../components/ha-dialog-header";
import "../../../components/ha-state-icon";
import "../../../components/ha-list";
import type { ExposeEntitySettings } from "../../../data/expose";
import { voiceAssistants } from "../../../data/expose";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "./entity-voice-settings";
import type { ExposeEntityDialogParams } from "./show-dialog-expose-entity";

@customElement("dialog-expose-entity")
class DialogExposeEntity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ExposeEntityDialogParams;

  @state() private _filter?: string;

  @state() private _selected: string[] = [];

  // Memoized Fuse index for fuzzy search (matches ha-entity-picker pattern)
  private _fuseIndex = memoizeOne(
    (items: { id: string; search_labels: any }[]) =>
      Fuse.createIndex(entityComboBoxKeys, items)
  );

  public async showDialog(params: ExposeEntityDialogParams): Promise<void> {
    this._params = params;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._selected = [];
    this._filter = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const header = this.hass.localize(
      "ui.panel.config.voice_assistants.expose.expose_dialog.header"
    );

    const entities = this._filterEntities(
      this._params.exposedEntities,
      this._filter
    );

    return html`
      <ha-dialog open @closed=${this.closeDialog} .heading=${header}>
        <ha-dialog-header slot="heading" show-border>
          <h2 class="header" slot="title">
            ${header}
            <span class="subtitle">
              ${this.hass.localize(
                "ui.panel.config.voice_assistants.expose.expose_dialog.expose_to",
                {
                  assistants: this._params.filterAssistants
                    .map((ass) => voiceAssistants[ass].name)
                    .join(", "),
                }
              )}
            </span>
          </h2>
          <ha-icon-button
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            dialogAction="close"
            slot="navigationIcon"
          ></ha-icon-button>
          <search-input
            .hass=${this.hass}
            .filter=${this._filter}
            @value-changed=${this._filterChanged}
          ></search-input>
        </ha-dialog-header>
        <ha-list multi>
          <lit-virtualizer
            scroller
            class="ha-scrollbar"
            @click=${this._itemClicked}
            .items=${entities}
            .renderItem=${this._renderItem}
          >
          </lit-virtualizer>
        </ha-list>
        <ha-button
          slot="primaryAction"
          appearance="plain"
          @click=${this.closeDialog}
        >
          ${this.hass!.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          slot="primaryAction"
          @click=${this._expose}
          .disabled=${this._selected.length === 0}
        >
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.expose.expose_dialog.expose_entities",
            { count: this._selected.length }
          )}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _handleSelected = (ev) => {
    const entityId = ev.target.value;
    if (ev.detail.selected) {
      if (this._selected.includes(entityId)) {
        return;
      }
      this._selected = [...this._selected, entityId];
    } else {
      this._selected = this._selected.filter((item) => item !== entityId);
    }
  };

  private _itemClicked(ev) {
    const listItem = ev.target.closest("ha-check-list-item");
    listItem.selected = !listItem.selected;
  }

  private _filterChanged(e) {
    this._filter = e.detail.value;
  }

  private _filterEntities = memoizeOne(
    (
      exposedEntities: Record<string, ExposeEntitySettings>,
      filter?: string
    ) => {
      const isRTL = computeRTL(this.hass);

      // First filter by exposure and pre-compute all entity context
      const itemsWithContext = Object.values(this.hass.states)
        .filter((entity) =>
          this._params!.filterAssistants.some(
            (ass) => !exposedEntities[entity.entity_id]?.[ass]
          )
        )
        .map((entity) => {
          // Pre-compute entity context (following entity_picker.ts pattern)
          const [entityName, deviceName, areaName] = computeEntityNameList(
            entity,
            [{ type: "entity" }, { type: "device" }, { type: "area" }],
            this.hass.entities,
            this.hass.devices,
            this.hass.areas,
            this.hass.floors
          );

          const primary = entityName || deviceName || entity.entity_id;
          const secondary = [areaName, entityName ? deviceName : undefined]
            .filter(Boolean)
            .join(isRTL ? " ◂ " : " ▸ ");

          return {
            id: entity.entity_id, // Required by multiTermSortedSearch
            entity,
            primary,
            secondary,
            search_labels: {
              entityName: entityName || null,
              deviceName: deviceName || null,
              areaName: areaName || null,
              friendlyName: computeStateName(entity) || null,
              entityId: entity.entity_id,
            },
          };
        });

      // If no search filter, return all items
      if (!filter?.trim()) {
        return itemsWithContext;
      }

      // Use the SAME fuzzy search as ha-entity-picker (reusing existing infrastructure)
      // Creates Fuse index and performs multi-term weighted fuzzy search
      const fuseIndex = this._fuseIndex(itemsWithContext);
      return multiTermSortedSearch(
        itemsWithContext,
        filter,
        entityComboBoxKeys, // Same weighted keys as entity picker
        (item) => item.id,
        fuseIndex
      );
    }
  );

  private _renderItem = (item: {
    entity: HassEntity;
    primary: string;
    secondary: string;
  }) => {
    const entityId = item.entity.entity_id;

    // Check if user wants to see entity IDs (user preference)
    const showEntityId = this.hass.userData?.showEntityIdPicker;

    return html`
      <ha-check-list-item
        graphic="icon"
        ?twoLine=${item.secondary || showEntityId}
        class=${showEntityId ? "three-line" : ""}
        .value=${entityId}
        .selected=${this._selected.includes(entityId)}
        @request-selected=${this._handleSelected}
      >
        <ha-state-icon
          title=${ifDefined(item.entity?.state)}
          slot="graphic"
          .hass=${this.hass}
          .stateObj=${item.entity}
        ></ha-state-icon>
        ${item.primary}
        ${item.secondary
          ? html`<span slot="secondary">${item.secondary}</span>`
          : nothing}
        ${showEntityId
          ? html`<span slot="secondary" class="code">${entityId}</span>`
          : nothing}
      </ha-check-list-item>
    `;
  };

  private _expose() {
    this._params!.exposeEntities(this._selected);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
          --mdc-dialog-min-width: 500px;
          --mdc-dialog-max-width: 600px;
        }
        ha-list {
          position: relative;
        }
        lit-virtualizer {
          height: 500px;
        }
        search-input {
          width: 100%;
          display: block;
          box-sizing: border-box;
          --text-field-suffix-padding-left: 8px;
        }
        .header {
          margin: 0;
          pointer-events: auto;
          -webkit-font-smoothing: var(--ha-font-smoothing);
          -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
          font-weight: inherit;
          font-size: inherit;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          margin: -4px 0;
        }
        .subtitle {
          color: var(--secondary-text-color);
          font-size: var(--ha-font-size-m);
          line-height: var(--ha-line-height-condensed);
        }
        lit-virtualizer {
          width: 100%;
          contain: size layout !important;
        }
        ha-check-list-item {
          width: 100%;
          height: 72px;
        }
        ha-check-list-item.three-line {
          height: 88px;
        }
        ha-check-list-item .code {
          font-family: var(--code-font-family, monospace);
          font-size: var(--ha-font-size-s, 12px);
          direction: ltr;
        }
        ha-check-list-item ha-state-icon {
          margin-left: 24px;
          margin-inline-start: 24px;
          margin-inline-end: initial;
        }
        @media all and (max-height: 800px) {
          lit-virtualizer {
            height: 334px;
          }
        }
        @media all and (max-height: 600px) {
          lit-virtualizer {
            height: 238px;
          }
        }
        @media all and (max-width: 500px), all and (max-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: 100vw;
            --mdc-dialog-max-width: 100vw;
            --mdc-dialog-min-height: 100%;
            --mdc-dialog-max-height: 100%;
            --vertical-align-dialog: flex-end;
            --ha-dialog-border-radius: var(--ha-border-radius-square);
          }
          lit-virtualizer {
            height: calc(
              100vh -
                210px - var(--safe-area-inset-top, 0px) - var(
                  --safe-area-inset-bottom,
                  0px
                )
            );
          }
          search-input {
            --text-field-suffix-padding-left: unset;
          }
          ha-check-list-item ha-state-icon {
            margin-left: 8px;
            margin-inline-start: 8px;
            margin-inline-end: initial;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-expose-entity": DialogExposeEntity;
  }
}
