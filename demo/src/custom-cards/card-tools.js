/* eslint-disable */
import { html, LitElement } from "lit";

if (!window.cardTools) {
  const version = 0.2;
  const CUSTOM_TYPE_PREFIX = "custom:";

  let cardTools = {};

  cardTools.v = version;

  cardTools.checkVersion = (v) => {
    if (version < v) {
      throw new Error(
        `Old version of card-tools found. Get the latest version of card-tools.js from https://github.com/thomasloven/lovelace-card-tools`
      );
    }
  };

  cardTools.LitElement = LitElement;

  cardTools.litHtml = html;

  cardTools.hass = () => {
    return document.querySelector("home-assistant").hass;
  };

  cardTools.fireEvent = (ev, detail) => {
    ev = new Event(ev, {
      bubbles: true,
      cancelable: false,
      composed: true,
    });
    ev.detail = detail || {};
    document.querySelector("ha-demo").dispatchEvent(ev);
  };

  cardTools.createThing = (thing, config) => {
    const _createThing = (tag, config) => {
      const element = document.createElement(tag);
      try {
        element.setConfig(config);
      } catch (err) {
        console.error(tag, err);
        return _createError(err.message, config);
      }
      return element;
    };

    const _createError = (error, config) => {
      return _createThing("hui-error-card", {
        type: "error",
        error,
        config,
      });
    };

    if (!config || typeof config !== "object" || !config.type)
      return _createError(`No ${thing} type configured`, config);
    let tag = config.type;
    if (config.error) {
      const err = config.error;
      delete config.error;
      return _createError(err, config);
    }
    if (tag.startsWith(CUSTOM_TYPE_PREFIX))
      tag = tag.substr(CUSTOM_TYPE_PREFIX.length);
    else tag = `hui-${tag}-${thing}`;

    if (customElements.get(tag)) return _createThing(tag, config);

    // If element doesn't exist (yet) create an error
    const element = _createError(
      `Custom element doesn't exist: ${tag}.`,
      config
    );
    element.style.display = "None";
    const time = setTimeout(() => {
      element.style.display = "";
    }, 2000);
    // Remove error if element is defined later
    customElements.whenDefined(tag).then(() => {
      clearTimeout(timer);
      cardTools.fireEvent("rebuild-view");
    });

    return element;
  };

  cardTools.createCard = (config) => {
    return cardTools.createThing("card", config);
  };

  cardTools.createElement = (config) => {
    return cardTools.createThing("element", config);
  };

  cardTools.createEntityRow = (config) => {
    const SPECIAL_TYPES = new Set([
      "call-service",
      "divider",
      "section",
      "weblink",
    ]);
    const DEFAULT_ROWS = {
      alert: "toggle",
      automation: "toggle",
      climate: "toggle",
      cover: "cover",
      fan: "toggle",
      group: "group",
      input_boolean: "toggle",
      input_number: "input-number",
      input_select: "input-select",
      input_text: "input-text",
      light: "toggle",
      media_player: "media-player",
      lock: "lock",
      scene: "scene",
      script: "script",
      sensor: "sensor",
      timer: "timer",
      switch: "toggle",
      vacuum: "toggle",
    };

    if (
      !config ||
      typeof config !== "object" ||
      (!config.entity && !config.type)
    ) {
      Object.assign(config, { error: "Invalid config given" });
      return cardTools.createThing("", config);
    }

    const type = config.type || "default";
    if (SPECIAL_TYPES.has(type) || type.startsWith(CUSTOM_TYPE_PREFIX))
      return cardTools.createThing("row", config);

    const domain = config.entity.split(".", 1)[0];
    Object.assign(config, { type: DEFAULT_ROWS[domain] || "simple" });
    return cardTools.createThing("entity-row", config);
  };

  cardTools.deviceID = (() => {
    const ID_STORAGE_KEY = "lovelace-player-device-id";
    if (window["fully"] && typeof fully.getDeviceId === "function")
      return fully.getDeviceId();
    if (!localStorage[ID_STORAGE_KEY]) {
      const s4 = () => {
        return Math.floor((1 + Math.random()) * 100000)
          .toString(16)
          .substring(1);
      };
      localStorage[ID_STORAGE_KEY] = `${s4()}${s4()}-${s4()}${s4()}`;
    }
    return localStorage[ID_STORAGE_KEY];
  })();

  cardTools.moreInfo = (entity) => {
    cardTools.fireEvent("hass-more-info", { entityId: entity });
  };

  cardTools.longpress = (element) => {
    customElements.whenDefined("action-handler").then(() => {
      const longpress = document.body.querySelector("action-handler");
      longpress.bind(element);
    });
    return element;
  };

  cardTools.hasTemplate = (text) => {
    return /\[\[\s+.*\s+\]\]/.test(text);
  };

  cardTools.parseTemplate = (text, error) => {
    const _parse = (str) => {
      try {
        str = str.replace(/^\[\[\s+|\s+\]\]$/g, "");
        const parts = str.split(".");
        let v = cardTools.hass().states[`${parts[0]}.${parts[1]}`];
        parts.shift();
        parts.shift();
        parts.forEach((item) => (v = v[item]));
        return v;
      } catch (err) {
        return error || `[[ Template matching failed ${str} ]]`;
      }
    };
    text = text.replace(/(\[\[\s.*?\s\]\])/g, (str, p1, offset, s) =>
      _parse(str)
    );
    return text;
  };

  window.cardTools = cardTools;
  cardTools.fireEvent("rebuild-view");
}
