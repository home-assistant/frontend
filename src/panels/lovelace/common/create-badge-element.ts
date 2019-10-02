import deepClone from "deep-clone-simple";

import { fireEvent } from "../../../common/dom/fire_event";

import "../badges/hui-entity-filter-badge";
import {
  createErrorBadgeElement,
  createErrorBadgeConfig,
  HuiErrorBadge,
} from "../badges/hui-error-badge";
import "../badges/hui-state-label-badge";
import { LovelaceBadge } from "../types";
import { LovelaceBadgeConfig } from "../../../data/lovelace";

const BADGE_TYPES = new Set(["entity-filter", "error", "state-label"]);
const CUSTOM_TYPE_PREFIX = "custom:";
const TIMEOUT = 2000;

const _createElement = (
  tag: string,
  config: LovelaceBadgeConfig
): LovelaceBadge | HuiErrorBadge => {
  const element = document.createElement(tag) as LovelaceBadge;
  try {
    element.setConfig(deepClone(config));
  } catch (err) {
    // tslint:disable-next-line
    console.error(tag, err);
    return _createErrorElement(err.message, config);
  }
  return element;
};

const _createErrorElement = (
  error: string,
  config: LovelaceBadgeConfig
): HuiErrorBadge =>
  createErrorBadgeElement(createErrorBadgeConfig(error, config));

export const createBadgeElement = (
  config: LovelaceBadgeConfig
): LovelaceBadge | HuiErrorBadge => {
  if (!config || typeof config !== "object") {
    return _createErrorElement("No badge type configured.", config);
  }

  if (!config.type) {
    config.type = "state-label";
  }

  if (config.type.startsWith(CUSTOM_TYPE_PREFIX)) {
    const tag = config.type.substr(CUSTOM_TYPE_PREFIX.length);

    if (customElements.get(tag)) {
      return _createElement(tag, config);
    }
    const element = _createErrorElement(
      `Custom element doesn't exist: ${tag}.`,
      config
    );
    element.style.display = "None";
    const timer = window.setTimeout(() => {
      element.style.display = "";
    }, TIMEOUT);

    customElements.whenDefined(tag).then(() => {
      clearTimeout(timer);
      fireEvent(element, "ll-rebuild");
    });

    return element;
  }

  if (!BADGE_TYPES.has(config.type)) {
    return _createErrorElement(
      `Unknown card type encountered: ${config.type}.`,
      config
    );
  }

  return _createElement(`hui-${config.type}-badge`, config);
};
