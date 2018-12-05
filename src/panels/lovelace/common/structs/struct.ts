import { superstruct } from "superstruct";
import { isEntityId } from "./is-entity-id";
import { isIcon } from "./is-icon";

export const struct = superstruct({
  types: {
    "entity-id": isEntityId,
    icon: isIcon,
  },
});
