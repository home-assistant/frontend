import { MockBaseEntity } from "./base-entity";

export class MockAlarmControlPanelEntity extends MockBaseEntity {
  public async handleService(
    domain: string,
    service: string,
    data: Record<string, any>
  ): Promise<void> {
    if (domain !== this.domain) {
      return;
    }

    const serviceStateMap: Record<string, string> = {
      alarm_arm_night: "armed_night",
      alarm_arm_home: "armed_home",
      alarm_arm_away: "armed_away",
      alarm_disarm: "disarmed",
    };

    if (serviceStateMap[service]) {
      this.update({ state: serviceStateMap[service] });
      return;
    }
    super.handleService(domain, service, data);
  }
}
