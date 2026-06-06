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
    ios: {
      supportsTablet: true,
    },
    android: {
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
    },
  },
};
