import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-control-button";
import type { CoverEntity } from "../../../../data/cover";
import {
  DEFAULT_COVER_FAVORITE_POSITIONS,
  coverSupportsPosition,
  coverSupportsTiltPosition,
  normalizeCoverFavoritePositions,
} from "../../../../data/cover";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../../data/entity/entity_attributes";
import type {
  CoverEntityOptions,
  ExtEntityRegistryEntry,
} from "../../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../types";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../../generic/show-dialog-box";
import "../ha-more-info-favorites";
import type { HaMoreInfoFavorites } from "../ha-more-info-favorites";

type FavoriteKind = "position" | "tilt";

type FavoriteKey =
  | "set"
  | "edit"
  | "delete"
  | "delete_confirm_title"
  | "delete_confirm_text"
  | "delete_confirm_action"
  | "add"
  | "edit_title"
  | "add_title";

const favoriteKey = (
  kind: FavoriteKind
): "favorite_position" | "favorite_tilt_position" =>
  kind === "position" ? "favorite_position" : "favorite_tilt_position";

@customElement("ha-more-info-cover-favorite-positions")
export class HaMoreInfoCoverFavoritePositions extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @state() private _favoritePositions: number[] = [];

  @state() private _favoriteTiltPositions: number[] = [];

  protected updated(changedProps: PropertyValues<this>): void {
    if (
      (changedProps.has("entry") || changedProps.has("stateObj")) &&
      this.entry &&
      this.stateObj
    ) {
      const options = this.entry.options?.cover;

      this._favoritePositions = coverSupportsPosition(this.stateObj)
        ? normalizeCoverFavoritePositions(
            options?.favorite_positions ?? DEFAULT_COVER_FAVORITE_POSITIONS
          )
        : [];

      this._favoriteTiltPositions = coverSupportsTiltPosition(this.stateObj)
        ? normalizeCoverFavoritePositions(
            options?.favorite_tilt_positions ?? DEFAULT_COVER_FAVORITE_POSITIONS
          )
        : [];
    }
  }

  private _localizeFavorite(
    kind: FavoriteKind,
    key: FavoriteKey,
    values?: Record<string, string | number>
  ): string {
    return this.hass.localize(
      `ui.dialogs.more_info_control.cover.${favoriteKey(kind)}.${key}`,
      values
    );
  }

  private _getFavorites(kind: FavoriteKind): number[] {
    return kind === "position"
      ? this._favoritePositions
      : this._favoriteTiltPositions;
  }

  private _getCurrentValue(kind: FavoriteKind): number | undefined {
    const current =
      kind === "position"
        ? this.stateObj.attributes.current_position
        : this.stateObj.attributes.current_tilt_position;

    return current == null ? undefined : Math.round(current);
  }

  private async _save(options: CoverEntityOptions): Promise<void> {
    if (!this.entry) {
      return;
    }

    const currentOptions: CoverEntityOptions = {
      ...(this.entry.options?.cover ?? {}),
    };

    if (coverSupportsPosition(this.stateObj)) {
      currentOptions.favorite_positions = this._favoritePositions;
    }

    if (coverSupportsTiltPosition(this.stateObj)) {
      currentOptions.favorite_tilt_positions = this._favoriteTiltPositions;
    }

    const result = await updateEntityRegistryEntry(
      this.hass,
      this.entry.entity_id,
      {
        options_domain: "cover",
        options: {
          ...currentOptions,
          ...options,
        },
      }
    );

    fireEvent(this, "entity-entry-updated", result.entity_entry);
  }

  private async _setFavorites(
    kind: FavoriteKind,
    favorites: number[]
  ): Promise<void> {
    const normalized = normalizeCoverFavoritePositions(favorites);

    if (kind === "position") {
      this._favoritePositions = normalized;
      await this._save({ favorite_positions: normalized });
      return;
    }

    this._favoriteTiltPositions = normalized;
    await this._save({ favorite_tilt_positions: normalized });
  }

  private _move(kind: FavoriteKind, index: number, newIndex: number): void {
    const favorites = this._getFavorites(kind).concat();
    const moved = favorites.splice(index, 1)[0];
    favorites.splice(newIndex, 0, moved);
    this._setFavorites(kind, favorites);
  }

  private _applyFavorite(kind: FavoriteKind, index: number): void {
    const favorite = this._getFavorites(kind)[index];

    if (favorite === undefined) {
      return;
    }

    if (kind === "position") {
      this.hass.callService("cover", "set_cover_position", {
        entity_id: this.stateObj.entity_id,
        position: favorite,
      });
      return;
    }

    this.hass.callService("cover", "set_cover_tilt_position", {
      entity_id: this.stateObj.entity_id,
      tilt_position: favorite,
    });
  }

  private async _promptFavoriteValue(
    kind: FavoriteKind,
    value?: number
  ): Promise<number | undefined> {
    const response = await showPromptDialog(this, {
      title: this._localizeFavorite(
        kind,
        value === undefined ? "add_title" : "edit_title"
      ),
      inputLabel: this.hass.localize(
        kind === "position"
          ? "ui.card.cover.position"
          : "ui.card.cover.tilt_position"
      ),
      inputType: "number",
      inputMin: "0",
      inputMax: "100",
      inputSuffix: DOMAIN_ATTRIBUTES_UNITS.cover.current_position,
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

  private async _addFavorite(kind: FavoriteKind): Promise<void> {
    const value = await this._promptFavoriteValue(kind);

    if (value === undefined) {
      return;
    }

    await this._setFavorites(kind, [...this._getFavorites(kind), value]);
  }

  private async _editFavorite(
    kind: FavoriteKind,
    index: number
  ): Promise<void> {
    const favorites = this._getFavorites(kind);
    const current = favorites[index];

    if (current === undefined) {
      return;
    }

    const value = await this._promptFavoriteValue(kind, current);

    if (value === undefined) {
      return;
    }

    const updated = [...favorites];
    updated[index] = value;
    await this._setFavorites(kind, updated);
  }

  private async _deleteFavorite(
    kind: FavoriteKind,
    index: number
  ): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      destructive: true,
      title: this._localizeFavorite(kind, "delete_confirm_title"),
      text: this._localizeFavorite(kind, "delete_confirm_text"),
      confirmText: this._localizeFavorite(kind, "delete_confirm_action"),
    });

    if (!confirmed) {
      return;
    }

    await this._setFavorites(
      kind,
      this._getFavorites(kind).filter((_, itemIndex) => itemIndex !== index)
    );
  }

  private _renderFavoriteButton =
    (kind: FavoriteKind): HaMoreInfoFavorites["renderItem"] =>
    (favorite, _index, _editMode) => {
      const currentValue = this._getCurrentValue(kind);
      const active = currentValue === favorite;

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
          .disabled=${this.stateObj.state === UNAVAILABLE}
        >
          ${favorite as number}%
        </ha-control-button>
      `;
    };

  private _deleteLabel =
    (kind: FavoriteKind): HaMoreInfoFavorites["deleteLabel"] =>
    (index) =>
      this._localizeFavorite(kind, "delete", {
        number: index + 1,
      });

  private _eventKind(ev: Event): FavoriteKind {
    return (ev.currentTarget as HTMLElement).dataset.kind as FavoriteKind;
  }

  private _handleFavoriteAction = (
    ev: CustomEvent<{ action: string; index: number }>
  ): void => {
    ev.stopPropagation();
    const kind = this._eventKind(ev);

    const { action, index } = ev.detail;

    if (action === "hold" && this.hass.user?.is_admin) {
      fireEvent(this, "toggle-edit-mode", true);
      return;
    }

    if (this.editMode) {
      this._editFavorite(kind, index);
      return;
    }

    this._applyFavorite(kind, index);
  };

  private _handleFavoriteMoved = (
    ev: CustomEvent<{ oldIndex: number; newIndex: number }>
  ): void => {
    ev.stopPropagation();
    const kind = this._eventKind(ev);
    this._move(kind, ev.detail.oldIndex, ev.detail.newIndex);
  };

  private _handleFavoriteDelete = (
    ev: CustomEvent<{ index: number }>
  ): void => {
    ev.stopPropagation();
    const kind = this._eventKind(ev);
    this._deleteFavorite(kind, ev.detail.index);
  };

  private _handleFavoriteAdd = (ev: CustomEvent): void => {
    ev.stopPropagation();
    const kind = this._eventKind(ev);
    this._addFavorite(kind);
  };

  private _handleFavoriteDone = (ev: CustomEvent): void => {
    ev.stopPropagation();
    fireEvent(this, "toggle-edit-mode", false);
  };

  private _renderKindSection(
    kind: FavoriteKind,
    label: string,
    favorites: number[],
    showDone: boolean
  ): TemplateResult | typeof nothing {
    if (!this.editMode && favorites.length === 0) {
      return nothing;
    }

    return html`
      <section class="group">
        <h4>${label}</h4>
        <ha-more-info-favorites
          data-kind=${kind}
          .items=${favorites}
          .renderItem=${this._renderFavoriteButton(kind)}
          .deleteLabel=${this._deleteLabel(kind)}
          .editMode=${this.editMode ?? false}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          .isAdmin=${Boolean(this.hass.user?.is_admin)}
          .showDone=${showDone}
          .addLabel=${this._localizeFavorite(kind, "add")}
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

    const supportsPosition = coverSupportsPosition(this.stateObj);
    const supportsTiltPosition = coverSupportsTiltPosition(this.stateObj);

    const showDoneOnPosition = supportsPosition && !supportsTiltPosition;

    return html`
      <div class="groups">
        ${supportsPosition
          ? this._renderKindSection(
              "position",
              this.hass.localize("ui.card.cover.position"),
              this._favoritePositions,
              showDoneOnPosition
            )
          : nothing}
        ${supportsTiltPosition
          ? this._renderKindSection(
              "tilt",
              this.hass.localize("ui.card.cover.tilt_position"),
              this._favoriteTiltPositions,
              true
            )
          : nothing}
      </div>
    `;
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
      --favorite-item-active-background-color: var(--state-cover-active-color);
    }

    h4 {
      margin: 0 0 var(--ha-space-2);
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-cover-favorite-positions": HaMoreInfoCoverFavoritePositions;
  }
}
