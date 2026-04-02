import { View, Text, Image, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const { height } = Dimensions.get("window");

export default function Onboarding1() {
  const router = useRouter();

  return (

    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        
        {/* IMAGE — Top Area */}
        <View className="flex-1 items-center justify-center">
          <Image
            source={require("../../assets/images/farmer.png")}
            resizeMode="contain"
          />
        </View>

        {/* WHITE CARD */}
        <View
          style={{ height: height * 0.39 }}
          className="bg-white rounded-t-[60px] items-center px-8 pt-10 "
        >
          {/* LOGO */}
          <Text className="text-[28px] font-[800] text-black">
            Ne<Text className="text-[#FF9F1C]">Bo</Text>
          </Text>

          {/* TEXT */}
          <Text className="text-center text-gray-600 mt-5 leading-6 text-[15px]">
            Connect directly with farmers and consumers.{"\n"}
            Fresh produce, fair prices and a thriving{"\n"}
            community.
          </Text>

          {/* BUTTON */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            className="bg-[#1B6E3C] mt-9 px-16 py-4 rounded-full"
            activeOpacity={0.85}
          >
            <Text className="text-white text-[17px] font-semibold">
              Get Started
            </Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}