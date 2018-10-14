export interface LovelaceConfig {
  type: string;
}

export interface LovelaceCard {
  getCardSize(): number;
  setConfig(config: LovelaceConfig): void;
}
