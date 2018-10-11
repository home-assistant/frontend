import { DEFAULT_VIEW_ENTITY_ID } from "../const.js";

// Return an ordered array of available views
export default function extractViews(entities) {
  const views = [];

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
