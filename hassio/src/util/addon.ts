import memoizeOne from "memoize-one";

export const addonArchIsSupported = memoizeOne(
  (
    supported_archs: ["armhf" | "armv7" | "aarch64" | "i386" | "amd64"],
    addon_archs: ["armhf" | "armv7" | "aarch64" | "i386" | "amd64"]
  ) => addon_archs.some((arch) => supported_archs.includes(arch))
);
