import { LovelaceConfig } from "../../../src/data/lovelace";
import { Entity } from "../../../src/fake_data/entity";

export interface DemoConfig {
  index?: number;
  name: string;
  authorName: string;
  authorUrl: string;
  lovelace: () => LovelaceConfig;
  entities: () => Entity[];
  theme: () => { [key: string]: string } | null;
  language?: string;
}
