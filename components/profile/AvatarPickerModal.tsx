import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  useColorScheme,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useState } from "react";
import { useUserStore } from "@/zustand/user";
import { FIREBASE_AUTH } from "@/firebaseConfig";
import { uploadAvatar } from "@/utils/users/avatar";
import { useThemeColor } from "@/hooks/useThemeColor";

interface AvatarPickerModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function AvatarPickerModal({
  isVisible,
  onClose,
}: AvatarPickerModalProps) {
  const { user, updateAvatar } = useUserStore();
  const currentUser = FIREBASE_AUTH.currentUser;
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar ?? "");
  const [isImagePicked, setIsImagePicked] = useState(false);

  async function pickImageFromAlbum() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      if (result.assets && result.assets.length > 0) {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 256, height: 256 } }],
          { compress: 1, format: ImageManipulator.SaveFormat.PNG }
        );
        setSelectedAvatar(manipulatedImage.uri);
        setIsImagePicked(true);
      }
    }
  }

  async function saveImage() {
    if (currentUser === null || currentUser.uid === null) {
      console.error("No user is logged in");
      return;
    }
    const avartUri = await uploadAvatar(selectedAvatar, currentUser.uid);
    if (avartUri !== "") {
      updateAvatar(avartUri);
    } else {
      console.error("Error uploading avatar");
    }
    setIsImagePicked(false);
    onClose();
  }

  function cancelAvatarPicker() {
    setIsImagePicked(false);
    setSelectedAvatar(user?.avatar ?? "");
    onClose();
  }

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");

  return (
    <View>
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.avatarPickerContainer,
              {
                backgroundColor: backgroundColor,
                borderColor: textColor,
              },
            ]}
          >
            <Image
              source={
                selectedAvatar !== ""
                  ? { uri: selectedAvatar }
                  : require("@/assets/images/avatar-placeholder.jpg")
              }
              style={styles.modalAvatar}
            />
            <View style={styles.buttonContainer}>
              {isImagePicked ? (
                <TouchableOpacity
                  style={[styles.button, styles.uploadButton]}
                  onPress={saveImage}
                >
                  <Text style={styles.uploadButtonText}>Save</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.uploadButton]}
                  onPress={pickImageFromAlbum}
                >
                  <Text style={styles.uploadButtonText}>New Avatar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={cancelAvatarPicker}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPickerContainer: {
    width: 320,
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  modalAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 35,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    alignItems: "center",
  },
  uploadButton: {
    backgroundColor: "#000",
  },
  uploadButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#FF6347",
  },
  cancelButtonText: {
    color: "white",
  },
});
