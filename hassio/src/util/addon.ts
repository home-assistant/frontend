import memoizeOne from "memoize-one";
import { HassioAddonDetails } from "../../../src/data/hassio/addon";
import { SupervisorArch } from "../../../src/data/supervisor/supervisor";

export const addonArchIsSupported = memoizeOne(
  (supported_archs: SupervisorArch[], addon_archs: SupervisorArch[]) =>
    addon_archs.some((arch) => supported_archs.includes(arch))
);

export const extractChangelog = (
  addon: HassioAddonDetails,
  content: string
): string => {
  if (content.startsWith("# Changelog")) {
    content = content.substr(12, content.length);
  }
  if (
    content.includes(`# ${addon.version}`) &&
    content.includes(`# ${addon.version_latest}`)
  ) {
    const newcontent = content.split(`# ${addon.version}`)[0];
    if (newcontent.includes(`# ${addon.version_latest}`)) {
      // Only change the content if the new version still exist
      // if the changelog does not have the newests version on top
      // this will not be true, and we don't modify the content
      content = newcontent;
    }
  }
  return content;
};
