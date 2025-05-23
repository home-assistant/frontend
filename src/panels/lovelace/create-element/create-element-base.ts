import { fireEvent } from "../../../common/dom/fire_event";
import type {
  LovelaceSectionElement,
  LovelaceViewElement,
} from "../../../data/lovelace";
import type { LovelaceBadgeConfig } from "../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import {
  isCustomType,
  stripCustomPrefix,
} from "../../../data/lovelace_custom_cards";
import type { LovelaceCardFeatureConfig } from "../card-features/types";
import type { ErrorCardConfig } from "../cards/types";
import type { LovelaceElement, LovelaceElementConfig } from "../elements/types";
import type { LovelaceRow, LovelaceRowConfig } from "../entity-rows/types";
import type { LovelaceHeaderFooterConfig } from "../header-footer/types";
import type {
  ErrorBadgeConfig as ErrorHeadingBadgeConfig,
  LovelaceHeadingBadgeConfig,
} from "../heading-badges/types";
import type {
  LovelaceBadge,
  LovelaceBadgeConstructor,
  LovelaceCard,
  LovelaceCardConstructor,
  LovelaceCardFeature,
  LovelaceCardFeatureConstructor,
  LovelaceElementConstructor,
  LovelaceHeaderFooter,
  LovelaceHeaderFooterConstructor,
  LovelaceHeadingBadge,
  LovelaceHeadingBadgeConstructor,
  LovelaceRowConstructor,
} from "../types";
import type { ErrorBadgeConfig } from "../badges/types";

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
    constructor: LovelaceBadgeConstructor;
  };
  element: {
    config: LovelaceElementConfig;
    element: LovelaceElement;
    constructor: LovelaceElementConstructor;
  };
  row: {
    config: LovelaceRowConfig;
    element: LovelaceRow;
    constructor: LovelaceRowConstructor;
  };
  "header-footer": {
    config: LovelaceHeaderFooterConfig;
    element: LovelaceHeaderFooter;
    constructor: LovelaceHeaderFooterConstructor;
  };
  view: {
    config: LovelaceViewConfig;
    element: LovelaceViewElement;
    constructor: unknown;
  };
  "card-feature": {
    config: LovelaceCardFeatureConfig;
    element: LovelaceCardFeature;
    constructor: LovelaceCardFeatureConstructor;
  };
  section: {
    config: LovelaceSectionConfig;
    element: LovelaceSectionElement;
    constructor: unknown;
  };
  "heading-badge": {
    config: LovelaceHeadingBadgeConfig;
    element: LovelaceHeadingBadge;
    constructor: LovelaceHeadingBadgeConstructor;
  };
}

export const createErrorCardElement = (config: ErrorCardConfig) => {
  const el = document.createElement("hui-error-card");
  if (customElements.get("hui-error-card")) {
    el.setConfig(config);
  } else {
    import("../cards/hui-error-card");
    customElements.whenDefined("hui-error-card").then(() => {
      customElements.upgrade(el);
      el.setConfig(config);
    });
  }
  return el;
};

export const createErrorBadgeElement = (config: ErrorBadgeConfig) => {
  const el = document.createElement("hui-error-badge");
  if (customElements.get("hui-error-badge")) {
    el.setConfig(config);
  } else {
    import("../badges/hui-error-badge");
    customElements.whenDefined("hui-error-badge").then(() => {
      customElements.upgrade(el);
      el.setConfig(config);
    });
  }
  return el;
};

export const createErrorHeadingBadgeElement = (
  config: ErrorHeadingBadgeConfig
) => {
  const el = document.createElement("hui-error-heading-badge");
  if (customElements.get("hui-error-heading-badge")) {
    el.setConfig(config);
  } else {
    import("../heading-badges/hui-error-heading-badge");
    customElements.whenDefined("hui-error-heading-badge").then(() => {
      customElements.upgrade(el);
      el.setConfig(config);
    });
  }
  return el;
};

export const createErrorBadgeConfig = (error, origConfig) => ({
  type: "error",
  error,
  origConfig,
});

export const createErrorHeadingBadgeConfig = (error, origConfig) => ({
  type: "error",
  error,
  origConfig,
});

const _createElement = <T extends keyof CreateElementConfigTypes>(
  tag: string,
  config: CreateElementConfigTypes[T]["config"]
): CreateElementConfigTypes[T]["element"] => {
  const element = document.createElement(
    tag
  ) as CreateElementConfigTypes[T]["element"];
  // @ts-ignore
  element.setConfig(config);
  return element;
};

const _createErrorElement = <T extends keyof CreateElementConfigTypes>(
  tagSuffix: T,
  error: string,
  config: CreateElementConfigTypes[T]["config"]
): CreateElementConfigTypes[T]["element"] => {
  if (tagSuffix === "badge") {
    return createErrorBadgeElement(createErrorBadgeConfig(error, config));
  }
  if (tagSuffix === "heading-badge") {
    return createErrorHeadingBadgeElement(
      createErrorHeadingBadgeConfig(error, config)
    );
  }
  return createErrorCardElement({ type: "error" });
};

const _customCreate = <T extends keyof CreateElementConfigTypes>(
  tagSuffix: T,
  tag: string,
  config: CreateElementConfigTypes[T]["config"]
) => {
  if (customElements.get(tag)) {
    return _createElement(tag, config);
  }

  const element = _createErrorElement(
    tagSuffix,
    `Custom element doesn't exist: ${tag}.`,
    config
  );
  // Custom elements are required to have a - in the name
  if (!tag.includes("-")) {
    return element;
  }
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

const _lazyCreate = <T extends keyof CreateElementConfigTypes>(
  tag: string,
  config: CreateElementConfigTypes[T]["config"]
) => {
  if (customElements.get(tag)) {
    return _createElement(tag, config);
  }
  const element = document.createElement(
    tag
  ) as CreateElementConfigTypes[T]["element"];
  customElements.whenDefined(tag).then(() => {
    try {
      customElements.upgrade(element);
      fireEvent(element, "ll-upgrade");
      // @ts-ignore
      element.setConfig(config);
    } catch (_err: any) {
      // We let it rebuild and the error will be handled by _createElement
      fireEvent(element, "ll-rebuild");
    }
  });
  return element;
};

const _getCustomTag = (type: string) =>
  isCustomType(type) ? stripCustomPrefix(type) : undefined;

export const createLovelaceElement = <T extends keyof CreateElementConfigTypes>(
  tagSuffix: T,
  config: CreateElementConfigTypes[T]["config"],
  alwaysLoadTypes?: Set<string>,
  lazyLoadTypes?: Record<string, () => Promise<unknown>>,
  // Allow looking at "entity" in config and mapping that to a type
  domainTypes?: { _domain_not_found: string; [domain: string]: string },
  // Default type if no type given. If given, entity types will not work.
  defaultType?: string
): CreateElementConfigTypes[T]["element"] => {
  try {
    return tryCreateLovelaceElement(
      tagSuffix,
      config,
      alwaysLoadTypes,
      lazyLoadTypes,
      domainTypes,
      defaultType
    );
  } catch (err: any) {
    // eslint-disable-next-line
    console.error(tagSuffix, config.type, err);
    return _createErrorElement(tagSuffix, err.message, config);
  }
};

export const tryCreateLovelaceElement = <
  T extends keyof CreateElementConfigTypes,
>(
  tagSuffix: T,
  config: CreateElementConfigTypes[T]["config"],
  alwaysLoadTypes?: Set<string>,
  lazyLoadTypes?: Record<string, () => Promise<unknown>>,
  // Allow looking at "entity" in config and mapping that to a type
  domainTypes?: { _domain_not_found: string; [domain: string]: string },
  // Default type if no type given. If given, entity types will not work.
  defaultType?: string
): CreateElementConfigTypes[T]["element"] => {
  if (!config || typeof config !== "object") {
    throw new Error("Config is not an object");
  }

  if (
    !config.type &&
    !defaultType &&
    // If domain types is given, we can derive a type from "entity"
    (!domainTypes || !("entity" in config))
  ) {
    throw new Error("No card type configured");
  }

  const customTag = config.type ? _getCustomTag(config.type) : undefined;

  if (customTag) {
    return _customCreate(tagSuffix, customTag, config);
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
    throw new Error("No type specified");
  }

  const tag = `hui-${type}-${tagSuffix}`;

  if (lazyLoadTypes && type in lazyLoadTypes) {
    lazyLoadTypes[type]();
    return _lazyCreate(tag, config);
  }

  if (alwaysLoadTypes && alwaysLoadTypes.has(type)) {
    return _createElement(tag, config);
  }

  throw new Error(`Unknown type encountered: ${type}`);
};

export const getLovelaceElementClass = async <
  T extends keyof CreateElementConfigTypes,
>(
  type: string,
  tagSuffix: T,
  alwaysLoadTypes?: Set<string>,
  lazyLoadTypes?: Record<string, () => Promise<unknown>>
): Promise<CreateElementConfigTypes[T]["constructor"]> => {
  const customTag = _getCustomTag(type);

  if (customTag) {
    const customCls = customElements.get(customTag);
    if (customCls) {
      return customCls;
    }

    // Custom elements are required to have a - in the name
    if (!customTag.includes("-")) {
      throw new Error(`Custom element not found: ${customTag}`);
    }

    return new Promise((resolve, reject) => {
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
