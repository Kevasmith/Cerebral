const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force Metro to use the react-native/CJS exports instead of ESM .mjs files.
// Without this, packages like zustand resolve to their ESM entry points which
// use import.meta syntax — unsupported by Metro's web bundler.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['react-native', 'require', 'default'];

module.exports = config;
