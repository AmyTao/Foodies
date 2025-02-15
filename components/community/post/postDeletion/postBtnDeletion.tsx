import {
  TouchableOpacity,
  StyleSheet,
  Modal,
  View,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { getAuth } from "firebase/auth";
import { destroyPostRecord } from "@/utils/blogs/posts";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

function PostBtnDeletion({ blogId }: { blogId: string }) {
  const [destroying, setDestroying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const currentUser = getAuth().currentUser;

  const handleDestroyBlog = async () => {
    setModalVisible(false);
    setDestroying(true);
    try {
      if (currentUser) {
        await destroyPostRecord(currentUser.uid, blogId);
        router.replace("/community");
      } else {
        alert("User not logged in");
      }
    } catch (error) {
      console.error("Error destroying post:", error);
      alert("An error occurred while destroying the post");
    } finally {
      setDestroying(false);
    }
  };

  const confirmBackground = useThemeColor({}, "background");
  const deletionButtonText = useThemeColor(
    { light: "#FF0000", dark: "#FFF" },
    "text"
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.postDestroyButton]}
        onPress={() => setModalVisible(true)}
        disabled={destroying}
      >
        {destroying ? (
          <ActivityIndicator color={deletionButtonText} />
        ) : (
          <Ionicons name="trash-outline" size={24} color="#FF0000" />
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: confirmBackground },
            ]}
          >
            <ThemedText style={styles.modalText}>
              Are you sure you want to delete this post?
            </ThemedText>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton]}
                onPress={handleDestroyBlog}
              >
                <ThemedText
                  style={[styles.modalButtonText, { color: "#FF0000" }]}
                >
                  Confirm
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton]}
                onPress={() => setModalVisible(false)}
              >
                <ThemedText style={[styles.modalButtonText]}>Cancel</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  postDestroyButton: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  deletionButtonText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: 300,
    padding: 20,
    alignItems: "center",
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
  },
  modalButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default PostBtnDeletion;
