import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { UNAVAILABLE } from "../../../../data/entity/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../../data/entity/entity_attributes";
import type { ExtEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../types";
import type { ValveEntity } from "../../../../data/valve";
import {
  DEFAULT_VALVE_FAVORITE_POSITIONS,
  normalizeValveFavoritePositions,
} from "../../../../data/valve";
import "../ha-more-info-favorites";
import {
  NumericMoreInfoFavoritesController,
  type NumericFavoriteLocalizeKey,
} from "../numeric-more-info-favorites-controller";

@customElement("ha-more-info-valve-favorite-positions")
export class HaMoreInfoValveFavoritePositions extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: ValveEntity;

  @property({ attribute: false }) public entry?: ExtEntityRegistryEntry | null;

  @property({ attribute: false }) public editMode?: boolean;

  private readonly _favorites =
    new NumericMoreInfoFavoritesController<ValveEntity>(this, {
      getHass: () => this.hass,
      getStateObj: () => this.stateObj,
      getEntry: () => this.entry,
      getEditMode: () => this.editMode ?? false,
      domain: "valve",
      option: "favorite_positions",
      defaultFavorites: DEFAULT_VALVE_FAVORITE_POSITIONS,
      getStoredFavorites: (entry) => entry.options?.valve?.favorite_positions,
      normalizeFavorites: normalizeValveFavoritePositions,
      getCurrentValue: (stateObj) => {
        const current = stateObj.attributes.current_position;

        return current == null ? undefined : Math.round(current);
      },
      setPositionService: "set_valve_position",
      serviceDataKey: "position",
      localize: (key, values) => this._localizeFavorite(key, values),
      getInputLabel: () => this.hass.localize("ui.card.cover.position"),
      inputSuffix: DOMAIN_ATTRIBUTES_UNITS.valve.current_position,
    });

  private _localizeFavorite(
    key: NumericFavoriteLocalizeKey,
    values?: Record<string, string | number>
  ): string {
    return this.hass.localize(
      `ui.dialogs.more_info_control.valve.favorite_position.${key}`,
      values
    );
  }

  private _renderSection(): TemplateResult | typeof nothing {
    if (!this.editMode && this._favorites.favorites.length === 0) {
      return nothing;
    }

    return html`
      <section class="group">
        <ha-more-info-favorites
          .items=${this._favorites.favorites}
          .renderItem=${this._favorites.renderItem}
          .deleteLabel=${this._favorites.deleteLabel}
          .editMode=${this.editMode ?? false}
          .disabled=${this.stateObj.state === UNAVAILABLE}
          .isAdmin=${Boolean(this.hass.user?.is_admin)}
          .showDone=${true}
          .addLabel=${this._localizeFavorite("add")}
          .doneLabel=${this.hass.localize(
            "ui.dialogs.more_info_control.exit_edit_mode"
          )}
          @favorite-item-action=${this._favorites.handleAction}
          @favorite-item-moved=${this._favorites.handleMoved}
          @favorite-item-delete=${this._favorites.handleDelete}
          @favorite-item-add=${this._favorites.handleAdd}
          @favorite-item-done=${this._favorites.handleDone}
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
