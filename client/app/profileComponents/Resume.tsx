import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

interface Experience {
  id: number;
  company: string;
  role: string;
  date_from: string;
  date_to?: string;
}

interface Education {
  id: number;
  institution: string;
  degree: string;
  date_from: string;
  date_to?: string;
}

const Resume = () => {
  const [empId, setEmpId] = useState<string | null>(null);
  const [experienceList, setExperienceList] = useState<Experience[]>([]);
  const [educationList, setEducationList] = useState<Education[]>([]);

  useEffect(() => {
    const fetchEmpId = async () => {
      const storedEmpId = await AsyncStorage.getItem("empId");
      setEmpId(storedEmpId);
      fetchData(storedEmpId);
    };
    fetchEmpId();
  }, []);

  const fetchData = async (id: string | null) => {
    try {
      const experienceResponse = await axios.get(
        `https://global-hrm-mobile-server.vercel.app/employees/getExperience/${id}`
      );
      setExperienceList(experienceResponse.data);
      const educationResponse = await axios.get(
        `https://global-hrm-mobile-server.vercel.app/employees/getEducation/${id}`
      );
      setEducationList(educationResponse.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleDelete = async (id: number, type: "Experience" | "Education") => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await axios.delete(
                `https://global-hrm-mobile-server.vercel.app/employees/delete${type}/${empId}/${id}`
              );
              if (type === "Experience") {
                setExperienceList((prev) =>
                  prev.filter((item) => item.id !== id)
                );
              } else {
                setEducationList((prev) =>
                  prev.filter((item) => item.id !== id)
                );
              }
            } catch (error) {
              console.error(`Error deleting ${type.toLowerCase()}:`, error);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Experience</Text>
      <FlatList
        data={experienceList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Ionicons name="briefcase-outline" size={32} style={styles.icon} color="#FFA500" />
              <View style={styles.details}>
                <Text style={styles.cardTitle}>{item.company}</Text>
                <Text style={styles.cardSubtitle}>{item.role}</Text>
                <Text style={styles.cardDate}>
                  {new Date(item.date_from).toISOString().split("T")[0]} to{" "}
                  {item.date_to ? new Date(item.date_to).toISOString().split("T")[0] : "Current"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id, "Experience")} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <Text style={styles.header}>Education</Text>
      <FlatList
        data={educationList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Ionicons name="school-outline" size={32} style={styles.icon} color="#FFA500" />
              <View style={styles.details}>
                <Text style={styles.cardTitle}>{item.institution}</Text>
                <Text style={styles.cardSubtitle}>{item.degree}</Text>
                <Text style={styles.cardDate}>
                  {new Date(item.date_from).toISOString().split("T")[0]} to{" "}
                  {item.date_to ? new Date(item.date_to).toISOString().split("T")[0] : "Current"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id, "Education")} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F8F9FA",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#444",
  },
  cardSubtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  cardDate: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  deleteButton: {
    marginTop: 8,
    backgroundColor: "#FF4C4C",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  deleteText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 10,
  },
  details: {
    flex: 1,
  },
});

export default Resume;