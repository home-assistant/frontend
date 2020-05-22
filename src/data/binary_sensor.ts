import { HomeAssistant } from "../types";

export interface TemplateBinarySensor {
  id: string;
  name: string;
  icon?: string;
  device_class?: string;
  value?: string;
  availability?: string;
  entity_picture?: string;
  delay_on?: string;
  delay_off?: string;
}

export interface TemplateBinarySensorMutableParams {
  name: string;
  icon?: string;
  device_class?: string;
  value?: string;
  availability?: string;
  entity_picture?: string;
  delay_on?: string;
  delay_off?: string;
}

export const createBinarySensor = (
  hass: HomeAssistant,
  values: TemplateBinarySensorMutableParams
) =>
  hass.callWS<TemplateBinarySensor>({
    type: "binary_sensor/create",
    ...values,
  });

export const updateBinarySensor = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<TemplateBinarySensorMutableParams>
) =>
  hass.callWS<TemplateBinarySensor>({
    type: "binary_sensor/update",
    binary_sensor_id: id,
    ...updates,
  });

export const deleteBinarySensor = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "binary_sensor/delete",
    binary_sensor_id: id,
  });
