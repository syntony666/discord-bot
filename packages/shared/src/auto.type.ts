import { AutoFeatureType } from './enums';

export interface AutoFeature {
  guildId: string;
  feature: AutoFeatureType;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
