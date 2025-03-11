import type {
  HassConfig,
  HassEntity,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { describe, it, expect } from "vitest";
import {
  computeAttributeValueDisplay,
  computeAttributeNameDisplay,
} from "../../../src/common/entity/compute_attribute_display";
import type { FrontendLocaleData } from "../../../src/data/translation";
import type { HomeAssistant } from "../../../src/types";

export const localizeMock = (key: string) => {
  const translations = {
    "state.default.unknown": "Unknown",
    "component.test_platform.entity.sensor.test_translation_key.state_attributes.attribute.state.42":
      "42",
    "component.test_platform.entity.sensor.test_translation_key.state_attributes.attribute.state.attributeValue":
      "Localized Attribute Name",
    "component.media_player.entity_component.media_player.state_attributes.attribute.state.attributeValue":
      "Localized Media Player Attribute Name",
    "component.media_player.entity_component._.state_attributes.attribute.state.attributeValue":
      "Media Player Attribute Name",
  };
  return translations[key] || "";
};

export const stateObjMock = {
  entity_id: "sensor.test",
  attributes: {
    device_class: "temperature",
  },
} as HassEntityBase;

export const localeMock = {
  language: "en",
} as FrontendLocaleData;

export const configMock = {
  unit_system: {
    temperature: "°C",
  },
} as HassConfig;

export const entitiesMock = {
  "sensor.test": {
    platform: "test_platform",
    translation_key: "test_translation_key",
  },
  "media_player.test": {
    platform: "media_player",
  },
} as unknown as HomeAssistant["entities"];

describe("computeAttributeValueDisplay", () => {
  it("should return unknown state for null value", () => {
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObjMock,
      localeMock,
      configMock,
      entitiesMock,
      "attribute",
      null
    );
    expect(result).toBe("Unknown");
  });

  it("should return formatted number for numeric value", () => {
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObjMock,
      localeMock,
      configMock,
      entitiesMock,
      "attribute",
      42
    );
    expect(result).toBe("42");
  });

  it("should return number from formatter", () => {
    const stateObj = {
      entity_id: "media_player.test",
      attributes: {
        device_class: "media_player",
        volume_level: 0.42,
      },
    } as unknown as HassEntityBase;
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObj,
      localeMock,
      configMock,
      entitiesMock,
      "volume_level"
    );
    expect(result).toBe("42%");
  });

  it("should return formatted date for date string", () => {
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObjMock,
      localeMock,
      configMock,
      entitiesMock,
      "attribute",
      "2023-10-10"
    );
    expect(result).toBe("October 10, 2023");
  });

  it("should return formatted datetime for timestamp", () => {
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObjMock,
      localeMock,
      configMock,
      entitiesMock,
      "attribute",
      "2023-10-10T10:10:10"
    );
    expect(result).toBe("October 10, 2023 at 10:10:10");
  });

  it("should return JSON string for object value", () => {
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObjMock,
      localeMock,
      configMock,
      entitiesMock,
      "attribute",
      { key: "value" }
    );
    expect(result).toBe('{"key":"value"}');
  });

  it("should return concatenated values for array", () => {
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObjMock,
      localeMock,
      configMock,
      entitiesMock,
      "attribute",
      [1, 2, 3]
    );
    expect(result).toBe("1, 2, 3");
  });

  it("should set special unit for weather domain", () => {
    const stateObj = {
      entity_id: "weather.test",
      attributes: {
        temperature: 42,
      },
    } as unknown as HassEntityBase;
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObj,
      localeMock,
      configMock,
      entitiesMock,
      "temperature"
    );
    expect(result).toBe("42 °C");
  });

  it("should set temperature unit for temperature attribute", () => {
    const stateObj = {
      entity_id: "sensor.test",
      attributes: {
        temperature: 42,
      },
    } as unknown as HassEntityBase;
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObj,
      localeMock,
      configMock,
      entitiesMock,
      "temperature"
    );
    expect(result).toBe("42 °C");
  });

  it("should return translation from translation key", () => {
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObjMock,
      localeMock,
      configMock,
      entitiesMock,
      "attribute",
      "attributeValue"
    );
    expect(result).toBe("Localized Attribute Name");
  });

  it("should return device class translation", () => {
    const stateObj = {
      entity_id: "media_player.test",
      attributes: {
        device_class: "media_player",
        volume_level: 0.42,
      },
    } as unknown as HassEntityBase;
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObj,
      localeMock,
      configMock,
      entitiesMock,
      "attribute",
      "attributeValue"
    );
    expect(result).toBe("Localized Media Player Attribute Name");
  });

  it("should return attribute value translation", () => {
    const stateObj = {
      entity_id: "media_player.test",
      attributes: {
        volume_level: 0.42,
      },
    } as unknown as HassEntityBase;
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObj,
      localeMock,
      configMock,
      entitiesMock,
      "attribute",
      "attributeValue"
    );
    expect(result).toBe("Media Player Attribute Name");
  });

  it("should return attribute value", () => {
    const stateObj = {
      entity_id: "media_player.test",
      attributes: {
        volume_level: 0.42,
      },
    } as unknown as HassEntityBase;
    const result = computeAttributeValueDisplay(
      localizeMock,
      stateObj,
      localeMock,
      configMock,
      entitiesMock,
      "attribute",
      "attributeValue2"
    );
    expect(result).toBe("attributeValue2");
  });
});

describe("computeAttributeNameDisplay", () => {
  it("should return localized name for attribute", () => {
    const localize = (key: string) => {
      if (
        key ===
        "component.light.entity.light.entity_translation_key.state_attributes.updated_at.name"
      ) {
        return "Updated at";
      }
      return "unknown";
    };

    const stateObj = {
      entity_id: "light.test",
      attributes: {
        device_class: "light",
      },
    } as HassEntity;

    const entities = {
      "light.test": {
        translation_key: "entity_translation_key",
        platform: "light",
      },
    } as unknown as HomeAssistant["entities"];

    const result = computeAttributeNameDisplay(
      localize,
      stateObj,
      entities,
      "updated_at"
    );
    expect(result).toBe("Updated at");
  });

  it("should return device class translation", () => {
    const localize = (key: string) => {
      if (
        key ===
        "component.light.entity_component.light.state_attributes.brightness.name"
      ) {
        return "Brightness";
      }
      return "unknown";
    };

    const stateObj = {
      entity_id: "light.test",
      attributes: {
        device_class: "light",
      },
    } as HassEntity;

    const entities = {} as unknown as HomeAssistant["entities"];

    const result = computeAttributeNameDisplay(
      localize,
      stateObj,
      entities,
      "brightness"
    );
    expect(result).toBe("Brightness");
  });

  it("should return default attribute name", () => {
    const localize = (key: string) => {
      if (
        key ===
        "component.light.entity_component._.state_attributes.brightness.name"
      ) {
        return "Brightness";
      }
      return "unknown";
    };

    const stateObj = {
      entity_id: "light.test",
      attributes: {},
    } as HassEntity;

    const entities = {} as unknown as HomeAssistant["entities"];

    const result = computeAttributeNameDisplay(
      localize,
      stateObj,
      entities,
      "brightness"
    );
    expect(result).toBe("Brightness");
  });

  it("should return capitalized attribute name", () => {
    const localize = () => "";

    const stateObj = {
      entity_id: "light.test",
      attributes: {},
    } as HassEntity;

    const entities = {} as unknown as HomeAssistant["entities"];

    const result = computeAttributeNameDisplay(
      localize,
      stateObj,
      entities,
      "brightness__ip_id_mac_gps_GPS"
    );
    expect(result).toBe("Brightness  IP ID MAC GPS GPS");
  });
});
