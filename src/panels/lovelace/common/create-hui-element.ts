import deepClone from "deep-clone-simple";

import "../elements/hui-conditional-element";
import "../elements/hui-icon-element";
import "../elements/hui-image-element";
import "../elements/hui-service-button-element";
import "../elements/hui-state-badge-element";
import "../elements/hui-state-icon-element";
import "../elements/hui-state-label-element";

import { fireEvent } from "../../../common/dom/fire_event";
import {
  createErrorCardElement,
  createErrorCardConfig,
  HuiErrorCard,
} from "../cards/hui-error-card";
import { LovelaceElementConfig, LovelaceElement } from "../elements/types";

const CUSTOM_TYPE_PREFIX = "custom:";
const ELEMENT_TYPES = new Set([
  "conditional",
  "icon",
  "image",
  "service-button",
  "state-badge",
  "state-icon",
  "state-label",
]);
const TIMEOUT = 2000;

const _createElement = (
  tag: string,
  config: LovelaceElementConfig
): LovelaceElement | HuiErrorCard => {
  const element = document.createElement(tag) as LovelaceElement;
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
  config: LovelaceElementConfig
): HuiErrorCard => createErrorCardElement(createErrorCardConfig(error, config));

function _hideErrorElement(element) {
  element.style.display = "None";
  return window.setTimeout(() => {
    element.style.display = "";
  }, TIMEOUT);
}

export const createHuiElement = (
  config: LovelaceElementConfig
): LovelaceElement | HuiErrorCard => {
  if (!config || typeof config !== "object" || !config.type) {
    return _createErrorElement("No element type configured.", config);
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
    const timer = _hideErrorElement(element);

    customElements.whenDefined(tag).then(() => {
      clearTimeout(timer);
      fireEvent(element, "ll-rebuild");
    });

    return element;
  }

  if (!ELEMENT_TYPES.has(config.type)) {
    return _createErrorElement(
      `Unknown element type encountered: ${config.type}.`,
      config
    );
  }

  return _createElement(`hui-${config.type}-element`, config);
};
