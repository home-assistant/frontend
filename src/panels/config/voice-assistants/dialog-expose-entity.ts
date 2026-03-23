import "@lit-labs/virtualizer";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeEntityNameList } from "../../../common/entity/compute_entity_name_display";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/ha-button";
import "../../../components/ha-check-list-item";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-list";
import "../../../components/ha-state-icon";
import "../../../components/input/ha-input-search";
import type { ExposeEntitySettings } from "../../../data/expose";
import { voiceAssistants } from "../../../data/expose";
import { haStyle, haStyleScrollbar } from "../../../resources/styles";
import { loadVirtualizer } from "../../../resources/virtualizer";
import type { HomeAssistant } from "../../../types";
import "./entity-voice-settings";
import type { ExposeEntityDialogParams } from "./show-dialog-expose-entity";

interface FilteredEntity {
  entity: HassEntity;
  nameList: (string | undefined)[];
}

@customElement("dialog-expose-entity")
class DialogExposeEntity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ExposeEntityDialogParams;

  @state() private _open = false;

  @state() private _filter?: string;

  @state() private _selected: string[] = [];

  public willUpdate(): void {
    if (!this.hasUpdated) {
      loadVirtualizer();
    }
  }

  public async showDialog(params: ExposeEntityDialogParams): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
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
    const subtitle = this.hass.localize(
      "ui.panel.config.voice_assistants.expose.expose_dialog.expose_to",
      {
        assistants: this._params.filterAssistants
          .map((ass) => voiceAssistants[ass].name)
          .join(", "),
      }
    );

    const entities = this._filterEntities(
      this._params.exposedEntities,
      this._filter
    );

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${header}
        header-subtitle=${subtitle}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        <ha-input-search
          .value=${this._filter}
          @input=${this._filterChanged}
        ></ha-input-search>
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
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
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
        </ha-dialog-footer>
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

  private _filterChanged(e: InputEvent) {
    this._filter = (e.target as HTMLInputElement).value;
  }

  private _filterEntities = memoizeOne(
    (
      exposedEntities: Record<string, ExposeEntitySettings>,
      filter?: string
    ): FilteredEntity[] => {
      const lowerFilter = filter?.toLowerCase();
      const result: FilteredEntity[] = [];

      for (const entity of Object.values(this.hass.states)) {
        if (
          this._params!.filterAssistants.every(
            (ass) => exposedEntities[entity.entity_id]?.[ass]
          )
        ) {
          continue;
        }

        const nameList = computeEntityNameList(
          entity,
          [{ type: "entity" }, { type: "device" }, { type: "area" }],
          this.hass.entities,
          this.hass.devices,
          this.hass.areas,
          this.hass.floors
        );

        if (!lowerFilter) {
          result.push({ entity, nameList });
          continue;
        }

        if (entity.entity_id.toLowerCase().includes(lowerFilter)) {
          result.push({ entity, nameList });
          continue;
        }

        const entityName = computeStateName(entity);
        if (entityName?.toLowerCase().includes(lowerFilter)) {
          result.push({ entity, nameList });
          continue;
        }

        const [, deviceName, areaName] = nameList;

        if (deviceName?.toLowerCase().includes(lowerFilter)) {
          result.push({ entity, nameList });
          continue;
        }

        if (areaName?.toLowerCase().includes(lowerFilter)) {
          result.push({ entity, nameList });
          continue;
        }
      }

      return result;
    }
  );

  private _renderItem = (item: FilteredEntity) => {
    const { entity: entityState, nameList } = item;
    const [entityName, deviceName, areaName] = nameList;

    const isRTL = computeRTL(this.hass);
    const primary = entityName || deviceName || entityState.entity_id;
    const context = [areaName, entityName ? deviceName : undefined]
      .filter(Boolean)
      .join(isRTL ? " ◂ " : " ▸ ");
    const showEntityId = this.hass.userData?.showEntityIdPicker;

    return html`
      <ha-check-list-item
        graphic="icon"
        ?twoLine=${context}
        ?threeLine=${showEntityId}
        .value=${entityState.entity_id}
        .selected=${this._selected.includes(entityState.entity_id)}
        @request-selected=${this._handleSelected}
      >
        <ha-state-icon
          title=${ifDefined(entityState?.state)}
          slot="graphic"
          .hass=${this.hass}
          .stateObj=${entityState}
        ></ha-state-icon>
        ${primary}
        ${context || showEntityId
          ? html`<span slot="secondary">
              ${context}
              ${showEntityId
                ? html`<br /><span class="entity-id"
                      >${entityState.entity_id}</span
                    >`
                : nothing}
            </span>`
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
      haStyleScrollbar,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
        ha-list {
          position: relative;
        }
        lit-virtualizer {
          height: 500px;
        }
        ha-input-search {
          width: 100%;
          --ha-input-padding-bottom: 0;
        }
        lit-virtualizer {
          width: 100%;
          contain: size layout !important;
        }
        ha-check-list-item {
          width: 100%;
          height: 72px;
        }
        ha-check-list-item[threeLine] {
          height: 88px;
        }
        ha-check-list-item .entity-id {
          line-height: var(--ha-line-height-normal);
          padding-left: var(--ha-space-1);
          font-size: var(--ha-font-size-xs);
        }
        ha-check-list-item ha-state-icon {
          margin-left: var(--ha-space-6);
          margin-inline-start: var(--ha-space-6);
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
          lit-virtualizer {
            height: calc(
              100vh -
                210px - var(--safe-area-inset-top, 0px) - var(
                  --safe-area-inset-bottom,
                  0px
                )
            );
          }
          ha-check-list-item ha-state-icon {
            margin-left: var(--ha-space-2);
            margin-inline-start: var(--ha-space-2);
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
