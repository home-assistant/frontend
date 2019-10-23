import "../badges/hui-entity-filter-badge";
import "../badges/hui-state-label-badge";

import {
  createErrorBadgeElement,
  createErrorBadgeConfig,
  HuiErrorBadge,
} from "../badges/hui-error-badge";
import { LovelaceBadge } from "../types";
import { LovelaceBadgeConfig } from "../../../data/lovelace";
import { fireEvent } from "../../../common/dom/fire_event";

const BADGE_TYPES = new Set(["entity-filter", "error", "state-label"]);
const CUSTOM_TYPE_PREFIX = "custom:";
const TIMEOUT = 2000;

const _createElement = (
  tag: string,
  config: LovelaceBadgeConfig
): LovelaceBadge => {
  const element = document.createElement(tag) as LovelaceBadge;
  try {
    element.setConfig(config);
  } catch (err) {
    // tslint:disable-next-line
    console.error(tag, err);
    return _createErrorElement(err.message);
  }
  return element;
};

const _createErrorElement = (error: string): HuiErrorBadge =>
  createErrorBadgeElement(createErrorBadgeConfig(error));

export const createBadgeElement = (
  config: LovelaceBadgeConfig
): LovelaceBadge => {
  if (!config || typeof config !== "object") {
    return _createErrorElement("No config");
  }

  let type = config.type;

  if (!type) {
    type = "state-label";
  }

  if (type.startsWith(CUSTOM_TYPE_PREFIX)) {
    const tag = type.substr(CUSTOM_TYPE_PREFIX.length);

    if (customElements.get(tag)) {
      return _createElement(tag, config);
    }
    const element = _createErrorElement(`Type doesn't exist: ${tag}`);
    element.style.display = "None";
    const timer = window.setTimeout(() => {
      element.style.display = "";
    }, TIMEOUT);

    customElements.whenDefined(tag).then(() => {
      clearTimeout(timer);
      fireEvent(element, "ll-badge-rebuild");
    });

    return element;
  }

  if (!BADGE_TYPES.has(type)) {
    return _createErrorElement(`Unknown type: ${type}`);
  }

  return _createElement(`hui-${type}-badge`, config);
};
