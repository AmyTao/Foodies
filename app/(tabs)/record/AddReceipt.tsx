import React, { useState, useEffect } from 'react';
import {
    KeyboardAvoidingView,
    View,
    Text,
    TextInput,
    Button,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useReceiptStore } from '@/zustand/receipt';
import { router } from 'expo-router';
import DateTimePicker from "@react-native-community/datetimepicker";
import {useNavigation} from "@react-navigation/native";
import {ThemedView} from "@/components/ThemedView";
import {ThemedText} from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import * as FileSystem from 'expo-file-system';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const UploadReceiptScreen: React.FC = () => {
    const [imgUri, setImgUri] = useState<string | null>(null);
    const [title, setTitle] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [days, setDays] = useState<string>('0');
    const [hours, setHours] = useState<string>('0');
    const [minutes, setMinutes] = useState<string>('0');
    const [date, setDate] = useState<string>(new Date().toISOString());
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const { addReceipt } = useReceiptStore();
    const navigation = useNavigation();
    const textColor = useThemeColor({}, "text");

    useEffect(() => {
        const requestNotificationsPermissions = async () => {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissions Needed', 'Please enable notifications to receive reminders.');
            }
        };
        requestNotificationsPermissions();
    }, []);

    // Save the image to a permanent location
    const saveImageToFileSystem = async (uri: string): Promise<string | null> => {
        try {
            const fileName = uri.split('/').pop(); // Extract the file name
            const newPath = `${FileSystem.documentDirectory}${fileName}`; // Save it to the app's document directory
            await FileSystem.copyAsync({
                from: uri,
                to: newPath,
            });
            console.log('Image saved to:', newPath);
            return newPath; // Return the permanent URI
        } catch (error) {
            console.error('Error saving image:', error);
            return null;
        }
    };

    const createNotificationChannel = async () => {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('receipt-reminder-channel', {
                name: 'Receipt Reminders',
                importance: Notifications.AndroidImportance.HIGH, // Set importance level
                description: 'Notifications for receipt reminders',
            });
        }
    };

    const scheduleNotification = async () => {
        // Create the notification channel (Android only)
        if (Platform.OS === 'android') {
            await createNotificationChannel();
        }
        const validDays = parseFloat(days) || 0;
        const validHours = parseFloat(hours) || 0;
        const validMinutes = parseFloat(minutes) || 0;

        const delayInMs =
            (validDays * 24 * 60 * 60 * 1000) +
            (validHours * 60 * 60 * 1000) +
            (validMinutes * 60 * 1000);

        if (isNaN(delayInMs) || delayInMs === 0) {
            // Alert.alert('No Notification Scheduled', 'Looks like you didn’t set a notification time. You can always add one later if needed!');
            Alert.alert('No Notification Scheduled', 'Looks like you didn’t set a notification time. You can always add one later if needed!');
            return;
        }

        if (delayInMs < 0) {
            Alert.alert('Invalid Time', 'Please set a time in the future.');
            return;
        }

        const triggerTime = new Date().getTime() + delayInMs;
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Receipt Reminder 📋",
                body: `Hey! It's time to double-check your bank for the transaction titled "${title}" for $${amount}. Make sure the amount is accurate!`,
                // icon: require("@/assets/images/notification-icon.png"),
            },
            trigger: {
                type: 'date', // Explicitly specify the type as 'date'
                date: new Date(triggerTime), // Set the target date
                repeats: false, // No repeats
                channelId: Platform.OS === 'android' ? 'receipt-reminder-channel' : undefined, // Use channelId for Android
            } as Notifications.NotificationTriggerInput,
        });

        const timeParts = [];
        if (validDays > 0) timeParts.push(`${validDays} day${validDays > 1 ? "s" : ""}`);
        if (validHours > 0) timeParts.push(`${validHours} hour${validHours > 1 ? "s" : ""}`);
        if (validMinutes > 0) timeParts.push(`${validMinutes} minute${validMinutes > 1 ? "s" : ""}`);
        const message = `Your reminder will pop up in ${timeParts.join(", ")}.`;
        Alert.alert('Reminder Set', message);
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Please grant media library permissions.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
            // aspect: [3, 4],
        });

        if (!result.canceled) {
            const permanentUri = await saveImageToFileSystem(result.assets[0].uri); // Save to permanent storage
            if (permanentUri) {
                setImgUri(permanentUri); // Set the permanent URI
            }
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Please grant camera permissions.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            const permanentUri = await saveImageToFileSystem(result.assets[0].uri); // Save to permanent storage
            if (permanentUri) {
                setImgUri(permanentUri); // Set the permanent URI
            }
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate.toISOString());
        }
    };

    const handleSubmit = () => {
        if (!imgUri || !title || !amount) {
            Alert.alert('Incomplete Fields', 'Please fill in all fields and upload an image.');
            return;
        }

        addReceipt(imgUri, title, parseFloat(amount), date);
        scheduleNotification();

        setImgUri(null);
        setTitle('');
        setAmount('');
        setDate(new Date().toISOString());
        setDays('0');
        setHours('0');
        setMinutes('0');
        // router.navigate("/record/MyReceipts");
        navigation.reset({
            index: 1,
            routes: [
                { name: "index" },
                { name: "MyReceipts" }
            ],
        });
    };

    return (
        <KeyboardAwareScrollView
            contentContainerStyle={{
                flexGrow: 1,
                padding: 20,
            }}
            enableOnAndroid={true}
            extraScrollHeight={20}
            keyboardShouldPersistTaps="handled"
        >
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {imgUri ? (
                    <Image source={{ uri: imgUri }} style={styles.image} />
                ) : (
                    <Text style={styles.imagePlaceholder}>      Tap to Select Image</Text>
                )}
            </TouchableOpacity>
            <Button title="Capture Photo" onPress={takePhoto} color="#F4511E" />
            <View style={styles.amountContainer}>
                <TextInput
                    style={[styles.input, { color: textColor }]}
                    placeholder="Title"
                    placeholderTextColor={textColor + "99"}
                    value={title}
                    onChangeText={(text) => setTitle(text)}
                />
                <ThemedText style={styles.currencySymbol}>  </ThemedText>
            </View>
            <View style={styles.amountContainer}>
                <TextInput
                    style={[styles.input, styles.amountInput, { color: textColor }]}
                    placeholder="Amount"
                    placeholderTextColor={textColor + "99"}
                    value={amount}
                    onChangeText={(text) => setAmount(text)}
                    keyboardType="numeric"
                />
                <ThemedText style={styles.currencySymbol}>$</ThemedText>
            </View>
            <View style={styles.amountContainer}>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                    <Text style={styles.dateText}>Select Date: {new Date(date).toLocaleDateString()}</Text>
                </TouchableOpacity>
                <Text style={styles.currencySymbol}>  </Text>
            </View>
            {showDatePicker && (
                <DateTimePicker
                    value={new Date(date)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    // display={'default'}
                    onChange={onDateChange}
                />
            )}

            <ThemedText style={styles.label}>Notification Timer</ThemedText>
            <View style={styles.timeInputsContainer}>
                <View style={styles.timeInputGroup}>
                    <TextInput
                        style={[styles.timeInput, { color: textColor }]}
                        placeholder="Days"
                        placeholderTextColor={textColor + "99"}
                        value={days}
                        onChangeText={(text) => setDays(text)}
                        keyboardType="numeric"
                    />
                    <ThemedText style={styles.timeUnit}>day</ThemedText>
                </View>
                <View style={styles.timeInputGroup}>
                    <TextInput
                        style={[styles.timeInput, { color: textColor }]}
                        placeholder="Hours"
                        placeholderTextColor={textColor + "99"}
                        value={hours}
                        onChangeText={(text) => setHours(text)}
                        keyboardType="numeric"
                    />
                    <ThemedText style={styles.timeUnit}>hour</ThemedText>
                </View>
                <View style={styles.timeInputGroup}>
                    <TextInput
                        style={[styles.timeInput, { color: textColor }]}
                        placeholder="Minutes"
                        placeholderTextColor={textColor + "99"}
                        value={minutes}
                        onChangeText={(text) => setMinutes(text)}
                        keyboardType="numeric"
                    />
                    <ThemedText style={styles.timeUnit}>min</ThemedText>
                </View>
            </View>
            <Button title="Save Receipt" onPress={handleSubmit} color="#F4511E"  />
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        marginBottom: 100,
        // backgroundColor: '#f5f5f5',
    },
    imagePicker: {
        height: 200,
        width: '96%',
        // backgroundColor: '#e0e0e0',
        backgroundColor: 'rgba(197,197,197,0.74)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 10,
    },
    image: {
        width: '100%',
        height: '100%',
        // resizeMode: "contain",
        borderRadius: 10,
    },
    imagePlaceholder: {
        // color: '#555',
        fontSize: 16,
    },
    input: {
        flex: 1,
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 10,
        marginTop: 10,
        paddingHorizontal: 10,
        // backgroundColor: '#ffffff',
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    amountInput: {
        flex: 1,
    },
    currencySymbol: {
        fontSize: 18,
        marginLeft: 10,
    },
    label: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    datePickerButton: {
        flex: 1,
        marginBottom: 20,
        paddingVertical: 12,
        backgroundColor: '#F4511E',
        borderRadius: 5,
        alignItems: 'center',
    },
    dateText: {
        color: '#fff',
        fontSize: 16,
    },
    timeInputsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 60,
    },
    timeInputGroup: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    timeInput: {
        flex: 1,
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        // backgroundColor: '#ffffff',
    },
    timeUnit: {
        fontSize: 16,
        marginLeft: 8,
    },
});

export default UploadReceiptScreen;
