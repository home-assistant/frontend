import "@material/mwc-menu/mwc-menu-surface";
import { mdiDelete, mdiDrag, mdiPencil, mdiPlus } from "@mdi/js";
import type { ComboBoxLightOpenedChangedEvent } from "@vaadin/combo-box/vaadin-combo-box-light";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefault } from "../../../../common/dom/prevent_default";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceHeadingBadgeConfig } from "../../heading-badges/types";

declare global {
  interface HASSDomEvents {
    "edit-heading-badge": { index: number };
    "heading-badges-changed": { badges: LovelaceHeadingBadgeConfig[] };
  }
}

@customElement("hui-heading-badges-editor")
export class HuiHeadingBadgesEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public badges?: LovelaceHeadingBadgeConfig[];

  @query(".add-container", true) private _addContainer?: HTMLDivElement;

  @query("ha-entity-picker") private _entityPicker?: HaEntityPicker;

  @state() private _addMode = false;

  private _opened = false;

  private _badgesKeys = new WeakMap<LovelaceHeadingBadgeConfig, string>();

  private _getKey(badge: LovelaceHeadingBadgeConfig) {
    if (!this._badgesKeys.has(badge)) {
      this._badgesKeys.set(badge, Math.random().toString());
    }

    return this._badgesKeys.get(badge)!;
  }

  private _computeBadgeLabel(badge: LovelaceHeadingBadgeConfig) {
    const type = badge.type ?? "entity";

    if (type === "entity") {
      const entityId = "entity" in badge ? (badge.entity as string) : undefined;
      const stateObj = entityId ? this.hass.states[entityId] : undefined;
      return (
        (stateObj && computeStateName(stateObj)) ||
        entityId ||
        type ||
        "Unknown badge"
      );
    }
    return type;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      ${this.badges
        ? html`
            <ha-sortable
              handle-selector=".handle"
              @item-moved=${this._badgeMoved}
            >
              <div class="entities">
                ${repeat(
                  this.badges,
                  (badge) => this._getKey(badge),
                  (badge, index) => {
                    const label = this._computeBadgeLabel(badge);
                    return html`
                      <div class="badge">
                        <div class="handle">
                          <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                        </div>
                        <div class="badge-content">
                          <span>${label}</span>
                        </div>
                        <ha-icon-button
                          .label=${this.hass!.localize(
                            `ui.panel.lovelace.editor.entities.edit`
                          )}
                          .path=${mdiPencil}
                          class="edit-icon"
                          .index=${index}
                          @click=${this._editBadge}
                        ></ha-icon-button>
                        <ha-icon-button
                          .label=${this.hass!.localize(
                            `ui.panel.lovelace.editor.entities.remove`
                          )}
                          .path=${mdiDelete}
                          class="remove-icon"
                          .index=${index}
                          @click=${this._removeEntity}
                        ></ha-icon-button>
                      </div>
                    `;
                  }
                )}
              </div>
            </ha-sortable>
          `
        : nothing}
      <div class="add-container">
        <ha-button
          data-add-entity
          outlined
          .label=${this.hass!.localize(`ui.panel.lovelace.editor.entities.add`)}
          @click=${this._addEntity}
        >
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </ha-button>
        ${this._renderPicker()}
      </div>
    `;
  }

  private _renderPicker() {
    if (!this._addMode) {
      return nothing;
    }
    return html`
      <mwc-menu-surface
        open
        .anchor=${this._addContainer}
        @closed=${this._onClosed}
        @opened=${this._onOpened}
        @opened-changed=${this._openedChanged}
        @input=${stopPropagation}
      >
        <ha-entity-picker
          .hass=${this.hass}
          id="input"
          .placeholder=${this.hass.localize(
            "ui.components.target-picker.add_entity_id"
          )}
          .searchLabel=${this.hass.localize(
            "ui.components.target-picker.add_entity_id"
          )}
          @value-changed=${this._entityPicked}
          @click=${preventDefault}
          allow-custom-entity
        ></ha-entity-picker>
      </mwc-menu-surface>
    `;
  }

  private _onClosed(ev) {
    ev.stopPropagation();
    ev.target.open = true;
  }

  private async _onOpened() {
    if (!this._addMode) {
      return;
    }
    await this._entityPicker?.focus();
    await this._entityPicker?.open();
    this._opened = true;
  }

  private _openedChanged(ev: ComboBoxLightOpenedChangedEvent) {
    if (this._opened && !ev.detail.value) {
      this._opened = false;
      this._addMode = false;
    }
  }

  private async _addEntity(ev): Promise<void> {
    ev.stopPropagation();
    this._addMode = true;
  }

  private _entityPicked(ev) {
    ev.stopPropagation();
    if (!ev.detail.value) {
      return;
    }
    const newEntity: LovelaceHeadingBadgeConfig = {
      type: "entity",
      entity: ev.detail.value,
    };
    const newBadges = (this.badges || []).concat(newEntity);
    fireEvent(this, "heading-badges-changed", { badges: newBadges });
  }

  private _badgeMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const newBadges = (this.badges || []).concat();

    newBadges.splice(newIndex, 0, newBadges.splice(oldIndex, 1)[0]);

    fireEvent(this, "heading-badges-changed", { badges: newBadges });
  }

  private _removeEntity(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newBadges = (this.badges || []).concat();

    newBadges.splice(index, 1);

    fireEvent(this, "heading-badges-changed", { badges: newBadges });
  }

  private _editBadge(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    fireEvent(this, "edit-heading-badge", {
      index,
    });
  }

  static styles = css`
    :host {
      display: flex !important;
      flex-direction: column;
    }
    ha-button {
      margin-top: 8px;
    }
    .badge {
      display: flex;
      align-items: center;
    }
    .badge .handle {
      cursor: move; /* fallback if grab cursor is unsupported */
      cursor: grab;
      padding-right: 8px;
      padding-inline-end: 8px;
      padding-inline-start: initial;
      direction: var(--direction);
    }
    .badge .handle > * {
      pointer-events: none;
    }

    .badge-content {
      height: 60px;
      font-size: var(--ha-font-size-l);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-grow: 1;
    }

    .badge-content div {
      display: flex;
      flex-direction: column;
    }

    .remove-icon,
    .edit-icon {
      --mdc-icon-button-size: 36px;
      color: var(--secondary-text-color);
    }

    .secondary {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }

    li[divider] {
      border-bottom-color: var(--divider-color);
    }

    .add-container {
      position: relative;
      width: 100%;
    }

    mwc-menu-surface {
      --mdc-menu-min-width: 100%;
    }

    ha-entity-picker {
      display: block;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-badges-editor": HuiHeadingBadgesEditor;
  }
}
