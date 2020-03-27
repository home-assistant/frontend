import {
  LovelaceCardConfig,
  LovelaceBadgeConfig,
} from "../../../data/lovelace";
import {
  HuiErrorCard,
  createErrorCardElement,
  createErrorCardConfig,
} from "../cards/hui-error-card";
import {
  LovelaceCard,
  LovelaceBadge,
  LovelaceHeaderFooter,
  LovelaceCardConstructor,
} from "../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { LovelaceElementConfig, LovelaceElement } from "../elements/types";
import { LovelaceRow, LovelaceRowConfig } from "../entity-rows/types";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";

export const CUSTOM_TYPE_PREFIX = "custom:";
const TIMEOUT = 2000;

interface CreateElementConfigTypes {
  card: {
    config: LovelaceCardConfig;
    element: LovelaceCard;
    constructor: LovelaceCardConstructor;
  };
  badge: {
    config: LovelaceBadgeConfig;
    element: LovelaceBadge;
    constructor: unknown;
  };
  element: {
    config: LovelaceElementConfig;
    element: LovelaceElement;
    constructor: unknown;
  };
  row: {
    config: LovelaceRowConfig;
    element: LovelaceRow;
    constructor: unknown;
  };
  "header-footer": {
    config: LovelaceHeaderFooterConfig;
    element: LovelaceHeaderFooter;
    constructor: unknown;
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

const _getCustomTag = (type: string) =>
  type.startsWith(CUSTOM_TYPE_PREFIX)
    ? type.substr(CUSTOM_TYPE_PREFIX.length)
    : undefined;

export const createLovelaceElement = <T extends keyof CreateElementConfigTypes>(
  tagSuffix: T,
  config: CreateElementConfigTypes[T]["config"],
  alwaysLoadTypes?: Set<string>,
  lazyLoadTypes?: { [domain: string]: () => Promise<unknown> },
  // Allow looking at "entity" in config and mapping that to a type
  domainTypes?: { _domain_not_found: string; [domain: string]: string },
  // Default type if no type given. If given, entity types will not work.
  defaultType?: string
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

  const customTag = config.type ? _getCustomTag(config.type) : undefined;

  if (customTag) {
    return _maybeCreate(customTag, config);
  }

  let type: string | undefined;

  // config.type has priority over config.entity, but defaultType has not.
  // @ts-ignore
  if (domainTypes && !config.type && config.entity) {
    // @ts-ignore
    const domain = config.entity.split(".", 1)[0];
    type = `${domainTypes![domain] || domainTypes!._domain_not_found}-entity`;
  } else {
    type = config.type || defaultType;
  }

  if (type === undefined) {
    return _createErrorElement(`No type specified`, config);
  }

  const tag = `hui-${type}-${tagSuffix}`;

  if (lazyLoadTypes && type in lazyLoadTypes) {
    lazyLoadTypes[type]();
    return _maybeCreate(tag, config);
  }

  if (alwaysLoadTypes && alwaysLoadTypes.has(type)) {
    return _createElement(tag, config);
  }

  return _createErrorElement(`Unknown type encountered: ${type}.`, config);
};

export const getLovelaceElementClass = async <
  T extends keyof CreateElementConfigTypes
>(
  type: string,
  tagSuffix: T,
  alwaysLoadTypes?: Set<string>,
  lazyLoadTypes?: { [domain: string]: () => Promise<unknown> }
): Promise<CreateElementConfigTypes[T]["constructor"]> => {
  const customTag = _getCustomTag(type);

  if (customTag) {
    const customCls = customElements.get(customTag);
    return customCls
      ? customCls
      : new Promise((resolve, reject) => {
          // We will give custom components up to TIMEOUT seconds to get defined
          setTimeout(
            () => reject(new Error(`Custom element not found: ${customTag}`)),
            TIMEOUT
          );

          customElements
            .whenDefined(customTag)
            .then(() => resolve(customElements.get(customTag)));
        });
  }

  const tag = `hui-${type}-${tagSuffix}`;
  const cls = customElements.get(tag);

  if (alwaysLoadTypes && alwaysLoadTypes.has(type)) {
    return cls;
  }

  if (lazyLoadTypes && type in lazyLoadTypes) {
    return cls || lazyLoadTypes[type]().then(() => customElements.get(tag));
  }

  throw new Error(`Unknown type: ${type}`);
};
