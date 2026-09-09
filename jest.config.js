module.exports = {
  preset: 'jest-expo',
  // Let Jest transform drizzle-orm (ships as ESM under some conditions) in
  // addition to the RN/Expo packages jest-expo already whitelists.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|drizzle-orm))',
  ],
  // react-native-gesture-handler's components (Swipeable, used by TaskRow)
  // need its bundled native-module mock to render under Jest.
  setupFiles: ['react-native-gesture-handler/jestSetup'],
};
