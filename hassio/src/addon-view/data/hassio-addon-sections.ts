import memoizeOne from "memoize-one";

import { HassioAddonDetails } from "../../../../src/data/hassio/addon";
import { PageNavigation } from "../../../../src/layouts/hass-tabs-subpage";

export const getAddonSections = memoizeOne(
  (addon: HassioAddonDetails): PageNavigation[] => {
    const sections: PageNavigation[] = [
      {
        component: "hassio-addon-info",
        name: "Info",
        path: `/hassio/addon/${addon.slug}/info`,
        icon: "hassio:information-outline",
        core: true,
      },
    ];

    if (addon && addon.version) {
      if (addon.documentation) {
        sections.push({
          component: "hassio-addon-docs",
          name: "Documentation",
          path: `/hassio/addon/${addon.slug}/docs`,
          icon: "hassio:books",
          core: true,
        });
      }

      sections.push({
        component: "hassio-addon-config",
        name: "Configuration",
        path: `/hassio/addon/${addon.slug}/config`,
        icon: "hassio:cog-outline",
        core: true,
      });

      if (addon.audio) {
        sections.push({
          component: "hassio-addon-audio",
          name: "Audio",
          path: `/hassio/addon/${addon.slug}/audio`,
          icon: "hassio:speaker",
          core: true,
        });
      }
      if (addon.network) {
        sections.push({
          component: "hassio-addon-network",
          name: "Network",
          path: `/hassio/addon/${addon.slug}/network`,
          icon: "hassio:lan",
          core: true,
        });
      }
    }

    sections.push({
      component: "hassio-addon-logs",
      name: "Logs",
      path: `/hassio/addon/${addon.slug}/logs`,
      icon: "hassio:cog-outline",
      core: true,
    });

    return sections;
  }
);
