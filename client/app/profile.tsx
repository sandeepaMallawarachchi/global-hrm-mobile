import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AntDesign } from "@expo/vector-icons";
import AccountSecurity from "./profileComponents/AccountSecurity";
import PersonalDetails from "./profileComponents/PersonalDetails";
import WorkInformation from "./profileComponents/WorkInformation";
import Resume from "./profileComponents/Resume";

const Profile = () => {
  const [visibleSection, setVisibleSection] = useState("account");
  const [avatar, setAvatar] = useState(
    "https://global-hrm-mobile-server.vercel.app/images/avatar.png"
  );
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [workDetails, setWorkDetails] = useState({});
  const [personalDetails, setPersonalDetails] = useState({});
  const [empId, setEmpId] = useState<string | null>(null);
  const API_BASE_URL = "https://global-hrm-mobile-server.vercel.app";

  useEffect(() => {
    const fetchEmpId = async () => {
      try {
        const storedEmpId = await AsyncStorage.getItem("empId");
        if (storedEmpId) {
          setEmpId(storedEmpId);
        }
      } catch (err) {
        console.error("Error fetching empId from storage:", err);
      }
    };
    fetchEmpId();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!empId) return;
      try {
        const personalResponse = await axios.get(
          `${API_BASE_URL}/employees/getPersonalDetails/${empId}`
        );
        setPersonalDetails(personalResponse.data);
        const profilePicUrl = personalResponse.data.profilepic;

        if (profilePicUrl) {
          setAvatar(
            `https://global-hrm-mobile-server.vercel.app${profilePicUrl}`
          );
        } else {
          setAvatar(
            "https://global-hrm-mobile-server.vercel.app/images/avatar.png"
          );
        }
        const workResponse = await axios.get(
          `${API_BASE_URL}/employees/getWorkDetails/${empId}`
        );
        setWorkDetails(workResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, [empId]);

  const handleFileChange = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.cancelled) {
      setAvatar(result.uri);

      try {
        const formData = new FormData();
        formData.append("profilePic", {
          uri: result.uri,
          type: "image/jpeg",
          name: "profilePic.jpg",
        });

        await axios.post(
          `https://global-hrm-mobile-server.vercel.app/employees/uploadProfileImage/${empId}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        Alert.alert(
          "Profile Picture Updated",
          "Your profile picture has been updated successfully."
        );
      } catch (err) {
        console.log("Error uploading profile image:", err);
      }
    }
  };

  const handleSectionToggle = (section) => {
    setVisibleSection(section);
  };

  const getSectionButtonStyle = (section) => {
    if (visibleSection === section) {
      return [styles.sectionButton, styles.sectionButtonActive];
    } else {
      return [styles.sectionButton, styles.sectionButtonInactive];
    }
  };

  const getSectionTextStyle = (section) => {
    return visibleSection === section
      ? styles.buttonTextActive
      : styles.buttonTextInactive;
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileContainer}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => setIsModalVisible(true)}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: avatar }} style={styles.avatar} />
            </View>
          </TouchableOpacity>

          <Modal
            visible={isModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeModalButton}
              >
                <AntDesign name="close" style={styles.closeModalIcon} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleFileChange}
                style={styles.changeAvatarButton}
              >
                <Text style={styles.changeAvatarText}>Change Avatar</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.nameText}>{personalDetails.name}</Text>
          <Text style={styles.designationText}>{workDetails.designation}</Text>
          <Text style={styles.infoText}>
            Supervisor: {workDetails.supervisor}
          </Text>
          <Text style={styles.infoText}>Email: {workDetails.workEmail}</Text>
          <Text style={styles.infoText}>
            Work Phone: {workDetails.workPhone}
          </Text>
        </View>
      </View>

      <View style={styles.sectionButtons}>
        <TouchableOpacity
          onPress={() => handleSectionToggle("account")}
          style={getSectionButtonStyle("account")}
        >
          <Text style={getSectionTextStyle("account")}>Security</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSectionToggle("work")}
          style={getSectionButtonStyle("work")}
        >
          <Text style={getSectionTextStyle("work")}>Work </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSectionToggle("resume")}
          style={getSectionButtonStyle("resume")}
        >
          <Text style={getSectionTextStyle("resume")}>Resume</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSectionToggle("personal")}
          style={getSectionButtonStyle("personal")}
        >
          <Text style={getSectionTextStyle("personal")}>Personal</Text>
        </TouchableOpacity>
      </View>

      {visibleSection === "account" && <AccountSecurity />}
      {visibleSection === "personal" && <PersonalDetails />}
      {visibleSection === "work" && <WorkInformation />}
      {visibleSection === "resume" && <Resume />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f4f4f4",
  },
  profileContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    alignItems: "center",
  },
  avatarSection: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#ff7f50",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  profileInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  designationText: {
    fontSize: 16,
    color: "#666",
    marginVertical: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#888",
  },
  sectionButtons: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  sectionButton: {
    flex: 1,
    paddingVertical: 12,
    margin: 6,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionButtonActive: {
    backgroundColor: "#ff7f50",
  },
  sectionButtonInactive: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#ff7f50",
  },
  buttonTextActive: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextInactive: {
    color: "#ff7f50",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  closeModalButton: {
    position: "absolute",
    top: 30,
    right: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  closeModalIcon: {
    fontSize: 24,
    color: "#FF6347",
  },
  changeAvatarButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: "#FF6347",
    borderRadius: 50,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  changeAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default Profile;