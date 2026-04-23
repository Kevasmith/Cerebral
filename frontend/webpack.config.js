const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');
require('dotenv').config();

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Inject EXPO_PUBLIC_* env vars into the web bundle
  const expoDefs = {};
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith('EXPO_PUBLIC_')) {
      expoDefs[`process.env.${key}`] = JSON.stringify(process.env[key]);
    }
  });

  config.plugins.push(new webpack.DefinePlugin(expoDefs));

  return config;
};
