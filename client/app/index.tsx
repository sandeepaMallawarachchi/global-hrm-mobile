<<<<<<< Updated upstream
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Index = () => {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const token = await AsyncStorage.getItem("authToken");

        if (token) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }

        await SplashScreen.hideAsync();
      } catch (error) {
        console.error("Error during splash screen handling:", error);
      } finally {
        setIsAuthChecked(true);
      }
    };

    prepareApp();
  }, []);

  if (!isAuthChecked) {
    return null;
  }
=======
import { View, Text } from "react-native";
import React from "react";
import Login from "./login";
import Dashboard from "./dashboard";
>>>>>>> Stashed changes

  return (
<<<<<<< Updated upstream
    <View style={styles.container}>
      {/* Logo Image */}
      <Image
        source={require("../assets/images/logo2.png")} // Ensure path is correct
        style={styles.logo}
      />

      {/* Welcome Text */}
      <Text>Welcome to</Text>
      <Text style={styles.title}>GLOBAL HRM MOBILE!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  logo: {
    width: 150,
    height: 60,
    resizeMode: "contain",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#02c3cc",
    textAlign: "center",
  },
});

export default Index;
=======
    <View>
      <Login />
      <Dashboard />
    </View>
  );
};

export default index;
>>>>>>> Stashed changes
