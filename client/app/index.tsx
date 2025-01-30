import React, { useEffect } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useRouter } from "expo-router";

const Index = () => {
  const router = useRouter();

  useEffect(() => {
    const prepareApp = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();

        // Simulate loading for 10 seconds
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await SplashScreen.hideAsync();

        // Navigate to home page
        router.replace("/login");
      } catch (error) {
        console.error("Error during splash screen handling:", error);
      }
    };

    prepareApp();
  }, []);

  return (
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
    backgroundColor: "#000", // White background for a clean look
  },
  logo: {
    width: 150, // Adjust the size of the logo as needed
    height: 60,
    resizeMode: "contain",
    marginBottom: 20, // Adds spacing between logo & text
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#02c3cc", // Use the desired color
    textAlign: "center",
  },
});

export default Index;