export interface LogbookEntry {
  when: string;
  name: string;
  message: string;
  entity_id?: string;
  domain: string;
  context_user_id?: string;
}
