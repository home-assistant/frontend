import { HassEntities } from "home-assistant-js-websocket";
import type { GroupEntity } from "../../data/group";
import { DEFAULT_VIEW_ENTITY_ID } from "../const";

// Return an ordered array of available views
export const extractViews = (entities: HassEntities): GroupEntity[] => {
  const views: GroupEntity[] = [];

  Object.keys(entities).forEach((entityId) => {
    const entity = entities[entityId];
    if (entity.attributes.view) {
      views.push(entity as GroupEntity);
    }
  });

  views.sort((view1, view2) => {
    if (view1.entity_id === DEFAULT_VIEW_ENTITY_ID) {
      return -1;
    }
    if (view2.entity_id === DEFAULT_VIEW_ENTITY_ID) {
      return 1;
    }
    return view1.attributes.order - view2.attributes.order;
  });

  return views;
};
