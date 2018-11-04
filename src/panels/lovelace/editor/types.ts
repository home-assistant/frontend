export interface YamlChangedEvent extends Event {
  detail: {
    yaml: string;
  };
}
