export default ({ config }) => {
  const isDev = process.env.APP_ENV !== "production";

  return {
    ...config,
    expo: {
      name: "NeBo",
      slug: "nebo",
      scheme: "nebo",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/images/logo.png",
      userInterfaceStyle: "light",

      splash: {
        image: "./assets/images/logo.png",
        resizeMode: "contain",
        backgroundColor: "#F0FAF4",
      },

      ios: {
        supportsTablet: true,
        bundleIdentifier: "com.nehvalerie.nebo",
      },

      android: {
        package: "com.nehvalerie.nebo",
        adaptiveIcon: {
          foregroundImage: "./assets/images/logo.png",
          backgroundColor: "#F0FAF4",
        },
      },

      web: {
        favicon: "./assets/favicon.png",
      },

      extra: {
        API_URL: "https://overflowing-warmth-production-f457.up.railway.app",

        eas: {
          projectId: "7282f621-51a5-444f-bca6-955b4499d7a8",
        },
      },
    },
  };
};
