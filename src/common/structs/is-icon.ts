import { refine, string } from "superstruct";

const isIcon = (value: string) => {
  if (!value.includes(":")) {
    return false;
  }
  return true;
};

export const icon = () => refine(string(), "icon (mdi:icon-name)", isIcon);
