import { MockBaseEntity, BASE_CAPABILITY_ATTRIBUTES } from "./base-entity";

export class MockLightEntity extends MockBaseEntity {
  static CAPABILITY_ATTRIBUTES = new Set([
    ...BASE_CAPABILITY_ATTRIBUTES,
    "min_color_temp_kelvin",
    "max_color_temp_kelvin",
    "min_mireds",
    "max_mireds",
    "effect_list",
    "supported_color_modes",
  ]);

  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (!["homeassistant", this.domain].includes(domain)) {
      return;
    }

    if (service === "turn_on") {
      const { hs_color, brightness_pct, rgb_color, color_temp } = data;
      const attrs = { ...this.attributes };
      if (brightness_pct) {
        attrs.brightness = (255 * brightness_pct) / 100;
      } else if (!attrs.brightness) {
        attrs.brightness = 255;
      }
      if (hs_color) {
        attrs.color_mode = "hs";
        attrs.hs_color = hs_color;
      }
      if (rgb_color) {
        attrs.color_mode = "rgb";
        attrs.rgb_color = rgb_color;
      }
      if (color_temp) {
        attrs.color_mode = "color_temp";
        attrs.color_temp = color_temp;
        delete attrs.rgb_color;
      }
      this.update({ state: "on", attributes: attrs });
      return;
    }
    if (service === "turn_off") {
      this.update({ state: "off" });
      return;
    }
    if (service === "toggle") {
      if (this.state === "on") {
        this.handleService(domain, "turn_off", data);
      } else {
        this.handleService(domain, "turn_on", data);
      }
      return;
    }
    super.handleService(domain, service, data);
  }
}
