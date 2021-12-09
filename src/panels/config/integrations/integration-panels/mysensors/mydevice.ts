import { IMyFirmware } from "./myfirmware";

export class MyDevice {
  gateway!: string;

  node_id!: number;

  type!: number;

  entity_id!: string;

  device_id!: string;

  device_name!: string;

  device_name_by_user!: string;

  sketch_name!: string;

  sketch_version!: string;

  battery_level!: number;

  protocol_version!: string;

  heartbeat!: number;

  hearbeat_state?: boolean;

  reboot!: boolean;

  // firmware!: MyFirmware | undefined;
  firmware!: IMyFirmware | undefined;
  // fwTargetVersion!: MyFirmwareVersion | undefined;

  getDeviceId(): string {
    return this.gateway + "_" + this.node_id;
  }
}
