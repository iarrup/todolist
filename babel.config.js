module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Inline Drizzle's generated `.sql` migrations as strings (paired with the
    // `sql` sourceExt in metro.config.js) so Metro doesn't parse them as JS.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
