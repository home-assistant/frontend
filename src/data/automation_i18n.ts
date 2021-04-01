import { Trigger, Condition } from "./automation";

export const describeTrigger = (trigger: Trigger) => {
  return `${trigger.platform} trigger`;
};

export const describeCondition = (condition: Condition) => {
  if (condition.alias) {
    return condition.alias;
  }
  if (condition.condition === "template") {
    return "Test a template";
  }
  return `${condition.condition} condition`;
};
