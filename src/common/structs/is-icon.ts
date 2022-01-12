import { refine, string } from "superstruct";

const isIcon = (value: string) => value.includes(":");

export const icon = () => refine(string(), "icon (mdi:icon-name)", isIcon);
