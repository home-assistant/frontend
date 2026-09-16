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
  DEFAULT_LIGHT_FAVORITE_BRIGHTNESS,
  LightColorMode,
  computeDefaultFavoriteColors,
  lightSupportsBrightness,
  lightSupportsColor,
  lightSupportsColorMode,
  lightSupportsFavoriteColors,
} from "../../data/light";
import type { TimerEntity } from "../../data/timer";
import { normalizeTimerPresets } from "../../data/timer";
import type { ValveEntity } from "../../data/valve";
import {
  DEFAULT_VALVE_FAVORITE_POSITIONS,
  valveSupportsPosition,
} from "../../data/valve";
import { normalizeFavoritePositions } from "../../data/favorite_positions";
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
  // Omitted means there is always something to copy (domains with defaults).
  canCopy?: (entry: ExtEntityRegistryEntry) => boolean;
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
  .map((item) => item.reason.message || item.reason.code || item.reason)
  .join("\r\n")}</pre>`,
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
        normalizeFavoritePositions(
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
        normalizeFavoritePositions(
          entry.options?.cover?.favorite_tilt_positions ??
            DEFAULT_COVER_FAVORITE_POSITIONS
        ),
    },
  ],
});

const lightBrightnessFavoritesSpec: NumericFavoritesSpec<LightEntity> = {
  option: "favorite_brightness",
  supports: lightSupportsBrightness,
  getStoredFavorites: (entry) => entry.options?.light?.favorite_brightness,
  getFavorites: (entry) =>
    normalizeFavoritePositions(
      entry.options?.light?.favorite_brightness ??
        DEFAULT_LIGHT_FAVORITE_BRIGHTNESS,
      { min: 1 }
    ),
};

export const isLightCompatibleForFavoritesCopy = (
  candidate: HassEntity,
  sourceEntityId: string,
  supportsColorFavorites: boolean,
  supportsBrightnessFavorites: boolean,
  favoriteColorTypes: string[]
): boolean => {
  const candidateLight = candidate as LightEntity;

  return (
    candidate.entity_id !== sourceEntityId &&
    computeStateDomain(candidate) === "light" &&
    supportsColorFavorites === lightSupportsFavoriteColors(candidateLight) &&
    supportsBrightnessFavorites === lightSupportsBrightness(candidateLight) &&
    (!supportsColorFavorites ||
      favoriteColorTypes.every((type) =>
        type === "color_temp_kelvin"
          ? lightSupportsColorMode(candidateLight, LightColorMode.COLOR_TEMP)
          : type === "hs_color" || type === "rgb_color"
            ? lightSupportsColor(candidateLight)
            : type === "rgbw_color"
              ? lightSupportsColorMode(candidateLight, LightColorMode.RGBW)
              : type === "rgbww_color"
                ? lightSupportsColorMode(candidateLight, LightColorMode.RGBWW)
                : false
      ))
  );
};

const lightFavoritesHandler: FavoritesDialogHandler = {
  domain: "light",
  supports: (stateObj) =>
    lightSupportsFavoriteColors(stateObj as LightEntity) ||
    lightBrightnessFavoritesSpec.supports(stateObj as LightEntity),
  // Colors have no numeric-favorites spec object (they're not a plain number[]
  // favorite), so they're read inline here. Brightness routes through
  // lightBrightnessFavoritesSpec since a dedicated spec object exists for it.
  hasCustomFavorites: (entry) =>
    hasCustomFavoriteOptionValues(entry.options?.light?.favorite_colors) ||
    hasCustomFavoriteOptionValues(
      lightBrightnessFavoritesSpec.getStoredFavorites(entry)
    ),
  // Both keys are always cleared regardless of current capability: a stale
  // stored value can exist for an option the light no longer supports (e.g.
  // after a hardware/firmware change), and Reset should clear it too.
  getResetOptions: (_stateObj) => ({
    favorite_colors: undefined,
    favorite_brightness: undefined,
  }),
  getLabels: (hass) => getFavoritesDialogLabels(hass, "light"),
  copy: async ({ entry, hass, host, stateObj }) => {
    const lightStateObj = stateObj as LightEntity;
    const supportsColorFavorites = lightSupportsFavoriteColors(lightStateObj);
    const supportsBrightnessFavorites =
      lightBrightnessFavoritesSpec.supports(lightStateObj);

    const favoriteColors: LightColor[] =
      entry.options?.light?.favorite_colors ??
      computeDefaultFavoriteColors(lightStateObj);

    const favoriteColorTypes = [
      ...new Set(favoriteColors.map((item) => Object.keys(item)[0])),
    ];

    const compatibleLights = Object.values(hass.states).filter((candidate) =>
      isLightCompatibleForFavoritesCopy(
        candidate,
        lightStateObj.entity_id,
        supportsColorFavorites,
        supportsBrightnessFavorites,
        favoriteColorTypes
      )
    );

    const options: Partial<Record<FavoriteOption, LightColor[] | number[]>> =
      {};

    if (supportsColorFavorites) {
      options.favorite_colors = favoriteColors;
    }

    if (supportsBrightnessFavorites) {
      options.favorite_brightness = lightBrightnessFavoritesSpec.getFavorites(
        entry,
        lightStateObj
      );
    }

    await copyFavoriteOptionsToEntities(
      host,
      hass,
      "light",
      compatibleLights.map((light) => light.entity_id),
      options
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
        normalizeFavoritePositions(
          entry.options?.valve?.favorite_positions ??
            DEFAULT_VALVE_FAVORITE_POSITIONS
        ),
    },
  ],
});

const timerFavoritesHandler: FavoritesDialogHandler = {
  ...createNumericFavoritesDialogHandler<TimerEntity>({
    domain: "timer",
    supports: () => true,
    specs: [
      {
        option: "presets",
        supports: () => true,
        getStoredFavorites: (entry) => entry.options?.timer?.presets,
        getFavorites: (entry) =>
          normalizeTimerPresets(entry.options?.timer?.presets),
      },
    ],
  }),
  // No default presets, so an empty timer has nothing to copy.
  canCopy: (entry) =>
    normalizeTimerPresets(entry.options?.timer?.presets).length > 0,
};

const FAVORITES_DIALOG_HANDLERS: Record<
  FavoritesDomain,
  FavoritesDialogHandler
> = {
  cover: coverFavoritesHandler,
  light: lightFavoritesHandler,
  valve: valveFavoritesHandler,
  timer: timerFavoritesHandler,
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
