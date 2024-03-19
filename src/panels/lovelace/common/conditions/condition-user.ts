import { HomeAssistant } from "../../../../types";
import { ConditionHandler } from "./handle-condition";
import { LovelaceBaseCondition } from "./types";

export type LovelaceUserCondition = LovelaceBaseCondition & {
  condition: "user";
  users?: string[];
};

export class UserConditionHandler
  implements ConditionHandler<LovelaceUserCondition>
{
  validate(condition: LovelaceUserCondition): boolean {
    return condition.users != null;
  }

  check(condition: LovelaceUserCondition, hass: HomeAssistant): boolean {
    return condition.users && hass.user?.id
      ? condition.users.includes(hass.user.id)
      : false;
  }
}
