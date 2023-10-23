import { mdiCheck, mdiMinus, mdiPlus } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { SortableEvent } from "sortablejs";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../../data/entity";
import {
  ExtEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../../data/entity_registry";
import {
  LightColor,
  LightEntity,
  computeDefaultFavoriteColors,
} from "../../../../data/light";
import { actionHandler } from "../../../../panels/lovelace/common/directives/action-handler-directive";
import type { SortableInstance } from "../../../../resources/sortable";
import { HomeAssistant } from "../../../../types";
import { showConfirmationDialog } from "../../../generic/show-dialog-box";
import "./ha-favorite-color-button";
import { showLightColorFavoriteDialog } from "./show-dialog-light-color-favorite";

declare global {
  interface HASSDomEvents {
    "favorite-color-edit-started";
  }
}

@customElement("ha-more-info-light-favorite-colors")
export class HaMoreInfoLightFavoriteColors extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state() private _favoriteColors: LightColor[] = [];

  private _sortable?: SortableInstance;

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("editMode")) {
      if (this.editMode) {
        this._createSortable();
      } else {
        this._destroySortable();
      }
    }
    if (changedProps.has("entry")) {
      if (this.entry) {
        if (this.entry.options?.light?.favorite_colors) {
          this._favoriteColors = this.entry.options.light.favorite_colors;
        } else if (this.stateObj) {
          this._favoriteColors = computeDefaultFavoriteColors(this.stateObj);
        }
      }
    }
  }

  private async _createSortable() {
    const Sortable = (await import("../../../../resources/sortable")).default;
    this._sortable = new Sortable(
      this.shadowRoot!.querySelector(".container")!,
      {
        animation: 150,
        fallbackClass: "sortable-fallback",
        draggable: ".color",
        onChoose: (evt: SortableEvent) => {
          (evt.item as any).placeholder =
            document.createComment("sort-placeholder");
          evt.item.after((evt.item as any).placeholder);
        },
        onEnd: (evt: SortableEvent) => {
          // put back in original location
          if ((evt.item as any).placeholder) {
            (evt.item as any).placeholder.replaceWith(evt.item);
            delete (evt.item as any).placeholder;
          }
          this._dragged(evt);
        },
      }
    );
  }

  private _dragged(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) return;
    this._move(ev.oldIndex!, ev.newIndex!);
  }

  private _move(index: number, newIndex: number) {
    const favoriteColors = this._favoriteColors.concat();
    const action = favoriteColors.splice(index, 1)[0];
    favoriteColors.splice(newIndex, 0, action);
    this._favoriteColors = favoriteColors;
    this._save(favoriteColors);
  }

  private _destroySortable() {
    this._sortable?.destroy();
    this._sortable = undefined;
  }

  private _apply = (index: number) => {
    const favorite = this._favoriteColors[index];
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      ...favorite,
    });
  };

  private async _save(newFavoriteColors: LightColor[]) {
    const result = await updateEntityRegistryEntry(
      this.hass,
      this.entry!.entity_id,
      {
        options_domain: "light",
        options: {
          favorite_colors: newFavoriteColors,
        },
      }
    );
    fireEvent(this, "entity-entry-updated", result.entity_entry);
  }

  private _add = async () => {
    const color = await showLightColorFavoriteDialog(this, {
      entry: this.entry!,
      title: this.hass.localize(
        "ui.dialogs.more_info_control.light.favorite_color.add_title"
      ),
    });
    if (color) {
      const newFavoriteColors = [...this._favoriteColors, color];
      this._save(newFavoriteColors);
    }
  };

  private _edit = async (index) => {
    // Make sure the current favorite color is set
    fireEvent(this, "favorite-color-edit-started");
    await this._apply(index);
    const color = await showLightColorFavoriteDialog(this, {
      entry: this.entry!,
      initialColor: this._favoriteColors[index],
      title: this.hass.localize(
        "ui.dialogs.more_info_control.light.favorite_color.edit_title"
      ),
    });

    if (color) {
      const newFavoriteColors = [...this._favoriteColors];
      newFavoriteColors[index] = color;
      this._save(newFavoriteColors);
    } else {
      this._apply(index);
    }
  };

  private _delete = async (index) => {
    const confirm = await showConfirmationDialog(this, {
      destructive: true,
      title: this.hass.localize(
        `ui.dialogs.more_info_control.light.favorite_color.delete_confirm_title`
      ),
      text: this.hass.localize(
        `ui.dialogs.more_info_control.light.favorite_color.delete_confirm_text`
      ),
      confirmText: this.hass.localize(
        `ui.dialogs.more_info_control.light.favorite_color.delete_confirm_action`
      ),
    });
    if (!confirm) {
      return;
    }
    const newFavoriteColors = this._favoriteColors.filter(
      (_, i) => index !== i
    );
    this._save(newFavoriteColors);
  };

  private _handleDeleteButton = (ev) => {
    ev.stopPropagation();
    const index = ev.target.index;
    this._delete(index);
  };

  private _handleAddButton = (ev) => {
    ev.stopPropagation();
    this._add();
  };

  private _handleColorAction = (ev) => {
    ev.stopPropagation();
    if (ev.detail.action === "hold" && this.hass.user?.is_admin) {
      fireEvent(this, "toggle-edit-mode", true);
      return;
    }

    const index = ev.target.index;
    if (this.editMode) {
      this._edit(index);
      return;
    }
    this._apply(index);
  };

  private _exitEditMode = (ev) => {
    ev.stopPropagation();
    fireEvent(this, "toggle-edit-mode", false);
  };

  protected render(): TemplateResult {
    return html`
      <div class="container">
        ${this._favoriteColors.map(
          (color, index) => html`
            <div class="color">
              <div
                class="color-bubble ${classMap({
                  shake: !!this.editMode,
                })}"
              >
                <ha-favorite-color-button
                  .label=${this.hass.localize(
                    `ui.dialogs.more_info_control.light.favorite_color.${
                      this.editMode ? "edit" : "set"
                    }`,
                    { number: index }
                  )}
                  .disabled=${this.stateObj!.state === UNAVAILABLE}
                  .color=${color}
                  .index=${index}
                  .actionHandler=${actionHandler({
                    hasHold: !this.editMode && this.hass.user?.is_admin,
                    disabled: this.stateObj!.state === UNAVAILABLE,
                  })}
                  @action=${this._handleColorAction}
                >
                </ha-favorite-color-button>
                ${this.editMode
                  ? html`
                      <button
                        @click=${this._handleDeleteButton}
                        class="delete"
                        .index=${index}
                        aria-label=${this.hass.localize(
                          `ui.dialogs.more_info_control.light.favorite_color.delete`,
                          { number: index }
                        )}
                        .title=${this.hass.localize(
                          `ui.dialogs.more_info_control.light.favorite_color.delete`,
                          { number: index }
                        )}
                      >
                        <ha-svg-icon .path=${mdiMinus}></ha-svg-icon>
                      </button>
                    `
                  : nothing}
              </div>
            </div>
          `
        )}
        ${this.editMode
          ? html`
              <ha-outlined-icon-button
                class="button"
                @click=${this._handleAddButton}
              >
                <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
              </ha-outlined-icon-button>
              <ha-outlined-icon-button
                @click=${this._exitEditMode}
                class="button"
              >
                <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
              </ha-outlined-icon-button>
            `
          : nothing}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: -8px;
        flex-wrap: wrap;
        max-width: 250px;
        user-select: none;
      }

      .container > * {
        margin: 8px;
      }

      .color {
        display: block;
      }

      .color .color-bubble.shake {
        position: relative;
        display: block;
        animation: shake 0.45s linear infinite;
      }
      .color:nth-child(3n + 1) .color-bubble.shake {
        animation-delay: 0.15s;
      }
      .color:nth-child(3n + 2) .color-bubble.shake {
        animation-delay: 0.3s;
      }

      .sortable-ghost {
        opacity: 0.4;
      }
      .sortable-fallback {
        display: none;
      }

      @keyframes shake {
        0% {
          transform: rotateZ(0deg) translateX(-1px) translateY(0) scale(1);
        }
        20% {
          transform: rotateZ(-3deg) translateX(0) translateY();
        }
        40% {
          transform: rotateZ(0deg) translateX(1px) translateY(0);
        }
        60% {
          transform: rotateZ(3deg) translateX(0) translateY(0);
        }
        100% {
          transform: rotateZ(0deg) translateX(-1px) translateY(0);
        }
      }

      .delete {
        position: absolute;
        top: -6px;
        right: -6px;
        width: 20px;
        height: 20px;
        outline: none;
        background-color: var(--secondary-background-color);
        padding: 0;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        display: block;
      }
      .delete {
        --mdc-icon-size: 12px;
        color: var(--primary-text-color);
      }
      .delete * {
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-light-favorite-colors": HaMoreInfoLightFavoriteColors;
  }
}
