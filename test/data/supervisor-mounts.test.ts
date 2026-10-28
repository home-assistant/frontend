import { describe, expect, it } from "vitest";
import type { HostDisk, HostDiskPartition } from "../../src/data/hassio/host";
import type {
  SupervisorCIFSMount,
  SupervisorDiskMount,
  SupervisorNFSMount,
} from "../../src/data/supervisor/mounts";
import {
  mountableDiskPartitions,
  SupervisorMountState,
  SupervisorMountType,
  SupervisorMountUsage,
  supervisorMountDescription,
} from "../../src/data/supervisor/mounts";

const nfsMount = (
  overrides: Partial<SupervisorNFSMount> = {}
): SupervisorNFSMount => ({
  name: "my_nfs",
  type: SupervisorMountType.NFS,
  usage: SupervisorMountUsage.MEDIA,
  state: SupervisorMountState.ACTIVE,
  read_only: false,
  user_path: null,
  server: "nas.local",
  path: "/export/media",
  ...overrides,
});

const cifsMount = (
  overrides: Partial<SupervisorCIFSMount> = {}
): SupervisorCIFSMount => ({
  name: "my_share",
  type: SupervisorMountType.CIFS,
  usage: SupervisorMountUsage.MEDIA,
  state: SupervisorMountState.ACTIVE,
  read_only: false,
  user_path: null,
  server: "nas.local",
  share: "media",
  ...overrides,
});

const diskMount = (
  overrides: Partial<SupervisorDiskMount> = {}
): SupervisorDiskMount => ({
  name: "media_disk",
  type: SupervisorMountType.DISK,
  usage: SupervisorMountUsage.MEDIA,
  state: SupervisorMountState.ACTIVE,
  read_only: false,
  user_path: null,
  uuid: "e3f1a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
  filesystem: "ext4",
  ...overrides,
});

describe("supervisorMountDescription", () => {
  it("describes an NFS mount by server and path", () => {
    expect(supervisorMountDescription(nfsMount())).toBe(
      "nas.local/export/media"
    );
  });

  it("describes a CIFS mount by server and share", () => {
    expect(supervisorMountDescription(cifsMount())).toBe("nas.local:media");
  });

  it("includes the port only when Supervisor reports one", () => {
    expect(supervisorMountDescription(nfsMount({ port: 2049 }))).toBe(
      "nas.local:2049/export/media"
    );
    expect(supervisorMountDescription(nfsMount({ port: undefined }))).toBe(
      "nas.local/export/media"
    );
  });

  it("describes a disk mount by filesystem and uuid", () => {
    expect(supervisorMountDescription(diskMount())).toBe(
      "ext4 • e3f1a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b"
    );
  });

  it("omits the filesystem when Supervisor has not resolved one", () => {
    expect(
      supervisorMountDescription(diskMount({ filesystem: undefined }))
    ).toBe("e3f1a2b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b");
  });

  it("never describes a disk mount using network fields", () => {
    // A disk mount has no server, share, or path.
    expect(supervisorMountDescription(diskMount())).not.toContain("undefined");
  });
});

const partition = (device: string, mountable: boolean): HostDiskPartition => ({
  device,
  uuid: `uuid-${device}`,
  label: "",
  filesystem: "ext4",
  size: 1000,
  read_only: false,
  mountable,
});

const disk = (devPath: string, partitions: HostDiskPartition[]): HostDisk => ({
  name: devPath,
  vendor: "",
  model: "",
  serial: "",
  size: 2000,
  id: devPath,
  dev_path: devPath,
  connection_bus: "",
  removable: false,
  ejectable: false,
  partitions,
});

describe("mountableDiskPartitions", () => {
  it("keeps only mountable partitions, each with its disk", () => {
    const sdb = disk("/dev/sdb", [partition("/dev/sdb1", false)]);
    const sdc = disk("/dev/sdc", [
      partition("/dev/sdc1", true),
      partition("/dev/sdc2", false),
    ]);
    expect(mountableDiskPartitions([sdb, sdc])).toEqual([
      { disk: sdc, partition: sdc.partitions[0] },
    ]);
  });
});
