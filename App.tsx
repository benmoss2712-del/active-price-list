import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { PriceOverridesProvider } from "./src/hooks/usePriceOverrides";
import { useQuoteAutoSync } from "./src/hooks/useQuoteAutoSync";
import { SavedQuotesProvider } from "./src/hooks/useSavedQuotes";
import CalculatorScreen from "./src/screens/CalculatorScreen";
import LoginScreen from "./src/screens/LoginScreen";
import PriceListScreen from "./src/screens/PriceListScreen";
import SavedQuotesScreen from "./src/screens/SavedQuotesScreen";

const Tab = createBottomTabNavigator();

function MainTabs() {
  useQuoteAutoSync();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#15803d",
          tabBarInactiveTintColor: "#86a89a",
          tabBarLabelStyle: { fontWeight: "700", fontSize: 12 },
          tabBarStyle: {
            borderTopColor: "rgba(34, 197, 94, 0.25)",
            backgroundColor: "#ffffff",
            paddingTop: 4,
          },
        }}
      >
        <Tab.Screen
          name="Catalog"
          component={PriceListScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Quotes"
          component={CalculatorScreen}
          options={{
            title: "New quote",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="MyQuotes"
          component={SavedQuotesScreen}
          options={{
            title: "My quotes",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bookmarks" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function AuthGate() {
  const { hydrated, user } = useAuth();
  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }
  if (!user) {
    return <LoginScreen />;
  }
  return (
    <SavedQuotesProvider>
      <MainTabs />
    </SavedQuotesProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PriceOverridesProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </PriceOverridesProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0fdf4",
  },
});
