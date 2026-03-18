import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-control-button";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../../data/entity/entity_attributes";
import type {
  ExtEntityRegistryEntry,
  ValveEntityOptions,
} from "../../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../types";
import type { ValveEntity } from "../../../../data/valve";
import {
  DEFAULT_VALVE_FAVORITE_POSITIONS,
  normalizeValveFavoritePositions,
} from "../../../../data/valve";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../../generic/show-dialog-box";
import "../ha-more-info-favorites";
import type { HaMoreInfoFavorites } from "../ha-more-info-favorites";

type FavoriteLocalizeKey =
  | "set"
  | "edit"
  | "delete"
  | "delete_confirm_title"
  | "delete_confirm_text"
  | "delete_confirm_action"
  | "add"
  | "edit_title"
  | "add_title";

@customElement("ha-more-info-valve-favorite-positions")
export class HaMoreInfoValveFavoritePositions extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: ValveEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state() private _favoritePositions: number[] = [];

  protected updated(changedProps: PropertyValues<this>): void {
    if (
      (changedProps.has("entry") || changedProps.has("stateObj")) &&
      this.entry &&
      this.stateObj
    ) {
      this._favoritePositions = normalizeValveFavoritePositions(
        this.entry.options?.valve?.favorite_positions ??
          DEFAULT_VALVE_FAVORITE_POSITIONS
      );
    }
  }

  private _localizeFavorite(
    key: FavoriteLocalizeKey,
    values?: Record<string, string | number>
  ): string {
    return this.hass.localize(
      `ui.dialogs.more_info_control.valve.favorite_position.${key}`,
      values
    );
  }

  private _currentValue(): number | undefined {
    const current = this.stateObj.attributes.current_position;

    return current == null ? undefined : Math.round(current);
  }

  private async _save(favorite_positions: number[]): Promise<void> {
    if (!this.entry) {
      return;
    }

    const currentOptions: ValveEntityOptions = {
      ...(this.entry.options?.valve ?? {}),
    };

    currentOptions.favorite_positions = this._favoritePositions;

    const result = await updateEntityRegistryEntry(
      this.hass,
      this.entry.entity_id,
      {
        options_domain: "valve",
        options: {
          ...currentOptions,
          favorite_positions,
        },
      }
    );

    fireEvent(this, "entity-entry-updated", result.entity_entry);
  }

  private async _setFavorites(favorites: number[]): Promise<void> {
    const normalized = normalizeValveFavoritePositions(favorites);
    this._favoritePositions = normalized;
    await this._save(normalized);
  }

  private _move(index: number, newIndex: number): void {
    const favorites = this._favoritePositions.concat();
    const moved = favorites.splice(index, 1)[0];
    favorites.splice(newIndex, 0, moved);
    this._setFavorites(favorites);
  }

  private _applyFavorite(index: number): void {
    const favorite = this._favoritePositions[index];

    if (favorite === undefined) {
      return;
    }

    this.hass.callService("valve", "set_valve_position", {
      entity_id: this.stateObj.entity_id,
      position: favorite,
    });
  }

  private async _promptFavoriteValue(
    value?: number
  ): Promise<number | undefined> {
    const response = await showPromptDialog(this, {
      title: this._localizeFavorite(
        value === undefined ? "add_title" : "edit_title"
      ),
      inputLabel: this.hass.localize("ui.card.valve.position"),
      inputType: "number",
      inputMin: "0",
      inputMax: "100",
      inputSuffix: DOMAIN_ATTRIBUTES_UNITS.valve.current_position,
      defaultValue: value === undefined ? undefined : String(value),
    });

    if (response === null || response.trim() === "") {
      return undefined;
    }

    const number = Number(response);

    if (isNaN(number)) {
      return undefined;
    }

    return Math.max(0, Math.min(100, Math.round(number)));
  }

  private async _addFavorite(): Promise<void> {
    const value = await this._promptFavoriteValue();

    if (value === undefined) {
      return;
    }

    await this._setFavorites([...this._favoritePositions, value]);
  }

  private async _editFavorite(index: number): Promise<void> {
    const current = this._favoritePositions[index];

    if (current === undefined) {
      return;
    }

    const value = await this._promptFavoriteValue(current);

    if (value === undefined) {
      return;
    }

    const updated = [...this._favoritePositions];
    updated[index] = value;
    await this._setFavorites(updated);
  }

  private async _deleteFavorite(index: number): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      destructive: true,
      title: this._localizeFavorite("delete_confirm_title"),
      text: this._localizeFavorite("delete_confirm_text"),
      confirmText: this._localizeFavorite("delete_confirm_action"),
    });

    if (!confirmed) {
      return;
    }

    await this._setFavorites(
      this._favoritePositions.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  private _renderFavorite: HaMoreInfoFavorites["renderItem"] = (
    favorite,
    _index,
    editMode
  ) => {
    const value = favorite as number;
    const active = this._currentValue() === value;
    const label = this._localizeFavorite(editMode ? "edit" : "set", {
      value: `${value}%`,
    });

    return html`
      <ha-control-button
        class=${classMap({
          active,
        })}
        style=${styleMap({
          "--control-button-border-radius": "var(--ha-border-radius-pill)",
          width: "72px",
          height: "36px",
        })}
        .label=${label}
        .disabled=${this.stateObj.state === UNAVAILABLE}
      >
        ${value}%
      </ha-control-button>
    `;
  };

  private _deleteLabel = (index: number): string =>
    this._localizeFavorite("delete", {
      number: index + 1,
    });

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
      this._editFavorite(index);
      return;
    }

    this._applyFavorite(index);
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
    this._deleteFavorite(ev.detail.index);
  };

  private _handleFavoriteAdd = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-add"]>
  ): void => {
    ev.stopPropagation();
    this._addFavorite();
  };

  private _handleFavoriteDone = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-done"]>
  ): void => {
    ev.stopPropagation();
    fireEvent(this, "toggle-edit-mode", false);
  };

  private _renderSection(): TemplateResult | typeof nothing {
    if (!this.editMode && this._favoritePositions.length === 0) {
      return nothing;
    }

    return html`
      <section class="group">
        <ha-more-info-favorites
          .items=${this._favoritePositions}
          .renderItem=${this._renderFavorite}
          .deleteLabel=${this._deleteLabel}
          .editMode=${this.editMode ?? false}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          .isAdmin=${Boolean(this.hass.user?.is_admin)}
          .showDone=${true}
          .addLabel=${this._localizeFavorite("add")}
          .doneLabel=${this.hass.localize(
            "ui.dialogs.more_info_control.exit_edit_mode"
          )}
          @favorite-item-action=${this._handleFavoriteAction}
          @favorite-item-moved=${this._handleFavoriteMoved}
          @favorite-item-delete=${this._handleFavoriteDelete}
          @favorite-item-add=${this._handleFavoriteAdd}
          @favorite-item-done=${this._handleFavoriteDone}
        ></ha-more-info-favorites>
      </section>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.stateObj || !this.entry) {
      return nothing;
    }

    return html` <div class="groups">${this._renderSection()}</div> `;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .groups {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ha-space-3);
    }

    .group {
      width: 100%;
      max-width: 384px;
      margin: 0;
    }

    .group ha-more-info-favorites {
      --favorite-items-max-width: 384px;
      --favorite-item-active-background-color: var(--state-valve-active-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-valve-favorite-positions": HaMoreInfoValveFavoritePositions;
  }
}
