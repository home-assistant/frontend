import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { ButtonHeadingBadgeConfig } from "../../heading-badges/types";
import type { Condition } from "../../common/validate-condition";

/**
 * Creates two heading badges for toggling lights: one visible when all lights
 * are off (calls turn_on), another when any light is on (calls turn_off).
 */
export const computeLightToggleHeadingBadges = (
  entityIds: string[],
  target: HassServiceTarget,
  options?: {
    icon?: string;
    turnOnText?: string;
    turnOffText?: string;
    turnOffColor?: string;
    extraVisibility?: Condition[];
  }
): ButtonHeadingBadgeConfig[] => {
  const icon = options?.icon ?? "mdi:lightbulb";

  const anyOnCondition: Condition = {
    condition: "or",
    conditions: entityIds.map((entityId) => ({
      condition: "state" as const,
      entity: entityId,
      state: "on",
    })),
  };

  const extraVisibility = options?.extraVisibility ?? [];

  return [
    {
      type: "button",
      icon: icon,
      ...(options?.turnOnText ? { text: options.turnOnText } : {}),
      tap_action: {
        action: "perform-action",
        perform_action: "light.turn_on",
        target: target,
      },
      visibility: [
        ...extraVisibility,
        {
          condition: "not",
          conditions: [anyOnCondition],
        },
      ],
    },
    {
      type: "button",
      icon: icon,
      ...(options?.turnOffText ? { text: options.turnOffText } : {}),
      ...(options?.turnOffColor ? { color: options.turnOffColor } : {}),
      tap_action: {
        action: "perform-action",
        perform_action: "light.turn_off",
        target: target,
      },
      visibility: [...extraVisibility, anyOnCondition],
    },
  ];
};
