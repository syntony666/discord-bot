import { config } from 'dotenv';

// Loaded via the package barrel — importing '@discord-bot/shared' populates
// process.env as a side effect. Must be the first import in app entry points.
config({ path: ['.env', '../../.env'] });
