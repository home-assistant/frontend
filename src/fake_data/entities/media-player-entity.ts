import type { EntityAttributes } from "./types";
import { MockBaseEntity, BASE_CAPABILITY_ATTRIBUTES } from "./base-entity";

export class MockMediaPlayerEntity extends MockBaseEntity {
  static CAPABILITY_ATTRIBUTES = new Set([
    ...BASE_CAPABILITY_ATTRIBUTES,
    "source_list",
    "sound_mode_list",
  ]);

  protected _getCapabilityAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const capabilityAttrs: EntityAttributes = {};

    if (attrs.source_list !== undefined) {
      capabilityAttrs.source_list = attrs.source_list;
    }
    if (attrs.sound_mode_list !== undefined) {
      capabilityAttrs.sound_mode_list = attrs.sound_mode_list;
    }

    return capabilityAttrs;
  }

  protected _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const isOff = this.state === "off";
    const stateAttrs: EntityAttributes = {};

    const stateKeys = [
      "media_content_type",
      "media_title",
      "media_artist",
      "media_album_name",
      "media_series_title",
      "media_duration",
      "media_position",
      "media_position_updated_at",
      "app_name",
      "volume_level",
      "is_volume_muted",
      "sound_mode",
      "source",
      "group_members",
    ];

    for (const key of stateKeys) {
      if (attrs[key] !== undefined) {
        stateAttrs[key] = isOff ? null : attrs[key];
      }
    }

    return stateAttrs;
  }

  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    if (service === "media_play_pause") {
      this.update({
        state: this.state === "playing" ? "paused" : "playing",
      });
      return;
    }
    super.handleService(domain, service, data);
  }
}
