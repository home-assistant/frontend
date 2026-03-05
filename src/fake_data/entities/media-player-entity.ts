import { MockBaseEntity, BASE_CAPABILITY_ATTRIBUTES } from "./base-entity";

export class MockMediaPlayerEntity extends MockBaseEntity {
  static CAPABILITY_ATTRIBUTES = new Set([
    ...BASE_CAPABILITY_ATTRIBUTES,
    "source_list",
    "sound_mode_list",
  ]);

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
