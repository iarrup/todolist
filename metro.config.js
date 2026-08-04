// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle Drizzle's generated `.sql` migration files so they can be imported
// from drizzle/migrations.js and applied on-device at startup.
config.resolver.sourceExts.push('sql');

module.exports = config;
