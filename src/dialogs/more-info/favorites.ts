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

interface NumericFavoritesSpec<TEntity extends HassEntity> {
  option: FavoriteOption;
  supports: (stateObj: TEntity) => boolean;
  getStoredFavorites: (entry: ExtEntityRegistryEntry) => number[] | undefined;
  getFavorites: (entry: ExtEntityRegistryEntry, stateObj: TEntity) => number[];
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

const createNumericFavoritesDialogHandler = <TEntity extends HassEntity>({
  domain,
  supports,
  specs,
}: {
  domain: FavoritesDomain;
  supports: (stateObj: TEntity) => boolean;
  specs: NumericFavoritesSpec<TEntity>[];
}): FavoritesDialogHandler => ({
  domain,
  supports: (stateObj) => supports(stateObj as TEntity),
  hasCustomFavorites: (entry) =>
    specs.some((spec) =>
      hasCustomFavoriteOptionValues(spec.getStoredFavorites(entry))
    ),
  getResetOptions: (stateObj) =>
    specs.reduce<Partial<Record<FavoriteOption, undefined>>>(
      (options, spec) => {
        if (spec.supports(stateObj as TEntity)) {
          options[spec.option] = undefined;
        }

        return options;
      },
      {}
    ),
  getLabels: (hass) => getFavoritesDialogLabels(hass, domain),
  copy: async ({ entry, hass, host, stateObj }) => {
    const sourceStateObj = stateObj as TEntity;

    const compatibleEntities = Object.values(hass.states).filter(
      (candidate) =>
        candidate.entity_id !== sourceStateObj.entity_id &&
        computeStateDomain(candidate) === domain &&
        specs.every(
          (spec) =>
            !spec.supports(sourceStateObj) ||
            spec.supports(candidate as TEntity)
        )
    );

    const options = specs.reduce<Partial<Record<FavoriteOption, number[]>>>(
      (result, spec) => {
        if (spec.supports(sourceStateObj)) {
          result[spec.option] = [...spec.getFavorites(entry, sourceStateObj)];
        }

        return result;
      },
      {}
    );

    await copyFavoriteOptionsToEntities(
      host,
      hass,
      domain,
      compatibleEntities.map((entity) => entity.entity_id),
      options
    );
  },
});

const coverFavoritesHandler = createNumericFavoritesDialogHandler<CoverEntity>({
  domain: "cover",
  supports: coverSupportsAnyPosition,
  specs: [
    {
      option: "favorite_positions",
      supports: coverSupportsPosition,
      getStoredFavorites: (entry) => entry.options?.cover?.favorite_positions,
      getFavorites: (entry) =>
        normalizeCoverFavoritePositions(
          entry.options?.cover?.favorite_positions ??
            DEFAULT_COVER_FAVORITE_POSITIONS
        ),
    },
    {
      option: "favorite_tilt_positions",
      supports: coverSupportsTiltPosition,
      getStoredFavorites: (entry) =>
        entry.options?.cover?.favorite_tilt_positions,
      getFavorites: (entry) =>
        normalizeCoverFavoritePositions(
          entry.options?.cover?.favorite_tilt_positions ??
            DEFAULT_COVER_FAVORITE_POSITIONS
        ),
    },
  ],
});

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

const valveFavoritesHandler = createNumericFavoritesDialogHandler<ValveEntity>({
  domain: "valve",
  supports: valveSupportsPosition,
  specs: [
    {
      option: "favorite_positions",
      supports: valveSupportsPosition,
      getStoredFavorites: (entry) => entry.options?.valve?.favorite_positions,
      getFavorites: (entry) =>
        normalizeValveFavoritePositions(
          entry.options?.valve?.favorite_positions ??
            DEFAULT_VALVE_FAVORITE_POSITIONS
        ),
    },
  ],
});

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
