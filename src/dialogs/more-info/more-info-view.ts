export const MORE_INFO_VIEWS = [
  "info",
  "history",
  "settings",
  "related",
  "add_to",
  "details",
] as const;

export type MoreInfoView = (typeof MORE_INFO_VIEWS)[number];

export const isMoreInfoView = (
  value: string | undefined
): value is MoreInfoView =>
  value !== undefined && (MORE_INFO_VIEWS as readonly string[]).includes(value);
