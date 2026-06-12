import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import type { ExtEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { LightColor, LightEntity } from "../../../../data/light";
import { computeDefaultFavoriteColors } from "../../../../data/light";
import type { HomeAssistant } from "../../../../types";
import { showConfirmationDialog } from "../../../generic/show-dialog-box";
import "../ha-more-info-favorites";
import type { HaMoreInfoFavorites } from "../ha-more-info-favorites";
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

  protected updated(changedProps: PropertyValues<this>): void {
    if (changedProps.has("entry") && this.entry) {
      if (this.entry.options?.light?.favorite_colors) {
        this._favoriteColors = this.entry.options.light.favorite_colors;
      } else if (this.stateObj) {
        this._favoriteColors = computeDefaultFavoriteColors(this.stateObj);
      }
    }
  }

  private _move(index: number, newIndex: number): void {
    const favoriteColors = this._favoriteColors.concat();
    const color = favoriteColors.splice(index, 1)[0];
    favoriteColors.splice(newIndex, 0, color);
    this._favoriteColors = favoriteColors;
    this._save(favoriteColors);
  }

  private _apply(index: number): void {
    const favorite = this._favoriteColors[index];
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj.entity_id,
      ...favorite,
    });
  }

  private async _save(newFavoriteColors: LightColor[]): Promise<void> {
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

  private _add = async (): Promise<void> => {
    const color = await showLightColorFavoriteDialog(this, {
      entry: this.entry!,
      title: this.hass.localize(
        "ui.dialogs.more_info_control.light.favorite_color.add_title"
      ),
    });
    if (!color) {
      return;
    }
    const newFavoriteColors = [...this._favoriteColors, color];
    this._save(newFavoriteColors);
  };

  private _edit = async (index: number): Promise<void> => {
    fireEvent(this, "favorite-color-edit-started");
    this._apply(index);
    const color = await showLightColorFavoriteDialog(this, {
      entry: this.entry!,
      initialColor: this._favoriteColors[index],
      title: this.hass.localize(
        "ui.dialogs.more_info_control.light.favorite_color.edit_title"
      ),
    });

    if (!color) {
      this._apply(index);
      return;
    }

    const newFavoriteColors = [...this._favoriteColors];
    newFavoriteColors[index] = color;
    this._save(newFavoriteColors);
  };

  private _delete = async (index: number): Promise<void> => {
    const confirm = await showConfirmationDialog(this, {
      destructive: true,
      title: this.hass.localize(
        "ui.dialogs.more_info_control.light.favorite_color.delete_confirm_title"
      ),
      text: this.hass.localize(
        "ui.dialogs.more_info_control.light.favorite_color.delete_confirm_text"
      ),
      confirmText: this.hass.localize(
        "ui.dialogs.more_info_control.light.favorite_color.delete_confirm_action"
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

  private _renderFavorite = (
    color: LightColor,
    index: number,
    editMode: boolean
  ): TemplateResult =>
    html`<ha-favorite-color-button
      .label=${this.hass.localize(
        `ui.dialogs.more_info_control.light.favorite_color.${
          editMode ? "edit" : "set"
        }`,
        { number: index + 1 }
      )}
      .disabled=${this.stateObj.state === UNAVAILABLE}
      .color=${color}
    ></ha-favorite-color-button>`;

  private _deleteLabel = (index: number): string =>
    this.hass.localize(
      "ui.dialogs.more_info_control.light.favorite_color.delete",
      {
        number: index + 1,
      }
    );

  private _handleFavoriteAction = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-action"]>
  ): void => {
    ev.stopPropagation();

    const { action, index } = ev.detail;

    if (action === "hold" && this.hass.user?.is_admin) {
      fireEvent(this, "toggle-edit-mode", true);
      return;
    }

    if (this.editMode) {
      this._edit(index);
      return;
    }

    this._apply(index);
  };

  private _handleFavoriteMoved = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-moved"]>
  ): void => {
    ev.stopPropagation();
    this._move(ev.detail.oldIndex, ev.detail.newIndex);
  };

  private _handleFavoriteDelete = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-delete"]>
  ): void => {
    ev.stopPropagation();
    this._delete(ev.detail.index);
  };

  private _handleFavoriteAdd = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-add"]>
  ): void => {
    ev.stopPropagation();
    this._add();
  };

  private _handleFavoriteDone = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-done"]>
  ): void => {
    ev.stopPropagation();
    fireEvent(this, "toggle-edit-mode", false);
  };

  protected render(): TemplateResult {
    return html`
      <ha-more-info-favorites
        .items=${this._favoriteColors}
        .renderItem=${this._renderFavorite as HaMoreInfoFavorites["renderItem"]}
        .deleteLabel=${this._deleteLabel as HaMoreInfoFavorites["deleteLabel"]}
        .editMode=${this.editMode}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        .isAdmin=${Boolean(this.hass.user?.is_admin)}
        .addLabel=${this.hass.localize(
          "ui.dialogs.more_info_control.light.favorite_color.add"
        )}
        .doneLabel=${this.hass.localize(
          "ui.dialogs.more_info_control.exit_edit_mode"
        )}
        @favorite-item-action=${this._handleFavoriteAction}
        @favorite-item-moved=${this._handleFavoriteMoved}
        @favorite-item-delete=${this._handleFavoriteDelete}
        @favorite-item-add=${this._handleFavoriteAdd}
        @favorite-item-done=${this._handleFavoriteDone}
      ></ha-more-info-favorites>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-light-favorite-colors": HaMoreInfoLightFavoriteColors;
  }
}
