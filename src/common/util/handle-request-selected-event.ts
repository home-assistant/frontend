import {
  RequestSelectedDetail,
  ListItem,
} from "@material/mwc-list/mwc-list-item";

export const shouldHandleRequestSelectedEvent = (
  ev: CustomEvent<RequestSelectedDetail>
): boolean => {
  if (!ev.detail.selected && ev.detail.source !== "property") {
    return false;
  }
  (ev.target as ListItem).selected = false;
  return true;
};
