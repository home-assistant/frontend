import { ConfigEntity } from "../../../cards/hui-glance-card";

export class GlanceOptions {
  private entityConf: ConfigEntity;

  constructor(entityConf: ConfigEntity) {
    const defaults = {
      name: "",
      icon: "",
      tap_action: "more-info" as "more-info",
      hold_action: "" as "",
      service: "",
    };
    const values = { ...defaults, ...entityConf };

    this.entityConf = values;
  }

  get name(): string {
    return this.entityConf.name!;
  }

  get icon(): string {
    return this.entityConf.icon!;
  }

  get tap_action(): string {
    return this.entityConf.tap_action!;
  }

  get hold_action(): string {
    return this.entityConf.hold_action!;
  }

  get service(): string {
    return this.entityConf.service!;
  }
}
