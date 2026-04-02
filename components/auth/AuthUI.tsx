import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TextInputProps,
  ActivityIndicator,
} from "react-native";
import { Svg, Path, Ellipse } from "react-native-svg";
import { useState } from "react";

// ─── Logo ─────────────────────────────────────────────────────────────────────
export function NeboLogo({ size = 48 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: "#1B7344", // Using your primary for shadow
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      }}
      className="bg-primary items-center justify-center elevation-8"
    >
      <Text
        style={{ fontSize: size * 0.35 }}
        className="color-white font-bold tracking-tighter"
      >
        N
      </Text>
    </View>
  );
}

// ─── Field Input ──────────────────────────────────────────────────────────────
interface FieldInputProps extends TextInputProps {
  label?: string; // Made optional as per your previous screen usage
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function FieldInput({
  label,
  error,
  icon,
  rightIcon,
  ...props
}: FieldInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-primary text-sm font-medium mb-1.5">{label}</Text>
      ) : null}
      
      <View
        className={`flex-row items-center rounded-[20px] px-4 bg-secondary border h-[54px] ${
          error ? "border-red-500" : focused ? "border-primary" : "border-[#B7E4C7]"
        }`}
      >
        {icon && <View className="mr-3 opacity-60">{icon}</View>}
        <TextInput
          className="flex-1 text-primary text-base font-normal"
          placeholderTextColor="#74B88A"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>
      
      {error ? (
        <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text>
      ) : null}
    </View>
  );
}

// ─── Password Input ───────────────────────────────────────────────────────────
export function PasswordInput({
  label,
  error,
  ...props
}: Omit<FieldInputProps, "secureTextEntry" | "rightIcon">) {
  const [visible, setVisible] = useState(false);
  return (
    <FieldInput
      label={label}
      error={error}
      secureTextEntry={!visible}
      rightIcon={
        <TouchableOpacity onPress={() => setVisible((v) => !v)} activeOpacity={0.7}>
          <Text className="text-primary text-xs font-bold">
            {visible ? "Hide" : "Show"}
          </Text>
        </TouchableOpacity>
      }
      {...props}
    />
  );
}

// ─── Primary Button ───────────────────────────────────────────────────────────
export function AuthButton({
  label,
  onPress,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      className={`bg-primary rounded-2xl py-4 items-center mt-2 shadow-lg elevation-8 ${
        loading ? "opacity-70" : "opacity-100"
      }`}
      style={{
        shadowColor: "#1B7344",
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-white font-bold text-base tracking-wide">
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Decorative Background ───────────────────────────────────────────────────
export function AuthBackground() {
  return (
    <View className="absolute inset-0" pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 390 844" className="absolute">
        <Path
          d="M-40 0 C60 0, 160 40, 140 140 C120 240, -40 200, -40 200 Z"
          fill="#D8F3DC"
          opacity={0.6}
        />
        <Path
          d="M350 -30 C410 10, 430 90, 390 120 C360 145, 300 100, 320 40 Z"
          fill="#B7E4C7"
          opacity={0.5}
        />
        <Ellipse cx="-10" cy="800" rx="100" ry="80" fill="#95D5B2" opacity={0.3} />
        <Path
          d="M360 760 C420 740, 440 820, 400 844 L390 844 Z"
          fill="#D8F3DC"
          opacity={0.5}
        />
      </Svg>
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function OrDivider() {
  return (
    <View className="flex-row items-center my-5">
      <View className="flex-1 h-[1px] bg-[#B7E4C7]" />
      <Text className="text-[#95D5B2] text-xs mx-3 font-bold">or</Text>
      <View className="flex-1 h-[1px] bg-[#B7E4C7]" />
    </View>
  );
}