export interface EventAction {
  event: string;
  event_data?: { [key: string]: any };
  event_data_template?: { [key: string]: any };
}
