import { consume } from "@lit/context";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { transform } from "../../../../common/decorators/transform";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-control-button";
import { apiContext, configContext } from "../../../../data/context";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import type {
  ExtEntityRegistryEntry,
  LightEntityOptions,
} from "../../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import { normalizeFavoritePositions } from "../../../../data/favorite_positions";
import type { LightEntity } from "../../../../data/light";
import {
  DEFAULT_LIGHT_FAVORITE_BRIGHTNESS,
  lightSupportsBrightness,
} from "../../../../data/light";
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
import { favoriteSectionStyle } from "./favorite-section-style";

const BRIGHTNESS_MIN = 1;
const BRIGHTNESS_MAX = 100;

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

@customElement("ha-more-info-light-favorite-brightness")
export class HaMoreInfoLightFavoriteBrightness extends LitElement {
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

  @property({ attribute: false }) public stateObj!: LightEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  @property({ attribute: false }) public label?: string;

  @state() private _favoriteBrightness: number[] = [];

  protected updated(changedProps: PropertyValues<this>): void {
    if (
      (changedProps.has("entry") || changedProps.has("stateObj")) &&
      this.entry &&
      this.stateObj
    ) {
      const options = this.entry.options?.light;

      this._favoriteBrightness = lightSupportsBrightness(this.stateObj)
        ? normalizeFavoritePositions(
            options?.favorite_brightness ?? DEFAULT_LIGHT_FAVORITE_BRIGHTNESS,
            { min: BRIGHTNESS_MIN }
          )
        : [];
    }
  }

  private _localizeFavorite(
    key: FavoriteLocalizeKey,
    values?: Record<string, string | number>
  ): string {
    return this._localize(
      `ui.dialogs.more_info_control.light.favorite_brightness.${key}`,
      values
    );
  }

  private _getCurrentValue(): number | undefined {
    const brightness = this.stateObj.attributes.brightness;
    return brightness == null
      ? undefined
      : Math.round((brightness / 255) * 100);
  }

  private async _save(favoriteBrightness: number[]): Promise<void> {
    if (!this.entry) {
      return;
    }

    const currentOptions: LightEntityOptions = {
      ...(this.entry.options?.light ?? {}),
    };

    const result = await updateEntityRegistryEntry(
      this._api,
      this.entry.entity_id,
      {
        options_domain: "light",
        options: {
          ...currentOptions,
          favorite_brightness: favoriteBrightness,
        },
      }
    );

    fireEvent(this, "entity-entry-updated", result.entity_entry);
  }

  private async _setFavorites(favorites: number[]): Promise<void> {
    const normalized = normalizeFavoritePositions(favorites, {
      min: BRIGHTNESS_MIN,
    });

    this._favoriteBrightness = normalized;
    await this._save(normalized);
  }

  private _move(index: number, newIndex: number): void {
    const favorites = this._favoriteBrightness.concat();
    const moved = favorites.splice(index, 1)[0];
    favorites.splice(newIndex, 0, moved);
    this._setFavorites(favorites);
  }

  private _applyFavorite(index: number): void {
    const favorite = this._favoriteBrightness[index];

    if (favorite === undefined) {
      return;
    }

    this._api.callService("light", "turn_on", {
      entity_id: this.stateObj.entity_id,
      brightness_pct: favorite,
    });
  }

  private async _promptFavoriteValue(
    value?: number
  ): Promise<number | undefined> {
    const response = await showPromptDialog(this, {
      title: this._localizeFavorite(
        value === undefined ? "add_title" : "edit_title"
      ),
      inputLabel: this._localize("ui.card.light.brightness"),
      inputType: "number",
      inputMin: String(BRIGHTNESS_MIN),
      inputMax: String(BRIGHTNESS_MAX),
      inputSuffix: "%",
      defaultValue: value === undefined ? undefined : String(value),
    });

    if (response === null || response.trim() === "") {
      return undefined;
    }

    const number = Number(response);

    if (isNaN(number)) {
      return undefined;
    }

    return Math.max(BRIGHTNESS_MIN, Math.min(BRIGHTNESS_MAX, number));
  }

  private async _addFavorite(): Promise<void> {
    const value = await this._promptFavoriteValue();

    if (value === undefined) {
      return;
    }

    await this._setFavorites([...this._favoriteBrightness, value]);
  }

  private async _editFavorite(index: number): Promise<void> {
    const current = this._favoriteBrightness[index];

    if (current === undefined) {
      return;
    }

    const value = await this._promptFavoriteValue(current);

    if (value === undefined) {
      return;
    }

    const updated = [...this._favoriteBrightness];
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
      this._favoriteBrightness.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  private _renderFavoriteButton: HaMoreInfoFavorites["renderItem"] = (
    favorite,
    _index,
    editMode
  ) => {
    const currentValue = this._getCurrentValue();
    const active = currentValue === favorite;
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

  private _deleteLabel = (index: number): string =>
    this._localizeFavorite("delete", { number: index + 1 });

  private _handleFavoriteAction = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-action"]>
  ): void => {
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

  protected render(): TemplateResult | typeof nothing {
    if (!this.stateObj || !this.entry) {
      return nothing;
    }

    if (!this.editMode && this._favoriteBrightness.length === 0) {
      return nothing;
    }

    return html`
      <section class="group">
        ${this.label ? html`<h4>${this.label}</h4>` : nothing}
        <ha-more-info-favorites
          .items=${this._favoriteBrightness}
          .renderItem=${this._renderFavoriteButton}
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
      </section>
    `;
  }

  static styles = [
    favoriteSectionStyle,
    css`
      .group ha-more-info-favorites {
        --favorite-items-max-width: 384px;
        --favorite-item-active-background-color: var(
          --state-light-active-color
        );
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-light-favorite-brightness": HaMoreInfoLightFavoriteBrightness;
  }
}
