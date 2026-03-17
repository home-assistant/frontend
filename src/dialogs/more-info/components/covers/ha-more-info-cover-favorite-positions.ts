import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { CoverEntity } from "../../../../data/cover";
import {
  DEFAULT_COVER_FAVORITE_POSITIONS,
  coverSupportsPosition,
  coverSupportsTiltPosition,
  normalizeCoverFavoritePositions,
} from "../../../../data/cover";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../../data/entity/entity_attributes";
import type { ExtEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../types";
import "../ha-more-info-favorites";
import {
  NumericMoreInfoFavoritesController,
  type NumericFavoriteLocalizeKey,
} from "../numeric-more-info-favorites-controller";

type FavoriteKind = "position" | "tilt";

@customElement("ha-more-info-cover-favorite-positions")
export class HaMoreInfoCoverFavoritePositions extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: CoverEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  private readonly _positionFavorites =
    new NumericMoreInfoFavoritesController<CoverEntity>(this, {
      getHass: () => this.hass,
      getStateObj: () => this.stateObj,
      getEntry: () => this.entry,
      getEditMode: () => this.editMode ?? false,
      domain: "cover",
      option: "favorite_positions",
      defaultFavorites: DEFAULT_COVER_FAVORITE_POSITIONS,
      getStoredFavorites: (entry) => entry.options?.cover?.favorite_positions,
      normalizeFavorites: normalizeCoverFavoritePositions,
      getCurrentValue: (stateObj) => {
        const current = stateObj.attributes.current_position;

        return current == null ? undefined : Math.round(current);
      },
      setPositionService: "set_cover_position",
      serviceDataKey: "position",
      localize: (key, values) =>
        this._localizeFavorite("position", key, values),
      getInputLabel: () => this.hass.localize("ui.card.cover.position"),
      inputSuffix: DOMAIN_ATTRIBUTES_UNITS.cover.current_position,
    });

  private readonly _tiltFavorites =
    new NumericMoreInfoFavoritesController<CoverEntity>(this, {
      getHass: () => this.hass,
      getStateObj: () => this.stateObj,
      getEntry: () => this.entry,
      getEditMode: () => this.editMode ?? false,
      domain: "cover",
      option: "favorite_tilt_positions",
      defaultFavorites: DEFAULT_COVER_FAVORITE_POSITIONS,
      getStoredFavorites: (entry) =>
        entry.options?.cover?.favorite_tilt_positions,
      normalizeFavorites: normalizeCoverFavoritePositions,
      getCurrentValue: (stateObj) => {
        const current = stateObj.attributes.current_tilt_position;

        return current == null ? undefined : Math.round(current);
      },
      setPositionService: "set_cover_tilt_position",
      serviceDataKey: "tilt_position",
      localize: (key, values) => this._localizeFavorite("tilt", key, values),
      getInputLabel: () => this.hass.localize("ui.card.cover.tilt_position"),
      inputSuffix: DOMAIN_ATTRIBUTES_UNITS.cover.current_position,
    });

  private _localizeFavorite(
    kind: FavoriteKind,
    key: NumericFavoriteLocalizeKey,
    values?: Record<string, string | number>
  ): string {
    return this.hass.localize(
      `ui.dialogs.more_info_control.cover.${kind === "position" ? "favorite_position" : "favorite_tilt_position"}.${key}`,
      values
    );
  }

  private _renderKindSection(
    label: string,
    controller: NumericMoreInfoFavoritesController<CoverEntity>,
    addLabel: string,
    showDone: boolean,
    showLabel: boolean
  ): TemplateResult | typeof nothing {
    const favorites = controller.favorites;

    if (!this.editMode && favorites.length === 0) {
      return nothing;
    }

    return html`
      <section class="group">
        ${showLabel ? html`<h4>${label}</h4>` : nothing}
        <ha-more-info-favorites
          .items=${favorites}
          .renderItem=${controller.renderItem}
          .deleteLabel=${controller.deleteLabel}
          .editMode=${this.editMode ?? false}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          .isAdmin=${Boolean(this.hass.user?.is_admin)}
          .showDone=${showDone}
          .addLabel=${addLabel}
          .doneLabel=${this.hass.localize(
            "ui.dialogs.more_info_control.exit_edit_mode"
          )}
          @favorite-item-action=${controller.handleAction}
          @favorite-item-moved=${controller.handleMoved}
          @favorite-item-delete=${controller.handleDelete}
          @favorite-item-add=${controller.handleAdd}
          @favorite-item-done=${controller.handleDone}
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
    const showPositionSection = supportsPosition
      ? this.editMode || this._positionFavorites.favorites.length > 0
      : false;
    const showTiltSection = supportsTiltPosition
      ? this.editMode || this._tiltFavorites.favorites.length > 0
      : false;
    const showLabels =
      [showPositionSection, showTiltSection].filter(Boolean).length > 1;

    const showDoneOnPosition = supportsPosition && !supportsTiltPosition;

    return html`
      <div class="groups">
        ${supportsPosition
          ? this._renderKindSection(
              this.hass.localize("ui.card.cover.position"),
              this._positionFavorites,
              this._localizeFavorite("position", "add"),
              showDoneOnPosition,
              showLabels
            )
          : nothing}
        ${supportsTiltPosition
          ? this._renderKindSection(
              this.hass.localize("ui.card.cover.tilt_position"),
              this._tiltFavorites,
              this._localizeFavorite("tilt", "add"),
              true,
              showLabels
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
      text-align: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-cover-favorite-positions": HaMoreInfoCoverFavoritePositions;
  }
}
