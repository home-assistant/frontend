import {
  LovelaceCardConfig,
  LovelaceBadgeConfig,
} from "../../../data/lovelace";
import {
  HuiErrorCard,
  createErrorCardElement,
  createErrorCardConfig,
} from "../cards/hui-error-card";
import { LovelaceCard, LovelaceBadge, LovelaceHeaderFooter } from "../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { LovelaceElementConfig, LovelaceElement } from "../elements/types";
import { LovelaceRow, LovelaceRowConfig } from "../entity-rows/types";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";

const CUSTOM_TYPE_PREFIX = "custom:";
const TIMEOUT = 2000;

interface CreateElementConfigTypes {
  card: { config: LovelaceCardConfig; element: LovelaceCard };
  badge: { config: LovelaceBadgeConfig; element: LovelaceBadge };
  element: { config: LovelaceElementConfig; element: LovelaceElement };
  row: { config: LovelaceRowConfig; element: LovelaceRow };
  "header-footer": {
    config: LovelaceHeaderFooterConfig;
    element: LovelaceHeaderFooter;
  };
}

const _createElement = <T extends keyof CreateElementConfigTypes>(
  tag: string,
  config: CreateElementConfigTypes[T]["config"]
): CreateElementConfigTypes[T]["element"] | HuiErrorCard => {
  const element = document.createElement(
    tag
  ) as CreateElementConfigTypes[T]["element"];
  try {
    // @ts-ignore
    element.setConfig(config);
  } catch (err) {
    // tslint:disable-next-line
    console.error(tag, err);
    return _createErrorElement(err.message, config);
  }
  return element;
};

const _createErrorElement = <T extends keyof CreateElementConfigTypes>(
  error: string,
  config: CreateElementConfigTypes[T]["config"]
): HuiErrorCard => createErrorCardElement(createErrorCardConfig(error, config));

const _maybeCreate = <T extends keyof CreateElementConfigTypes>(
  tag: string,
  config: CreateElementConfigTypes[T]["config"]
) => {
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
};

export const createLovelaceElement = <T extends keyof CreateElementConfigTypes>(
  tagSuffix: T,
  config: CreateElementConfigTypes[T]["config"],
  elementTypes: Set<string>,
  // Allow looking at "entity" in config and mapping that to a type
  domainTypes?: { _domain_not_found: string; [domain: string]: string },
  // Default type if no type given. If given, entity types will not work.
  defaultType?: string,
  lazyLoadTypes?: { [domain: string]: () => unknown }
): CreateElementConfigTypes[T]["element"] | HuiErrorCard => {
  if (!config || typeof config !== "object") {
    return _createErrorElement("Config is not an object", config);
  }

  if (
    !config.type &&
    !defaultType &&
    // If domain types is given, we can derive a type from "entity"
    (!domainTypes || !("entity" in config))
  ) {
    return _createErrorElement("No card type configured.", config);
  }

  if (config.type && config.type.startsWith(CUSTOM_TYPE_PREFIX)) {
    return _maybeCreate(config.type.substr(CUSTOM_TYPE_PREFIX.length), config);
  }

  // config.type has priority over config.entity, but defaultType has not.
  // @ts-ignore
  if (domainTypes && !config.type && config.entity) {
    // @ts-ignore
    const domain = config.entity.split(".", 1)[0];
    return _createElement(
      `hui-${domainTypes![domain] ||
        domainTypes!._domain_not_found}-entity-${tagSuffix}`,
      config
    );
  }

  const type = config.type || defaultType;

  if (type === undefined) {
    return _createErrorElement(`No type specified`, config);
  }

  const tag = `hui-${type}-${tagSuffix}`;

  if (lazyLoadTypes && type in lazyLoadTypes) {
    lazyLoadTypes[type]();
    return _maybeCreate(tag, config);
  }

  if (elementTypes.has(type)) {
    return _createElement(tag, config);
  }

  return _createErrorElement(`Unknown type encountered: ${type}.`, config);
};
