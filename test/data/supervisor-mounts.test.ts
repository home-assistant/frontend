import { describe, expect, it } from "vitest";
import type {
  SupervisorCIFSMount,
  SupervisorDiskMount,
  SupervisorNFSMount,
} from "../../src/data/supervisor/mounts";
import {
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
    // A disk mount has no server, share or path, which previously rendered as
    // "undefined" in the storage panel and the mount picker.
    expect(supervisorMountDescription(diskMount())).not.toContain("undefined");
  });
});
