import { ScrollView, TouchableOpacity, Text, View } from "react-native";

const CATEGORIES = [
  { id: "1", label: "All", emoji: "✨" },
  { id: "2", label: "Veggies", emoji: "🥦" },
  { id: "3", label: "Fruits", emoji: "🍊" },
  { id: "4", label: "Grains", emoji: "🌾" },
  { id: "5", label: "Herbs", emoji: "🌿" },
  { id: "6", label: "Roots", emoji: "🥕" },
];

export function CategoryBar({ activeId, onSelect }: { activeId: string, onSelect: (id: string) => void }) {
  return (
    <View className="mb-5">
      <Text className="text-[#1B4332] font-bold text-[15px] px-5 mb-3">Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            className={`flex-row items-center rounded-full px-3.5 py-2 mr-2.5 border ${
              activeId === cat.id ? "bg-[#2D6A4F] border-[#2D6A4F]" : "bg-[#F0FAF4] border-[#D8F3DC]"
            }`}
          >
            <Text className="text-sm mr-1">{cat.emoji}</Text>
            <Text className={`text-[13px] font-medium ${activeId === cat.id ? "text-white" : "text-[#2D6A4F]"}`}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}