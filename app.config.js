module.exports = {
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
    // Added bundleIdentifier here:
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nehvalerie.nebo",
    },
    // Added package here:
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
      API_URL: "http://172.20.10.3:8000",
      eas: {
        projectId: "7282f621-51a5-444f-bca6-955b4499d7a8",
      },
    },
  },
};