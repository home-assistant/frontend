import { ConfigEntity } from "../../../cards/hui-glance-card";

export class GlanceOptions {
  private entityConf?: ConfigEntity;

  constructor(entityConf: ConfigEntity) {
    this.entityConf = entityConf;
  }

  get _name(): string {
    return this.entityConf!.name || "";
  }

  get _icon(): string {
    return this.entityConf!.icon || "";
  }

  get _tapaction(): string {
    return this.entityConf!.tap_action || "more-info";
  }

  get _holdaction(): string {
    return this.entityConf!.hold_action || "";
  }

  get _service(): string {
    return this.entityConf!.service || "";
  }
}
