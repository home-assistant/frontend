import type {
  HassEntities,
  HassEntityAttributeBase,
  HassEntityBase,
  HassEvent,
} from "home-assistant-js-websocket";
import { BINARY_STATE_ON, BINARY_STATE_OFF } from "../common/const";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { supportsFeature } from "../common/entity/supports-feature";
import { formatNumber } from "../common/number/format_number";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../types";
import { showToast } from "../util/toast";
import type { EntitySources } from "./entity_sources";

export enum UpdateEntityFeature {
  INSTALL = 1,
  SPECIFIC_VERSION = 2,
  PROGRESS = 4,
  BACKUP = 8,
  RELEASE_NOTES = 16,
}

interface UpdateEntityAttributes extends HassEntityAttributeBase {
  auto_update: boolean | null;
  display_precision: number;
  installed_version: string | null;
  in_progress: boolean;
  latest_version: string | null;
  release_summary: string | null;
  release_url: string | null;
  skipped_version: string | null;
  title: string | null;
  update_percentage: number | null;
}

export interface UpdateEntity extends HassEntityBase {
  attributes: UpdateEntityAttributes;
}

export const updateUsesProgress = (entity: UpdateEntity): boolean =>
  supportsFeature(entity, UpdateEntityFeature.PROGRESS) &&
  entity.attributes.update_percentage !== null;

export const updateCanInstall = (
  entity: UpdateEntity,
  showSkipped = false
): boolean =>
  (entity.state === BINARY_STATE_ON ||
    (showSkipped && Boolean(entity.attributes.skipped_version))) &&
  supportsFeature(entity, UpdateEntityFeature.INSTALL);

export const latestVersionIsSkipped = (entity: UpdateEntity): boolean =>
  !!(
    entity.attributes.latest_version &&
    entity.attributes.skipped_version === entity.attributes.latest_version
  );

export const updateButtonIsDisabled = (entity: UpdateEntity): boolean =>
  entity.state === BINARY_STATE_OFF && !latestVersionIsSkipped(entity);

export const updateIsInstalling = (entity: UpdateEntity): boolean =>
  !!entity.attributes.in_progress;

export const updateReleaseNotes = (hass: HomeAssistant, entityId: string) =>
  hass.callWS<string | null>({
    type: "update/release_notes",
    entity_id: entityId,
  });

const HOME_ASSISTANT_CORE_TITLE = "Home Assistant Core";
const HOME_ASSISTANT_SUPERVISOR_TITLE = "Home Assistant Supervisor";
const HOME_ASSISTANT_OS_TITLE = "Home Assistant Operating System";

export const filterUpdateEntities = (
  entities: HassEntities,
  language?: string
) =>
  (
    Object.values(entities).filter(
      (entity) => computeStateDomain(entity) === "update"
    ) as UpdateEntity[]
  ).sort((a, b) => {
    if (a.attributes.title === HOME_ASSISTANT_CORE_TITLE) {
      return -3;
    }
    if (b.attributes.title === HOME_ASSISTANT_CORE_TITLE) {
      return 3;
    }
    if (a.attributes.title === HOME_ASSISTANT_OS_TITLE) {
      return -2;
    }
    if (b.attributes.title === HOME_ASSISTANT_OS_TITLE) {
      return 2;
    }
    if (a.attributes.title === HOME_ASSISTANT_SUPERVISOR_TITLE) {
      return -1;
    }
    if (b.attributes.title === HOME_ASSISTANT_SUPERVISOR_TITLE) {
      return 1;
    }
    return caseInsensitiveStringCompare(
      a.attributes.title || a.attributes.friendly_name || "",
      b.attributes.title || b.attributes.friendly_name || "",
      language
    );
  });

export const filterUpdateEntitiesWithInstall = (
  entities: HassEntities,
  showSkipped = false
) =>
  filterUpdateEntities(entities).filter((entity) =>
    updateCanInstall(entity, showSkipped)
  );

export const checkForEntityUpdates = async (
  element: HTMLElement,
  hass: HomeAssistant
) => {
  const entities = filterUpdateEntities(hass.states, hass.locale.language).map(
    (entity) => entity.entity_id
  );

  if (!entities.length) {
    showAlertDialog(element, {
      title: hass.localize("ui.panel.config.updates.no_update_entities.title"),
      text: hass.localize(
        "ui.panel.config.updates.no_update_entities.description"
      ),
      warning: true,
    });
    return;
  }

  showToast(element, {
    message: hass.localize("ui.panel.config.updates.checking_updates"),
  });

  let updated = 0;

  const unsubscribeEvents = await hass.connection.subscribeEvents<HassEvent>(
    (event) => {
      if (computeDomain(event.data.entity_id) === "update") {
        updated++;
        showToast(element, {
          message: hass.localize("ui.panel.config.updates.updates_refreshed", {
            count: updated,
          }),
        });
      }
    },
    "state_changed"
  );

  await hass.callService("homeassistant", "update_entity", {
    entity_id: entities,
  });

  // there is no reliable way to know if all the updates are done updating, so we just wait a bit for now...
  await new Promise((r) => {
    setTimeout(r, 15000);
  });

  unsubscribeEvents();

  if (updated === 0) {
    showToast(element, {
      message: hass.localize("ui.panel.config.updates.no_new_updates"),
    });
  }
};

// When updating, and entity does not support % show "Installing"
// When updating, and entity does support % show "Installing (xx%)"
// When update available, show "Update available"
// When the latest version is skipped, show the latest version
// When update is not available, show "Up-to-date"
// When update is not available and there is no latest_version show "Unavailable"
export const computeUpdateStateDisplay = (
  stateObj: UpdateEntity,
  hass: HomeAssistant
): string => {
  const state = stateObj.state;
  const attributes = stateObj.attributes;

  if (state === "off") {
    const isSkipped =
      attributes.latest_version &&
      attributes.skipped_version === attributes.latest_version;
    if (isSkipped) {
      return attributes.latest_version!;
    }
    return hass.formatEntityState(stateObj);
  }

  if (state === "on") {
    if (updateIsInstalling(stateObj)) {
      const supportsProgress =
        supportsFeature(stateObj, UpdateEntityFeature.PROGRESS) &&
        attributes.update_percentage !== null;
      if (supportsProgress) {
        return hass.localize("ui.card.update.installing_with_progress", {
          progress: formatNumber(attributes.update_percentage!, hass.locale, {
            maximumFractionDigits: attributes.display_precision,
            minimumFractionDigits: attributes.display_precision,
          }),
        });
      }
      return hass.localize("ui.card.update.installing");
    }
  }

  return hass.formatEntityState(stateObj);
};

export type UpdateType =
  | "addon"
  | "home_assistant"
  | "home_assistant_os"
  | "generic";

export const getUpdateType = (
  stateObj: UpdateEntity,
  entitySources: EntitySources
): UpdateType => {
  const entity_id = stateObj.entity_id;
  const domain = entitySources[entity_id]?.domain;

  if (domain !== "hassio") {
    return "generic";
  }

  const title = stateObj.attributes.title || "";
  if (title === HOME_ASSISTANT_CORE_TITLE) {
    return "home_assistant";
  }

  if (title === HOME_ASSISTANT_OS_TITLE) {
    return "home_assistant_os";
  }

  if (title !== HOME_ASSISTANT_SUPERVISOR_TITLE) {
    return "addon";
  }
  return "generic";
};
