import { debounce } from "../common/util/debounce";
import { customIcons } from "./custom_icons";
import {
  findIconChunk,
  getIcon,
  MDI_PREFIXES,
  writeCache,
  type Chunks,
} from "./iconsets";

interface IconLoadResult {
  icon: string;
  legacy?: boolean;
  path?: string;
  secondaryPath?: string;
  viewBox?: string;
}

type DeprecatedIcon = Record<
  string,
  {
    removeIn: string;
    newName?: string;
  }
>;

const chunks: Chunks = {};

const debouncedWriteCache = debounce(() => writeCache(chunks), 2000);

const cachedIcons: Record<string, string> = {};

const mdiDeprecatedIcons: DeprecatedIcon = {};

export const loadIcon = async (
  icon: string,
  warningCallback?: (message) => void
): Promise<IconLoadResult> => {
  const [iconPrefix, origIconName] = icon.split(":", 2);

  let iconName = origIconName;

  if (!iconPrefix || !iconName) {
    return {
      icon,
    };
  }

  if (!MDI_PREFIXES.includes(iconPrefix)) {
    const customIcon = customIcons[iconPrefix];
    if (customIcon) {
      if (customIcon && typeof customIcon.getIcon === "function") {
        const custom = await customIcon.getIcon(iconName);
        return {
          icon,
          path: custom.path,
          secondaryPath: custom.secondaryPath,
          viewBox: custom.viewBox,
        };
      }
      return {
        icon,
      };
    }
    return {
      icon,
      legacy: true,
    };
  }

  if (iconName in mdiDeprecatedIcons) {
    const deprecatedIcon = mdiDeprecatedIcons[iconName];
    let message: string;

    if (deprecatedIcon.newName) {
      message = `Icon ${iconPrefix}:${iconName} was renamed to ${iconPrefix}:${deprecatedIcon.newName}, please change your config, it will be removed in version ${deprecatedIcon.removeIn}.`;
      iconName = deprecatedIcon.newName!;
    } else {
      message = `Icon ${iconPrefix}:${iconName} was removed from MDI, please replace this icon with an other icon in your config, it will be removed in version ${deprecatedIcon.removeIn}.`;
    }
    // eslint-disable-next-line no-console
    console.warn(message);
    if (warningCallback) {
      warningCallback(message);
    }
  }

  if (iconName in cachedIcons) {
    return {
      icon,
      path: cachedIcons[iconName],
    };
  }

  if (iconName === "home-assistant") {
    const ha = (await import("../resources/home-assistant-logo-svg"))
      .mdiHomeAssistant;

    cachedIcons[iconName] = ha;
    return {
      icon,
      path: ha,
    };
  }

  let databaseIcon: string | undefined;
  try {
    databaseIcon = await getIcon(iconName);
  } catch (_err) {
    // Firefox in private mode doesn't support IDB
    // iOS Safari sometimes doesn't open the DB
    databaseIcon = undefined;
  }

  if (databaseIcon) {
    cachedIcons[iconName] = databaseIcon;
    return {
      icon,
      path: databaseIcon,
    };
  }
  const chunk = findIconChunk(iconName);

  if (chunk in chunks) {
    const iconPack = await chunks[chunk];
    return {
      icon,
      path: iconPack[iconName],
    };
  }

  const iconPromise = fetch(`/static/mdi/${chunk}.json`).then((response) =>
    response.json()
  );
  chunks[chunk] = iconPromise;
  debouncedWriteCache();
  const iconPack = await iconPromise;
  return {
    icon,
    path: iconPack[iconName],
  };
};
