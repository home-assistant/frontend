import { HomeAssistant } from "../types";

export interface TemplateBinarySensor {
  id: string;
  friendly_name: string;
  icon_template?: string;
  device_class?: string;
  value_template?: string;
  availability_template?: string;
  entity_picture_template?: string;
  delay_on?: string;
  delay_off?: string;
}

export interface TemplateBinarySensorMutableParams {
  friendly_name: string;
  icon_template?: string;
  device_class?: string;
  value_template?: string;
  availability_template?: string;
  entity_picture_template?: string;
  delay_on?: string;
  delay_off?: string;
}

export const fetchTemplateBinarySensor = (hass: HomeAssistant) =>
  hass.callWS<TemplateBinarySensor[]>({ type: "template/binary_sensor/list" });

export const createTemplateBinarySensor = (
  hass: HomeAssistant,
  values: TemplateBinarySensorMutableParams
) =>
  hass.callWS<TemplateBinarySensor>({
    type: "template/binary_sensor/create",
    ...values,
  });

export const updateTemplateBinarySensor = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<TemplateBinarySensorMutableParams>
) =>
  hass.callWS<TemplateBinarySensor>({
    type: "template/binary_sensor/update",
    binary_sensor_id: id,
    ...updates,
  });

export const deleteTemplateBinarySensor = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "template/binary_sensor/delete",
    binary_sensor_id: id,
  });
