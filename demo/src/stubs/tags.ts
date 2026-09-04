import type { Tag, UpdateTagParams } from "../../../src/data/tag";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockTags = (hass: MockHomeAssistant) => {
  // The panel offers add, edit and delete, so the mock keeps the tags rather
  // than answering from a constant, and hands back copies the way a real
  // response would.
  const tags: Tag[] = [{ id: "my-tag", name: "My Tag" }];
  let created = 0;

  const find = (tagId: string) => tags.find((tag) => tag.id === tagId);

  hass.mockWS("tag/list", () => tags.map((tag) => ({ ...tag })));

  hass.mockWS(
    "tag/create",
    (msg: UpdateTagParams & { tag_id?: string }): Tag => {
      created += 1;
      const tag: Tag = {
        id: msg.tag_id || `tag-${created}`,
        name: msg.name,
        description: msg.description,
      };
      tags.push(tag);
      return { ...tag };
    }
  );

  hass.mockWS(
    "tag/update",
    (msg: UpdateTagParams & { tag_id: string }): Tag => {
      const tag = find(msg.tag_id);
      if (!tag) {
        throw new Error(`Tag ${msg.tag_id} not found`);
      }
      tag.name = msg.name;
      tag.description = msg.description;
      return { ...tag };
    }
  );

  hass.mockWS("tag/delete", (msg: { tag_id: string }) => {
    const index = tags.findIndex((tag) => tag.id === msg.tag_id);
    if (index === -1) {
      throw new Error(`Tag ${msg.tag_id} not found`);
    }
    tags.splice(index, 1);
    return undefined;
  });
};
