import React, { useState } from 'react';
import {View, Text, TextInput, Button, StyleSheet, Image, TouchableOpacity, Platform, ScrollView} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDietStore } from '@/zustand/diet';
import {router} from "expo-router";
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024; // 2MB in bytes

const UploadDietScreen: React.FC = () => {
    const [imgUri, setImgUri] = useState<string | null>(null);
    const [title, setTitle] = useState<string>('');
    // const [amount, setAmount] = useState<string>('');
    const [date, setDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const { addDiet } = useDietStore();
    const [loading, setLoading] = useState(false);
    let analysis: string;
    const navigation = useNavigation();

    const getImageSize = async (uri: string) => {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        return fileInfo.exists ? fileInfo?.size : 0 ;
    };

    const analyzeImage = async (imageUri: string) => {
        const apiKey = "vmg48AzN.7kadZgKHh9vPLjofJzyc2w21lRVSaVTg";
        const url = "https://vision.foodvisor.io/api/1.0/en/analysis/";

        try {
            // Load the image as bytes
            const image = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const formData = new FormData();
            formData.append('image', {
                uri: imageUri,
                name: '1.jpg',  // Ensure name has an extension, 'cause it matters
                type: 'image/jpeg',  // Adjust as 'image/png' if it's PNG
            } as any);

            const headers = {
                "Authorization": `Api-Key ${apiKey}`,
                "Content-Type": "multipart/form-data",
            };

            const response = await axios.post(url, formData, { headers });

            if (response.status === 200) {
                console.log("Data:", response.data);
                response.data.items.forEach((item, index) => {
                    console.log(`Food item #${index + 1}:`);
                    let foodOption = item.food[0];
                    console.log(`    Name: ${foodOption.food_info.display_name}`);
                    console.log(`    Confidence: ${foodOption.confidence * 100}%`);
                    if(foodOption.food_info.quantity){
                        console.log(`    Quantity: ${foodOption.food_info.quantity}`);
                    }
                    else if(foodOption.food_info.g_per_serving){
                        console.log(`    Quantity: ${foodOption.food_info.g_per_serving}`);
                    }
                    console.log(`    Glycemic Index: ${foodOption.food_info.nutrition.glycemic_index}`);
                    // console.log(`    Nutritional Info:`, foodOption.food_info.nutrition);
                    const topNutrients = Object.entries(foodOption.food_info.nutrition)
                        .filter(([key, value]) => value && value > 0 && key !== "glycemic_index") // Skip nulls and zeros
                        .sort(([, valueA], [, valueB]) => valueB - valueA) // Sort from max to min
                        .slice(0, 5);  // Get only the first 5 items

                    console.log("    Main Nutritional Info:");
                    topNutrients.forEach(([key, value]) => {
                        console.log(`      ${key}: ${value}`);
                    });
                    // item.food.forEach((foodOption, foodIndex) => {
                    //     console.log(`  Option ${foodIndex + 1}:`);
                    //     console.log(`    Name: ${foodOption.food_info.display_name}`);
                    //     console.log(`    Confidence: ${foodOption.confidence}`);
                    //     console.log(`    Quantity: ${foodOption.food_info.quantity}`);
                    //     console.log(`    Nutritional Info:`, foodOption.food_info.nutrition);
                    // });
                });

                return response.data;
            }
        } catch (error) {
            console.error("something went wrong: ", error);
        }
    };


    const downloadImage = async (imageUrl: string) => {
        const localUri = `${FileSystem.cacheDirectory}image.jpg`;

        try {
            const { uri } = await FileSystem.downloadAsync(imageUrl, localUri);
            console.log("Image downloaded to:", uri);

            // Pass this URI to `analyzeImage`
            const data = await analyzeImage(uri);
            console.log("Analysis data:", data);
        } catch (error) {
            console.error("Couldn't download the image", error);
        }
    };


    // downloadImage("https://cdn.foodvisor.io/img/vision/examples/1.jpg");


    const selectImage = async () => {

        Alert.alert('Select Image', 'Choose an option', [
            { text: 'Take a Picture', onPress: () => pickImage('camera') },
            { text: 'Choose from Album', onPress: () => pickImage('library') },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const pickImage = async (source: 'camera' | 'library') => {

        let result;
        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                alert('Sorry, we need camera permissions to make this work!');
                return;
            }
            // Launch camera
            result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
            });
        } else if (source === "library") {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                alert('Sorry, we need media library permissions to make this work!');
                return;
            }
            // Open gallery
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
            });
        }

        // If the user canceled, just return
        if (result?.canceled) return;

        // Call analyzeImage with the selected image URI
        if (result?.assets) {
            setLoading(true);
            // setImgUri(result.assets[0].uri);
            // console.log("select img uri:", result.assets[0].uri);
            let compressedImageUri = result.assets[0].uri;
            let imageSize = await getImageSize(compressedImageUri);

            // Keep resizing/compressing until we're under 2MB
            while (imageSize > MAX_SIZE_BYTES) {
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    compressedImageUri,
                    [{ resize: { width: Math.round(result.assets[0].width * 0.8) } }], // Reduce width by 80% each time
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Adjust quality/compression
                );

                compressedImageUri = manipulatedImage.uri;
                imageSize = await getImageSize(compressedImageUri);
            }

            setImgUri(compressedImageUri); // Set the final compressed image URI
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!imgUri) {
            Alert.alert('No Image Selected', 'Please select an image to analyze.');
            return;
        }

        try {
            const analysisData = await analyzeImage(imgUri); // Call analyzeImage with the image URI
            navigation.reset({
                index: 1,
                routes: [
                    { name: "index" },  // Assuming `index` is your main Me screen
                    { name: "detaildiet", params: { analysisData } }
                ],
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to analyze the image.');
        }
    };

    const pickImage2 = async () => {
        // Request media library permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Sorry, we need media library permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setImgUri(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            alert('Sorry, we need camera permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setImgUri(result.assets[0].uri);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const handleSubmit = () => {
        if (!imgUri || !title ) {
            alert('Please fill all fields before submitting.');
            return;
        }

        addDiet(imgUri, title, analysis);
        alert('Diet added successfully!');
        // Clear form
        setImgUri(null);
        setTitle('');
        setDate(new Date());
        router.navigate("/profile/mydiets");
    };


    return (
        <View style={styles.container}>
            <Text style={styles.header}>Create New Entry</Text>

            <Text style={styles.label}>Title:</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter title"
                value={title}
                onChangeText={setTitle}
            />

            <Text style={styles.label}>Date:</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <TextInput
                    style={styles.input}
                    placeholder="Select date"
                    value={date.toLocaleDateString()}
                    editable={false}
                />
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}

            <Text style={styles.label}>Image:</Text>

            <TouchableOpacity onPress={selectImage} style={styles.imageContainer}>
                {imgUri ? (
                    <Image source={{ uri: imgUri }} style={styles.image} />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Text>Select Image</Text>
                    </View>
                )}
            </TouchableOpacity>

            <Button title="Start Analyze" onPress={handleAnalyze} />
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    imagePicker: {
        height: 200,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 20,
    },
    // image: {
    //     width: '100%',
    //     height: '100%',
    //     borderRadius: 10,
    // },
    imagePlaceholder: {
        color: '#777',
        fontSize: 16,
    },
    // input: {
    //     height: 50,
    //     borderColor: '#ccc',
    //     borderWidth: 1,
    //     borderRadius: 8,
    //     marginBottom: 20,
    //     paddingHorizontal: 10,
    //     backgroundColor: '#fff',
    // },
    datePickerButton: {
        marginBottom: 20,
        paddingVertical: 10,
        backgroundColor: '#00796b',
        borderRadius: 5,
        alignItems: 'center',
    },
    dateText: {
        color: '#fff',
        fontSize: 16,
    },

    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginTop: 20,
        fontWeight: '600',
    },
    input: {
        borderBottomWidth: 1,
        paddingVertical: 8,
        marginTop: 5,
    },
    imageContainer: {
        marginVertical: 10,
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    placeholderImage: {
        width: 100,
        height: 100,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
});

export default UploadDietScreen;
