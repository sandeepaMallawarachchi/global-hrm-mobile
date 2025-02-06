import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator, // Import ActivityIndicator
  Modal,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AntDesign } from "@expo/vector-icons";
import AccountSecurity from "./profileComponents/AccountSecurity";
import PersonalDetails from "./profileComponents/PersonalDetails";
import WorkInformation from "./profileComponents/WorkInformation";
import Resume from "./profileComponents/Resume";
import ProfilePicture from "@/components/profilepicture"; // Import ProfilePicture
import * as ImagePicker from 'expo-image-picker'; // Import the image picker

const API_BASE_URL = "https://global-hrm-mobile-server.vercel.app";

interface WorkDetails {
  designation?: string;
  supervisor?: string;
  workEmail?: string;
  workPhone?: string;
  // Add other properties as needed
}

interface PersonalDetails {
  name?: string;
  // Add other properties as needed
}

const Profile: React.FC = () => {
  const [visibleSection, setVisibleSection] = useState<string>("account");
  const [workDetails, setWorkDetails] = useState<WorkDetails>({});
  const [personalDetails, setPersonalDetails] = useState<PersonalDetails | null>(null);
  const [empId, setEmpId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false); // State for the modal
  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null); // URL of the profile picture

  useEffect(() => {
    const fetchEmpId = async () => {
      try {
        const storedEmpId = await AsyncStorage.getItem("empId");
        if (storedEmpId) {
          setEmpId(storedEmpId);
        } else {
          console.log("empId not found in AsyncStorage");
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
      setLoading(true);
      try {
        const personalResponse = await axios.get<PersonalDetails>(
          `${API_BASE_URL}/employees/getPersonalDetails/${empId}`
        );
        console.log("Personal details response:", personalResponse.data);
        setPersonalDetails(personalResponse.data);

        const workResponse = await axios.get<WorkDetails>(
          `${API_BASE_URL}/employees/getWorkDetails/${empId}`
        );
        setWorkDetails(workResponse.data);
        console.log("Work details response:", workResponse.data);

        // Fetch profile picture URL (replace with your actual endpoint)
        const pictureResponse = await axios.get<{ profilePictureUrl: string }>(`${API_BASE_URL}/employees/getProfilePicture/${empId}`);
        setProfilePictureUri(pictureResponse.data.profilePictureUrl);

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [empId]);

  const handleSectionToggle = (section: string) => {
    setVisibleSection(section);
  };

  const getSectionButtonStyle = (section: string) => {
    if (visibleSection === section) {
      return [styles.sectionButton, styles.sectionButtonActive];
    } else {
      return [styles.sectionButton, styles.sectionButtonInactive];
    }
  };

  const getSectionTextStyle = (section: string) => {
    return visibleSection === section
      ? styles.buttonTextActive
      : styles.buttonTextInactive;
  };

  const openModal = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const changeAvatar = async () => {
    let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // Or specific types if needed
      allowsEditing: true,
      aspect: [4, 3],  //optional aspect ratio
      quality: 1,       //optional image quality (0-1)
    });

    if (pickerResult.canceled === true) {
      return;
    }

    if (pickerResult.assets && pickerResult.assets.length > 0) {
      const selectedImage = pickerResult.assets[0].uri;

      // Now you have the selected image URI in `selectedImage`.
      // You can upload it to your server or store it as needed.

      // Example: Uploading to a server (replace with your actual API endpoint):
      const formData = new FormData();
      formData.append('avatar', {
        uri: selectedImage,
        name: 'avatar.jpg', // Or use a more appropriate name
        type: 'image/jpeg',
      });

      try {
        const response = await axios.post(`${API_BASE_URL}/uploadAvatar/${empId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.status === 200) {
          // Avatar uploaded successfully, update the UI or state
          console.log('Avatar uploaded successfully!');
          // Assuming the server returns the new image URL:
          setProfilePictureUri(response.data.profilePictureUrl);
        } else {
          console.error('Avatar upload failed:', response.data);
        }
      } catch (error) {
        console.error('Error uploading avatar:', error);
      }

      // Close the modal after selection. You may want to wait for the upload to finish first.
      closeModal();
    } else {
      console.warn('No image selected.');
    }
  };


  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#ff7f50" />
        <Text style={{ marginTop: 10, color: "#888" }}>Loading profile...</Text>
      </View>
    );
  }

  if (!personalDetails) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: "#888" }}>
          Could not load profile information.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileContainer}>
        <View style={styles.avatarSection}>
          {/* Replace Image with ProfilePicture */}
          <TouchableOpacity onPress={openModal}>
            <View style={styles.avatarWrapper}>
              {profilePictureUri ? (
                <Image source={{ uri: profilePictureUri }} style={styles.avatar} />
              ) : (
                <ProfilePicture /> // Use the default if no URL is available
              )}
            </View>
          </TouchableOpacity>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={{ backgroundColor: "white", padding: 20, borderRadius: 10 }}>
            {/* Display current avatar and options to change/upload */}
            {profilePictureUri ? (
                <Image
                  source={{ uri: profilePictureUri }}
                  style={styles.modalAvatar}
                />
              ) : (
                <View style={styles.modalAvatar}>
                  <Text>No Profile Picture</Text>  {/* Or a default placeholder */}
                </View>
              )}

            <TouchableOpacity
              style={styles.changeAvatarButton}
              onPress={changeAvatar}
            >
              <Text style={styles.changeAvatarText}>Change Avatar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeModalButton} onPress={closeModal}>
              <AntDesign name="close" style={styles.closeModalIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    top: 10,
    right: 10,
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
    alignSelf: 'center'
  },
  changeAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  modalAvatar: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 20,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center'
  },
});

export default Profile;