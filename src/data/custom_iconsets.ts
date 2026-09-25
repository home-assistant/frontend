import type { CustomIcon } from "./custom_icons";

interface CustomIconsetsWindow {
  customIconsets?: Record<string, (name: string) => Promise<CustomIcon>>;
}

const customIconsetsWindow = window as CustomIconsetsWindow;

if (!("customIconsets" in customIconsetsWindow)) {
  customIconsetsWindow.customIconsets = {};
}

export const customIconsets = customIconsetsWindow.customIconsets!;
