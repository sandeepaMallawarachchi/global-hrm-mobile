import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "react-native-tailwindcss";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "./types";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await axios.post("https://global-hrm-mobile-server.vercel.app/auth/login", {
        email,
        password,
      });

      const { token, employeeId, email: userEmail, role } = res.data;

      if (userEmail) {
        await AsyncStorage.setItem("email", userEmail);
      }

      await AsyncStorage.setItem("authToken", token);
      await AsyncStorage.setItem("empId", employeeId);
      await AsyncStorage.setItem("role", role);
      await AsyncStorage.setItem("loginTimestamp", JSON.stringify(Date.now()));

      navigation.replace("dashboard");

    } catch (err) {
      console.error("Error:", err);
      setError("Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[t.flex1, t.bgGray100, t.itemsCenter, t.justifyCenter, t.pX4]}>
      <Image source={require("../assets/images/logo2.png")} style={[t.h24, t.w24, t.mB6]} />
      <Text style={[t.text2xl, t.fontBold, t.textGray700, t.mB6]}>Login</Text>

      {error && <Text style={[t.textRed500, t.textCenter, t.mB4]}>{error}</Text>}

      <View style={[t.wFull, t.mB4]}>
        <Text style={[t.textSm, t.textGray500, t.mB2]}>
          <Ionicons name="mail-outline" size={16} style={[t.mR2]} /> Email
        </Text>
        <TextInput
          style={[t.border, t.borderGray300, t.roundedLg, t.p3, t.bgWhite]}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={[t.wFull, t.mB6]}>
        <Text style={[t.textSm, t.textGray500, t.mB2]}>
          <Ionicons name="key-outline" size={16} style={[t.mR2]} /> Password
        </Text>
        <TextInput
          style={[t.border, t.borderGray300, t.roundedLg, t.p3, t.bgWhite]}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={[t.bgOrange500, t.h12, t.roundedLg, t.itemsCenter, t.justifyCenter, t.wFull, t.mB4]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[t.textWhite, t.textLg, t.fontMedium]}>Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity >
        <Text style={[t.textOrange500, t.textSm, t.underline]}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Login;