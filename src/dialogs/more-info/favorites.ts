import type { HassEntity } from "home-assistant-js-websocket";
import { html, type LitElement } from "lit";
import {
  hasRejectedItems,
  rejectedItems,
} from "../../common/util/promise-all-settled-results";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import type { CoverEntity } from "../../data/cover";
import {
  DEFAULT_COVER_FAVORITE_POSITIONS,
  coverSupportsAnyPosition,
  coverSupportsPosition,
  coverSupportsTiltPosition,
  normalizeCoverFavoritePositions,
} from "../../data/cover";
import type {
  ExtEntityRegistryEntry,
  FavoriteOption,
  FavoritesDomain,
} from "../../data/entity/entity_registry";
import {
  hasCustomFavoriteOptionValues,
  isFavoritesDomain,
  updateEntityRegistryEntry,
} from "../../data/entity/entity_registry";
import type { LightColor, LightEntity } from "../../data/light";
import {
  LightColorMode,
  computeDefaultFavoriteColors,
  lightSupportsColor,
  lightSupportsColorMode,
  lightSupportsFavoriteColors,
} from "../../data/light";
import type { ValveEntity } from "../../data/valve";
import {
  DEFAULT_VALVE_FAVORITE_POSITIONS,
  normalizeValveFavoritePositions,
  valveSupportsPosition,
} from "../../data/valve";
import type { HomeAssistant } from "../../types";
import { showAlertDialog } from "../generic/show-dialog-box";
import { showFormDialog } from "../form/show-form-dialog";

export interface FavoritesDialogContext {
  host: LitElement;
  hass: HomeAssistant;
  entry: ExtEntityRegistryEntry;
  stateObj: HassEntity;
}

interface FavoritesDialogLabels {
  editMode: string;
  reset: string;
  resetText: string;
  copy: string;
}

export interface FavoritesDialogHandler {
  domain: FavoritesDomain;
  supports: (stateObj: HassEntity) => boolean;
  hasCustomFavorites: (entry: ExtEntityRegistryEntry) => boolean;
  getResetOptions: (
    stateObj: HassEntity
  ) => Partial<Record<FavoriteOption, undefined>>;
  getLabels: (hass: HomeAssistant) => FavoritesDialogLabels;
  copy: (ctx: FavoritesDialogContext) => Promise<void>;
}

const getFavoritesDialogLabels = (
  hass: HomeAssistant,
  domain: FavoritesDomain
): FavoritesDialogLabels => ({
  editMode: hass.localize(`ui.dialogs.more_info_control.${domain}.edit_mode`),
  reset: hass.localize(
    `ui.dialogs.more_info_control.${domain}.reset_favorites`
  ),
  resetText: hass.localize(
    `ui.dialogs.more_info_control.${domain}.reset_favorites_text`
  ),
  copy: hass.localize(`ui.dialogs.more_info_control.${domain}.copy_favorites`),
});

const copyFavoriteOptionsToEntities = async (
  host: LitElement,
  hass: HomeAssistant,
  domain: FavoritesDomain,
  includeEntities: string[],
  options: object
) => {
  const registryBackedEntities = includeEntities.filter(
    (entityId) => entityId in hass.entities
  );

  const selected = await showFormDialog(host, {
    title: hass.localize(
      `ui.dialogs.more_info_control.${domain}.copy_favorites`
    ),
    submitText: hass.localize("ui.common.copy"),
    schema: [
      {
        name: "entity",
        selector: {
          entity: {
            include_entities: registryBackedEntities,
            multiple: true,
          },
        },
        required: true,
      },
    ],
    computeLabel: () =>
      hass.localize(
        `ui.dialogs.more_info_control.${domain}.copy_favorites_entities`
      ),
    computeHelper: () =>
      hass.localize(
        `ui.dialogs.more_info_control.${domain}.copy_favorites_helper`
      ),
    data: {},
  });

  if (selected?.entity) {
    const result = await Promise.allSettled(
      selected.entity.map((entityId: string) =>
        updateEntityRegistryEntry(hass, entityId, {
          options_domain: domain,
          options,
        })
      )
    );

    if (hasRejectedItems(result)) {
      const rejected = rejectedItems(result);

      showAlertDialog(host, {
        title: hass.localize("ui.panel.config.common.multiselect.failed", {
          number: rejected.length,
        }),
        text: html`<pre>
${rejected
            .map(
              (item) => item.reason.message || item.reason.code || item.reason
            )
            .join("\r\n")}</pre
        >`,
      });
    }
  }
};

const coverFavoritesHandler: FavoritesDialogHandler = {
  domain: "cover",
  supports: (stateObj) => coverSupportsAnyPosition(stateObj as CoverEntity),
  hasCustomFavorites: (entry) =>
    hasCustomFavoriteOptionValues(entry.options?.cover?.favorite_positions) ||
    hasCustomFavoriteOptionValues(
      entry.options?.cover?.favorite_tilt_positions
    ),
  getResetOptions: (stateObj) => ({
    ...(coverSupportsPosition(stateObj as CoverEntity)
      ? { favorite_positions: undefined }
      : {}),
    ...(coverSupportsTiltPosition(stateObj as CoverEntity)
      ? { favorite_tilt_positions: undefined }
      : {}),
  }),
  getLabels: (hass) => getFavoritesDialogLabels(hass, "cover"),
  copy: async ({ entry, hass, host, stateObj }) => {
    const coverStateObj = stateObj as CoverEntity;

    const favoritePositions = coverSupportsPosition(coverStateObj)
      ? normalizeCoverFavoritePositions(
          entry.options?.cover?.favorite_positions ??
            DEFAULT_COVER_FAVORITE_POSITIONS
        )
      : undefined;

    const favoriteTiltPositions = coverSupportsTiltPosition(coverStateObj)
      ? normalizeCoverFavoritePositions(
          entry.options?.cover?.favorite_tilt_positions ??
            DEFAULT_COVER_FAVORITE_POSITIONS
        )
      : undefined;

    const compatibleCovers = Object.values(hass.states).filter((candidate) => {
      if (
        candidate.entity_id === coverStateObj.entity_id ||
        computeStateDomain(candidate) !== "cover"
      ) {
        return false;
      }

      return (
        (!coverSupportsPosition(coverStateObj) ||
          coverSupportsPosition(candidate as CoverEntity)) &&
        (!coverSupportsTiltPosition(coverStateObj) ||
          coverSupportsTiltPosition(candidate as CoverEntity))
      );
    });

    await copyFavoriteOptionsToEntities(
      host,
      hass,
      "cover",
      compatibleCovers.map((cover) => cover.entity_id),
      {
        ...(favoritePositions !== undefined
          ? { favorite_positions: [...favoritePositions] }
          : {}),
        ...(favoriteTiltPositions !== undefined
          ? { favorite_tilt_positions: [...favoriteTiltPositions] }
          : {}),
      }
    );
  },
};

const lightFavoritesHandler: FavoritesDialogHandler = {
  domain: "light",
  supports: (stateObj) => lightSupportsFavoriteColors(stateObj as LightEntity),
  hasCustomFavorites: (entry) =>
    hasCustomFavoriteOptionValues(entry.options?.light?.favorite_colors),
  getResetOptions: () => ({
    favorite_colors: undefined,
  }),
  getLabels: (hass) => getFavoritesDialogLabels(hass, "light"),
  copy: async ({ entry, hass, host, stateObj }) => {
    const lightStateObj = stateObj as LightEntity;
    const favorites: LightColor[] =
      entry.options?.light?.favorite_colors ??
      computeDefaultFavoriteColors(lightStateObj);

    const favoriteTypes = [
      ...new Set(favorites.map((item) => Object.keys(item)[0])),
    ];

    const compatibleLights = Object.values(hass.states).filter(
      (candidate) =>
        candidate.entity_id !== lightStateObj.entity_id &&
        computeStateDomain(candidate) === "light" &&
        favoriteTypes.every((type) =>
          type === "color_temp_kelvin"
            ? lightSupportsColorMode(
                candidate as LightEntity,
                LightColorMode.COLOR_TEMP
              )
            : type === "hs_color" || type === "rgb_color"
              ? lightSupportsColor(candidate as LightEntity)
              : type === "rgbw_color"
                ? lightSupportsColorMode(
                    candidate as LightEntity,
                    LightColorMode.RGBW
                  )
                : type === "rgbww_color"
                  ? lightSupportsColorMode(
                      candidate as LightEntity,
                      LightColorMode.RGBWW
                    )
                  : false
        )
    );

    await copyFavoriteOptionsToEntities(
      host,
      hass,
      "light",
      compatibleLights.map((light) => light.entity_id),
      {
        favorite_colors: favorites,
      }
    );
  },
};

const valveFavoritesHandler: FavoritesDialogHandler = {
  domain: "valve",
  supports: (stateObj) => valveSupportsPosition(stateObj as ValveEntity),
  hasCustomFavorites: (entry) =>
    hasCustomFavoriteOptionValues(entry.options?.valve?.favorite_positions),
  getResetOptions: () => ({
    favorite_positions: undefined,
  }),
  getLabels: (hass) => getFavoritesDialogLabels(hass, "valve"),
  copy: async ({ entry, hass, host, stateObj }) => {
    const valveStateObj = stateObj as ValveEntity;
    const favoritePositions = normalizeValveFavoritePositions(
      entry.options?.valve?.favorite_positions ??
        DEFAULT_VALVE_FAVORITE_POSITIONS
    );

    const compatibleValves = Object.values(hass.states).filter(
      (candidate) =>
        candidate.entity_id !== valveStateObj.entity_id &&
        computeStateDomain(candidate) === "valve" &&
        valveSupportsPosition(candidate as ValveEntity)
    );

    await copyFavoriteOptionsToEntities(
      host,
      hass,
      "valve",
      compatibleValves.map((valve) => valve.entity_id),
      {
        favorite_positions: [...favoritePositions],
      }
    );
  },
};

const FAVORITES_DIALOG_HANDLERS: Record<
  FavoritesDomain,
  FavoritesDialogHandler
> = {
  cover: coverFavoritesHandler,
  light: lightFavoritesHandler,
  valve: valveFavoritesHandler,
};

export const getFavoritesDialogHandler = (
  stateObj: HassEntity
): FavoritesDialogHandler | undefined => {
  const domain = computeStateDomain(stateObj);

  if (!isFavoritesDomain(domain)) {
    return undefined;
  }

  return FAVORITES_DIALOG_HANDLERS[domain].supports(stateObj)
    ? FAVORITES_DIALOG_HANDLERS[domain]
    : undefined;
};
