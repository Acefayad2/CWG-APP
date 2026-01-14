module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Temporarily disable nativewind/babel for web to fix build issues
      // 'nativewind/babel',
      'react-native-reanimated/plugin',
    ],
  };
};
