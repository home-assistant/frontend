import { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { DEFAULT_VIEW_ENTITY_ID } from "../const";

// Return an ordered array of available views
export default function extractViews(entities: HassEntities) {
  const views: HassEntity[] = [];

  Object.keys(entities).forEach((entityId) => {
    const entity = entities[entityId];
    if (entity.attributes.view) {
      views.push(entity);
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
}
