import deepClone from "deep-clone-simple";

import { fireEvent } from "../../../common/dom/fire_event";

import {
  createErrorCardElement,
  createErrorCardConfig,
  HuiErrorCard,
} from "../cards/hui-error-card";
import "../header-footer/hui-picture-header-footer";
import { LovelaceHeaderFooter } from "../types";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";

const CUSTOM_TYPE_PREFIX = "custom:";
const SPECIAL_TYPES = new Set(["picture"]);
const TIMEOUT = 2000;

const _createElement = (
  tag: string,
  config: LovelaceHeaderFooterConfig
): LovelaceHeaderFooter | HuiErrorCard => {
  const element = document.createElement(tag) as LovelaceHeaderFooter;
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
  config: LovelaceHeaderFooterConfig
): HuiErrorCard => createErrorCardElement(createErrorCardConfig(error, config));

const _hideErrorElement = (element) => {
  element.style.display = "None";
  return window.setTimeout(() => {
    element.style.display = "";
  }, TIMEOUT);
};

export const createHeaderFooterElement = (
  config: LovelaceHeaderFooterConfig
): LovelaceHeaderFooter | HuiErrorCard => {
  let tag;

  if (!config || typeof config !== "object" || !config.type) {
    return _createErrorElement("Invalid config given.", config);
  }

  const type = config.type || "default";
  if (SPECIAL_TYPES.has(type)) {
    return _createElement(`hui-${type}-header-footer`, config);
  }

  if (type.startsWith(CUSTOM_TYPE_PREFIX)) {
    tag = type.substr(CUSTOM_TYPE_PREFIX.length);

    if (customElements.get(tag)) {
      return _createElement(tag, config);
    }
    const element = _createErrorElement(
      `Custom element doesn't exist: ${tag}.`,
      config
    );
    const timer = _hideErrorElement(element);

    customElements.whenDefined(tag).then(() => {
      clearTimeout(timer);
      fireEvent(element, "ll-rebuild");
    });

    return element;
  }

  return _createErrorElement("Invalid config given.", config);
};
