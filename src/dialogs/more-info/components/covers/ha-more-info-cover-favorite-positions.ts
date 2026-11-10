import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../../../../common/decorators/consume";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { transform } from "../../../../common/decorators/transform";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import { clamp } from "../../../../common/number/clamp";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-control-button";
import { apiContext, configContext } from "../../../../data/context";
import type { CoverControlMode, CoverEntity } from "../../../../data/cover";
import {
  DEFAULT_COVER_FAVORITE_POSITIONS,
  coverCurrentValue,
} from "../../../../data/cover";
import { normalizeFavoritePositions } from "../../../../data/favorite_positions";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../../data/entity/entity_attributes";
import type {
  CoverEntityOptions,
  ExtEntityRegistryEntry,
} from "../../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantConfig,
} from "../../../../types";
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

const OPTION_KEYS = {
  position: "favorite_positions",
  tilt: "favorite_tilt_positions",
} as const satisfies Record<CoverControlMode, keyof CoverEntityOptions>;

@customElement("ha-more-info-cover-favorite-positions")
export class HaMoreInfoCoverFavoritePositions extends LitElement {
  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HomeAssistant["user"]>({
    transformer: ({ user }) => user,
  })
  private _user!: HomeAssistant["user"];

  @property({ attribute: false }) public stateObj!: CoverEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @property({ attribute: false }) public mode: CoverControlMode = "position";

  @state() private _favorites: number[] = [];

  protected willUpdate(changedProps: PropertyValues<this>): void {
    if (changedProps.has("entry") || changedProps.has("mode")) {
      this._favorites = normalizeFavoritePositions(
        this.entry?.options?.cover?.[OPTION_KEYS[this.mode]] ??
          DEFAULT_COVER_FAVORITE_POSITIONS
      );
    }
  }

  private _localizeFavorite(
    key: FavoriteLocalizeKey,
    values?: Record<string, string | number>
  ): string {
    return this._localize(
      `ui.dialogs.more_info_control.cover.${this.mode === "position" ? "favorite_position" : "favorite_tilt_position"}.${key}`,
      values
    );
  }

  private async _setFavorites(favorites: number[]): Promise<void> {
    if (!this.entry) {
      return;
    }
    const normalized = normalizeFavoritePositions(favorites);
    this._favorites = normalized;
    const result = await updateEntityRegistryEntry(
      this._api,
      this.entry.entity_id,
      {
        options_domain: "cover",
        options: {
          ...this.entry.options?.cover,
          [OPTION_KEYS[this.mode]]: normalized,
        },
      }
    );
    fireEvent(this, "entity-entry-updated", result.entity_entry);
  }

  private _applyFavorite(index: number): void {
    const favorite = this._favorites[index];
    if (favorite === undefined) {
      return;
    }
    fireEvent(this, "cover-command", {
      mode: this.mode,
      action: "set",
      value: favorite,
    });
  }

  private async _promptFavoriteValue(
    value?: number
  ): Promise<number | undefined> {
    const response = await showPromptDialog(this, {
      title: this._localizeFavorite(
        value === undefined ? "add_title" : "edit_title"
      ),
      inputLabel: this._localize(
        this.mode === "position"
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

    return clamp(number, 0, 100);
  }

  private async _addFavorite(): Promise<void> {
    const value = await this._promptFavoriteValue();
    if (value === undefined) {
      return;
    }
    await this._setFavorites([...this._favorites, value]);
  }

  private async _editFavorite(index: number): Promise<void> {
    const current = this._favorites[index];
    if (current === undefined) {
      return;
    }
    const value = await this._promptFavoriteValue(current);
    if (value === undefined) {
      return;
    }
    const updated = [...this._favorites];
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
      this._favorites.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  private _favoriteButtonRenderer(): HaMoreInfoFavorites["renderItem"] {
    return (favorite, _index, editMode) => {
      const active = coverCurrentValue(this.stateObj, this.mode) === favorite;
      const label = this._localizeFavorite(editMode ? "edit" : "set", {
        value: `${favorite as number}%`,
      });

      return html`
        <ha-control-button
          class=${classMap({ active })}
          style=${styleMap({
            "--control-button-border-radius": "var(--ha-border-radius-pill)",
            width: "72px",
            height: "36px",
          })}
          .label=${label}
          .disabled=${this.stateObj.state === UNAVAILABLE}
        >
          ${favorite as number}%
        </ha-control-button>
      `;
    };
  }

  private _deleteLabel: HaMoreInfoFavorites["deleteLabel"] = (index) =>
    this._localizeFavorite("delete", { number: index + 1 });

  private _handleFavoriteAction(
    ev: HASSDomEvent<HASSDomEvents["favorite-item-action"]>
  ): void {
    ev.stopPropagation();
    const { action, index } = ev.detail;

    if (action === "hold" && this._user?.is_admin) {
      fireEvent(this, "toggle-edit-mode", true);
      return;
    }

    if (this.editMode) {
      this._editFavorite(index);
      return;
    }

    this._applyFavorite(index);
  }

  private _handleFavoriteMoved(
    ev: HASSDomEvent<HASSDomEvents["favorite-item-moved"]>
  ): void {
    ev.stopPropagation();
    const favorites = [...this._favorites];
    const [moved] = favorites.splice(ev.detail.oldIndex, 1);
    favorites.splice(ev.detail.newIndex, 0, moved);
    this._setFavorites(favorites);
  }

  private _handleFavoriteDelete(
    ev: HASSDomEvent<HASSDomEvents["favorite-item-delete"]>
  ): void {
    ev.stopPropagation();
    this._deleteFavorite(ev.detail.index);
  }

  private _handleFavoriteAdd(
    ev: HASSDomEvent<HASSDomEvents["favorite-item-add"]>
  ): void {
    ev.stopPropagation();
    this._addFavorite();
  }

  private _handleFavoriteDone(
    ev: HASSDomEvent<HASSDomEvents["favorite-item-done"]>
  ): void {
    ev.stopPropagation();
    fireEvent(this, "toggle-edit-mode", false);
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.stateObj || !this.entry) {
      return nothing;
    }
    if (!this.editMode && this._favorites.length === 0) {
      return nothing;
    }

    return html`
      <ha-more-info-favorites
        .items=${this._favorites}
        .renderItem=${this._favoriteButtonRenderer()}
        .deleteLabel=${this._deleteLabel}
        .editMode=${this.editMode ?? false}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        .isAdmin=${Boolean(this._user?.is_admin)}
        .showDone=${true}
        .addLabel=${this._localizeFavorite("add")}
        .doneLabel=${this._localize(
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

  static styles = css`
    :host {
      display: flex;
      justify-content: center;
      width: 100%;
    }

    ha-more-info-favorites {
      width: 100%;
      max-width: 384px;
      --favorite-items-max-width: 384px;
      --favorite-item-active-background-color: var(--state-cover-active-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-cover-favorite-positions": HaMoreInfoCoverFavoritePositions;
  }
}
