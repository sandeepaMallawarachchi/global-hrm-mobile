import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AntDesign } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import ProfilePicture from "@/components/profilepicture";
import AccountSecurity from "./profileComponents/AccountSecurity";
import WorkInformation from "./profileComponents/WorkInformation";
import PersonalDetails from "./profileComponents/PersonalDetails";
import Resume from "./profileComponents/Resume";

const API_BASE_URL = "https://global-hrm-mobile-server.vercel.app";

interface WorkDetails {
  designation?: string;
  supervisor?: string;
  workEmail?: string;
  workPhone?: string;
}

interface PersonalDetails {
  name?: string;
  profilepic?: string; // Add this to reflect backend data
}

const Profile: React.FC = () => {
  const [visibleSection, setVisibleSection] = useState<string>("account");
  const [workDetails, setWorkDetails] = useState<WorkDetails>({});
  const [personalDetails, setPersonalDetails] = useState<PersonalDetails | null>(null);
  const [empId, setEmpId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [shouldFetchAvatar, setShouldFetchAvatar] = useState(false); //New state

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
      setLoading(true);
      try {
        const personalResponse = await axios.get<PersonalDetails>(
          `${API_BASE_URL}/employees/getPersonalDetails/${empId}`
        );
        setPersonalDetails(personalResponse.data);

        const workResponse = await axios.get<WorkDetails>(
          `${API_BASE_URL}/employees/getWorkDetails/${empId}`
        );
        setWorkDetails(workResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [empId, shouldFetchAvatar]);  // Re-fetch on avatar change

  const handleSectionToggle = (section: string) => {
    setVisibleSection(section);
  };

  const getSectionButtonStyle = (section: string) => {
    return visibleSection === section
      ? [styles.sectionButton, styles.sectionButtonActive]
      : [styles.sectionButton, styles.sectionButtonInactive];
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Changed to only allow images
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // Lower the quality to reduce image size
    });

    if (pickerResult.canceled === true) {
      return;
    }

    if (pickerResult.assets && pickerResult.assets.length > 0) {
      const selectedImage = pickerResult.assets[0].uri;

      const formData = new FormData();
      const getFileType = (uri: string): string => {
        const ext = uri.split('.').pop();
        switch (ext) {
          case 'jpg':
          case 'jpeg':
            return 'image/jpeg';
          case 'png':
            return 'image/png';
          default:
            return 'image/jpeg'; // Default to jpeg to ensure it works
        }
      };

      const getFileName = (uri: string): string => {
        const name = uri.split('/').pop();
        return name || 'image.jpg'; //Provide a default name
      };

      formData.append('profilePic', { //**CHANGED**: Match backend key.  Crucial!
        uri: selectedImage,
        name: getFileName(selectedImage),
        type: getFileType(selectedImage),
      });

      try {
        const uploadEndpoint = `${API_BASE_URL}/employees/uploadProfileImage/${empId}`;
        console.log(`Attempting to upload to: ${uploadEndpoint}`);

        const response = await axios.post(uploadEndpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.status === 200) {
          console.log('Avatar uploaded successfully!');
          setShouldFetchAvatar(true);  // Trigger re-fetch to update avatar

        } else {
          console.error('Avatar upload failed:', response.data);
        }
      } catch (error: any) {
        console.error('Error uploading avatar:', error);
        if (error.response && error.response.status === 413) {
          alert('Image is too large. Please select a smaller image.');
        } else if (error.response && error.response.status === 404) {
          alert('Upload endpoint not found.  Please contact support.');
        } else if (error.response && error.response.status === 500) {
           alert('Server error during upload. Please try again later.'); //Specific 500 message
        }
         else {
          alert('Upload failed. Please try again later.');
        }
      }

      closeModal();
    } else {
      console.warn('No image selected.');
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.container, { justifyContent: "center", alignItems: "center" }]}
      >
        <ActivityIndicator size="large" color="#ff7f50" />
        <Text style={{ marginTop: 10, color: "#888" }}>Loading profile...</Text>
      </View>
    );
  }

  if (!personalDetails) {
    return (
      <View
        style={[styles.container, { justifyContent: "center", alignItems: "center" }]}
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
          <TouchableOpacity onPress={openModal}>
            <View style={styles.avatarWrapper}>
               <ProfilePicture profilepic={personalDetails.profilepic} /> {/* Pass the profilepic prop */}
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
          <Text style={getSectionTextStyle("work")}>Work</Text>
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
            <View style={styles.modalAvatar}>
              <ProfilePicture profilepic={personalDetails.profilepic} />  {/* Pass the profilepic prop */}
            </View>
            <TouchableOpacity
              style={styles.changeAvatarButton}
              onPress={changeAvatar}
            >
              <Text style={styles.changeAvatarText}>Change</Text>
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
    width: 300,
    height: 300,
    borderRadius: 100,
    marginBottom: 20,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center'
  },
});

export default Profile;