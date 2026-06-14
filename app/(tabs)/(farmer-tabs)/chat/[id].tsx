/**
 * app/(tabs)/(farmer-tabs)/chat/[id].tsx
 * Explicit route binding for the Farmer context
 */
import { ChatScreen } from "../../../_shared/chat/ChatScreen";

export default function FarmerChatRoute() {
  return <ChatScreen />;
}