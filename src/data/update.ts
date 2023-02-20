import type {
  HassEntities,
  HassEntityAttributeBase,
  HassEntityBase,
  HassEvent,
} from "home-assistant-js-websocket";
import { BINARY_STATE_ON } from "../common/const";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import {
  supportsFeature,
  supportsFeatureFromAttributes,
} from "../common/entity/supports-feature";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../types";
import { showToast } from "../util/toast";

export const UPDATE_SUPPORT_INSTALL = 1;
export const UPDATE_SUPPORT_SPECIFIC_VERSION = 2;
export const UPDATE_SUPPORT_PROGRESS = 4;
export const UPDATE_SUPPORT_BACKUP = 8;
export const UPDATE_SUPPORT_RELEASE_NOTES = 16;

interface UpdateEntityAttributes extends HassEntityAttributeBase {
  auto_update: boolean | null;
  installed_version: string | null;
  in_progress: boolean | number;
  latest_version: string | null;
  release_summary: string | null;
  release_url: string | null;
  skipped_version: string | null;
  title: string | null;
}

export interface UpdateEntity extends HassEntityBase {
  attributes: UpdateEntityAttributes;
}

export const updateUsesProgress = (entity: UpdateEntity): boolean =>
  updateUsesProgressFromAttributes(entity.attributes);

export const updateUsesProgressFromAttributes = (attributes: {
  [key: string]: any;
}): boolean =>
  supportsFeatureFromAttributes(attributes, UPDATE_SUPPORT_PROGRESS) &&
  typeof attributes.in_progress === "number";

export const updateCanInstall = (
  entity: UpdateEntity,
  showSkipped = false
): boolean =>
  (entity.state === BINARY_STATE_ON ||
    (showSkipped && Boolean(entity.attributes.skipped_version))) &&
  supportsFeature(entity, UPDATE_SUPPORT_INSTALL);

export const updateIsInstalling = (entity: UpdateEntity): boolean =>
  updateUsesProgress(entity) || !!entity.attributes.in_progress;

export const updateIsInstallingFromAttributes = (attributes: {
  [key: string]: any;
}): boolean =>
  updateUsesProgressFromAttributes(attributes) || !!attributes.in_progress;

export const updateReleaseNotes = (hass: HomeAssistant, entityId: string) =>
  hass.callWS<string | null>({
    type: "update/release_notes",
    entity_id: entityId,
  });

export const filterUpdateEntities = (
  entities: HassEntities,
  language?: string
) =>
  (
    Object.values(entities).filter(
      (entity) => computeStateDomain(entity) === "update"
    ) as UpdateEntity[]
  ).sort((a, b) => {
    if (a.attributes.title === "Home Assistant Core") {
      return -3;
    }
    if (b.attributes.title === "Home Assistant Core") {
      return 3;
    }
    if (a.attributes.title === "Home Assistant Operating System") {
      return -2;
    }
    if (b.attributes.title === "Home Assistant Operating System") {
      return 2;
    }
    if (a.attributes.title === "Home Assistant Supervisor") {
      return -1;
    }
    if (b.attributes.title === "Home Assistant Supervisor") {
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
    setTimeout(r, 10000);
  });

  unsubscribeEvents();

  if (updated === 0) {
    showToast(element, {
      message: hass.localize("ui.panel.config.updates.no_new_updates"),
    });
  }
};
