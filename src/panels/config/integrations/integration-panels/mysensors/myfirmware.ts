/* eslint-disable max-classes-per-file */

export interface IMyFirmware {
  bloader_ver?: number;
  fw_blocks?: number;
  fw_crc?: number;
  fw_filename?: string;
  fw_name?: string;
  fw_type?: number;
  fw_ver?: number;
  fw_version?: string;

  fw_req_block?: number;
  fw_max_blocks?: number;
}

export type MyFirmwareVersion = Omit<IMyFirmware, "fw_name" | "fw_type">;

export class MyFirmware
  implements
    Omit<
      IMyFirmware,
      "fw_filename" | "bloader_ver" | "fw_blocks" | "fw_crc" | "fw_ver"
    >
{
  fw_name?: string;

  fw_type?: number;

  fw_versions: MyFirmwareVersion[] = [];
}
