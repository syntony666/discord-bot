import { Feature, isFeature } from './feature.interface';
import { createLogger } from '@core/logger';

const log = createLogger('FeatureRegistry');

/**
 * Feature registry for managing feature lifecycle.
 * Ensures all features are properly cleaned up during shutdown.
 */
export class FeatureRegistry {
  private features: Feature[] = [];

  /**
   * Register a feature
   */
  register(feature: Feature): void {
    if (!isFeature(feature)) {
      throw new Error(`Invalid feature object: missing name or cleanup function`);
    }

    this.features.push(feature);
    log.info({ featureName: feature.name }, 'Feature registered');
  }

  /**
   * Get all registered features
   */
  getFeatures(): ReadonlyArray<Feature> {
    return this.features;
  }

  /**
   * Cleanup all registered features in reverse order.
   * Called during graceful shutdown.
   */
  cleanup(): void {
    log.info({ count: this.features.length }, 'Starting feature cleanup');

    // Cleanup in reverse order (LIFO)
    const reversedFeatures = [...this.features].reverse();

    for (const feature of reversedFeatures) {
      try {
        log.debug({ featureName: feature.name }, 'Cleaning up feature');
        feature.cleanup();
        log.info({ featureName: feature.name }, 'Feature cleaned up successfully');
      } catch (error) {
        log.error({ error, featureName: feature.name }, 'Failed to cleanup feature');
      }
    }

    log.info('All features cleaned up');
  }

  /**
   * Get the number of registered features
   */
  count(): number {
    return this.features.length;
  }
}

// Singleton instance
export const featureRegistry = new FeatureRegistry();
