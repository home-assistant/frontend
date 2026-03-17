import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import type { HassEntity } from "home-assistant-js-websocket";
import { html } from "lit";
import type { LitElement } from "lit";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-control-button";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type {
  ExtEntityRegistryEntry,
  FavoriteOption,
} from "../../../data/entity/entity_registry";
import { updateEntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../types";
import {
  showConfirmationDialog,
  showPromptDialog,
} from "../../generic/show-dialog-box";
import type { HaMoreInfoFavorites } from "./ha-more-info-favorites";

export type NumericFavoriteLocalizeKey =
  | "set"
  | "edit"
  | "delete"
  | "delete_confirm_title"
  | "delete_confirm_text"
  | "delete_confirm_action"
  | "add"
  | "edit_title"
  | "add_title";

interface NumericMoreInfoFavoritesControllerConfig<TEntity extends HassEntity> {
  getHass: () => HomeAssistant | undefined;
  getStateObj: () => TEntity | undefined;
  getEntry: () => ExtEntityRegistryEntry | null | undefined;
  getEditMode: () => boolean;
  domain: "cover" | "valve";
  option: Extract<
    FavoriteOption,
    "favorite_positions" | "favorite_tilt_positions"
  >;
  defaultFavorites: number[];
  getStoredFavorites: (entry: ExtEntityRegistryEntry) => number[] | undefined;
  normalizeFavorites: (favorites?: number[]) => number[];
  getCurrentValue: (stateObj: TEntity) => number | undefined;
  setPositionService: string;
  serviceDataKey: string;
  localize: (
    key: NumericFavoriteLocalizeKey,
    values?: Record<string, string | number>
  ) => string;
  getInputLabel: () => string;
  inputSuffix: string;
}

export class NumericMoreInfoFavoritesController<
  TEntity extends HassEntity,
> implements ReactiveController {
  public favorites: number[] = [];

  public readonly renderItem: HaMoreInfoFavorites["renderItem"] = (
    favorite,
    _index,
    editMode
  ) => {
    const value = favorite as number;
    const stateObj = this._config.getStateObj();
    const active =
      stateObj !== undefined &&
      this._config.getCurrentValue(stateObj) === value;
    const label = this._config.localize(editMode ? "edit" : "set", {
      value: `${value}%`,
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
        .disabled=${stateObj?.state === UNAVAILABLE}
      >
        ${value}%
      </ha-control-button>
    `;
  };

  public readonly deleteLabel: HaMoreInfoFavorites["deleteLabel"] = (index) =>
    this._config.localize("delete", { number: index + 1 });

  public readonly handleAction = async (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-action"]>
  ): Promise<void> => {
    ev.stopPropagation();

    const hass = this._config.getHass();

    if (!hass) {
      return;
    }

    const { action, index } = ev.detail;

    if (action === "hold" && hass.user?.is_admin) {
      fireEvent(this._host, "toggle-edit-mode", true);
      return;
    }

    if (this._config.getEditMode()) {
      await this._editFavorite(index);
      return;
    }

    await this._applyFavorite(index);
  };

  public readonly handleMoved = async (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-moved"]>
  ): Promise<void> => {
    ev.stopPropagation();
    await this._move(ev.detail.oldIndex, ev.detail.newIndex);
  };

  public readonly handleDelete = async (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-delete"]>
  ): Promise<void> => {
    ev.stopPropagation();
    await this._deleteFavorite(ev.detail.index);
  };

  public readonly handleAdd = async (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-add"]>
  ): Promise<void> => {
    ev.stopPropagation();
    await this._addFavorite();
  };

  public readonly handleDone = (
    ev: HASSDomEvent<HASSDomEvents["favorite-item-done"]>
  ): void => {
    ev.stopPropagation();
    fireEvent(this._host, "toggle-edit-mode", false);
  };

  private _lastEntry?: ExtEntityRegistryEntry | null;

  private _lastStateObj?: TEntity;

  constructor(
    private readonly _host: ReactiveControllerHost & LitElement,
    private readonly _config: NumericMoreInfoFavoritesControllerConfig<TEntity>
  ) {
    this._host.addController(this);
  }

  public hostUpdated(): void {
    const entry = this._config.getEntry();
    const stateObj = this._config.getStateObj();

    if (entry === this._lastEntry && stateObj === this._lastStateObj) {
      return;
    }

    this._lastEntry = entry;
    this._lastStateObj = stateObj;
    this.favorites =
      entry && stateObj
        ? this._config.normalizeFavorites(
            this._config.getStoredFavorites(entry) ??
              this._config.defaultFavorites
          )
        : [];
    this._host.requestUpdate();
  }

  private async _saveFavorites(favorites: number[]): Promise<void> {
    const hass = this._config.getHass();
    const entry = this._config.getEntry();

    if (!hass || !entry) {
      return;
    }

    const result = await updateEntityRegistryEntry(hass, entry.entity_id, {
      options_domain: this._config.domain,
      options: {
        ...(entry.options?.[this._config.domain] ?? {}),
        [this._config.option]: favorites,
      },
    });

    fireEvent(this._host, "entity-entry-updated", result.entity_entry);
  }

  private async _setFavorites(favorites: number[]): Promise<void> {
    this.favorites = this._config.normalizeFavorites(favorites);
    this._host.requestUpdate();
    await this._saveFavorites(this.favorites);
  }

  private async _move(index: number, newIndex: number): Promise<void> {
    const favorites = this.favorites.concat();
    const moved = favorites.splice(index, 1)[0];

    favorites.splice(newIndex, 0, moved);
    await this._setFavorites(favorites);
  }

  private async _applyFavorite(index: number): Promise<void> {
    const hass = this._config.getHass();
    const stateObj = this._config.getStateObj();
    const favorite = this.favorites[index];

    if (!hass || !stateObj || favorite === undefined) {
      return;
    }

    await hass.callService(
      this._config.domain,
      this._config.setPositionService,
      {
        entity_id: stateObj.entity_id,
        [this._config.serviceDataKey]: favorite,
      }
    );
  }

  private async _promptFavoriteValue(
    value?: number
  ): Promise<number | undefined> {
    const hass = this._config.getHass();

    if (!hass) {
      return undefined;
    }

    const response = await showPromptDialog(this._host, {
      title: this._config.localize(
        value === undefined ? "add_title" : "edit_title"
      ),
      inputLabel: this._config.getInputLabel(),
      inputType: "number",
      inputMin: "0",
      inputMax: "100",
      inputSuffix: this._config.inputSuffix,
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

    await this._setFavorites([...this.favorites, value]);
  }

  private async _editFavorite(index: number): Promise<void> {
    const current = this.favorites[index];

    if (current === undefined) {
      return;
    }

    const value = await this._promptFavoriteValue(current);

    if (value === undefined) {
      return;
    }

    const favorites = [...this.favorites];

    favorites[index] = value;
    await this._setFavorites(favorites);
  }

  private async _deleteFavorite(index: number): Promise<void> {
    const confirmed = await showConfirmationDialog(this._host, {
      destructive: true,
      title: this._config.localize("delete_confirm_title"),
      text: this._config.localize("delete_confirm_text"),
      confirmText: this._config.localize("delete_confirm_action"),
    });

    if (!confirmed) {
      return;
    }

    await this._setFavorites(
      this.favorites.filter((_, itemIndex) => itemIndex !== index)
    );
  }
}
