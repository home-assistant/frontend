import { Icons } from "../components/ha-icon";

export interface CustomIconsetsWindow {
  customIconsets?: Map<string, () => Promise<Icons>>;
}

const customIconsetsWindow = window as CustomIconsetsWindow;

if (!("customCards" in customIconsetsWindow)) {
  customIconsetsWindow.customIconsets = new Map();
}

export const customIconsets = customIconsetsWindow.customIconsets!;
