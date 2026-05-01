// ============================================================
// MiniMax Relay Platform - Configuration Loader
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AppConfig } from './types';

const DEFAULT_CONFIG: AppConfig = {
  server: {
    host: '0.0.0.0',
    port: 3000,
    base_path: '/v1',
  },
  minimax: {
    api_key: process.env.MINIMAX_API_KEY || '',
    base_url: 'https://api.minimaxi.com',
    timeout: 120000,
  },
  models: {
    enabled: [
      'MiniMax-M2.7-highspeed',
      'MiniMax-M2.5-highspeed',
      'gpt-5.5',
      'image-01',
    ],
    default: 'MiniMax-M2.7-highspeed',
  },
  logging: {
    level: 'info',
    format: 'simple',
  },
  rate_limit: {
    enabled: true,
    requests_per_minute: 60,
  },
};

class Config {
  private config: AppConfig;
  private configPath: string;

  constructor() {
    this.configPath = path.resolve(process.cwd(), 'config.yaml');
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    // Start with defaults
    let config = { ...DEFAULT_CONFIG };

    // Override with config.yaml if it exists
    if (fs.existsSync(this.configPath)) {
      try {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const yamlConfig = yaml.load(fileContent) as Partial<AppConfig>;
        config = this.mergeConfig(config, yamlConfig);
      } catch (error) {
        console.error(`Failed to load config from ${this.configPath}:`, error);
      }
    }

    // Override with environment variables
    config.minimax.api_key = process.env.MINIMAX_API_KEY || config.minimax.api_key;
    config.server.port = parseInt(process.env.PORT || String(config.server.port), 10);
    config.server.host = process.env.HOST || config.server.host;
    config.logging.level = (process.env.LOG_LEVEL as any) || config.logging.level;
    config.rate_limit.requests_per_minute = parseInt(
      process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || String(config.rate_limit.requests_per_minute),
      10
    );

    // Validate required config
    if (!config.minimax.api_key) {
      throw new Error('MINIMAX_API_KEY is required in config.yaml or environment variables');
    }

    return config;
  }

  private mergeConfig(defaults: AppConfig, overrides: Partial<AppConfig>): AppConfig {
    const result = { ...defaults };

    if (overrides.server) {
      result.server = { ...defaults.server, ...overrides.server };
    }
    if (overrides.minimax) {
      result.minimax = { ...defaults.minimax, ...overrides.minimax };
    }
    if (overrides.models) {
      result.models = { ...defaults.models, ...overrides.models };
    }
    if (overrides.logging) {
      result.logging = { ...defaults.logging, ...overrides.logging };
    }
    if (overrides.rate_limit) {
      result.rate_limit = { ...defaults.rate_limit, ...overrides.rate_limit };
    }

    return result;
  }

  get(): AppConfig {
    return this.config;
  }

  getServerConfig() {
    return this.config.server;
  }

  getMiniMaxConfig() {
    return this.config.minimax;
  }

  getModelsConfig() {
    return this.config.models;
  }

  getLoggingConfig() {
    return this.config.logging;
  }

  getRateLimitConfig() {
    return this.config.rate_limit;
  }

  isModelEnabled(modelId: string): boolean {
    return this.config.models.enabled.includes(modelId);
  }

  getDefaultModel(): string {
    return this.config.models.default;
  }
}

// Singleton instance
let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = new Config();
  }
  return configInstance;
}

export function initConfig(configPath?: string): AppConfig {
  // Allow passing custom config path for testing
  if (configPath) {
    const customConfig = new Config();
    configInstance = customConfig;
    return customConfig.get();
  }
  return getConfig().get();
}

export { AppConfig };
