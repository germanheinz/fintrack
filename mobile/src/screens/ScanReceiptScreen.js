import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isConnectedToBackend } from '../api/backendSync';
import { recognizeRows } from '../receipts/ocr';
import { parseReceipt } from '../receipts/parseReceipt';

export default function ScanReceiptScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);

  const processImage = async (uri) => {
    setPreviewUri(uri);
    setBusy(true);
    try {
      const rows = await recognizeRows(uri);
      if (rows.length === 0) {
        Alert.alert('No text found', 'Try again with better light and the full receipt in the photo.');
        return;
      }
      navigation.navigate('ReviewReceipt', { parsed: parseReceipt(rows), rows });
    } catch (e) {
      Alert.alert('Could not read the receipt', e.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const pick = async (source) => {
    if (!(await isConnectedToBackend())) {
      Alert.alert('Backend not connected', 'Open Settings and connect to the backend first.');
      return;
    }

    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow camera access to scan receipts.');
        return;
      }
    }

    const options = { mediaTypes: ['images'], quality: 0.9 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan receipt</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + 20 }]}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.hint}>
              Put the receipt on a flat surface, with good light. The whole receipt must be in the photo.
            </Text>
          </View>
        )}

        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator size="large" color="#6C63FF" />
            <Text style={styles.busyText}>Reading receipt...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => pick('camera')}>
              <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => pick('library')}>
              <Ionicons name="images-outline" size={20} color="#6C63FF" style={{ marginRight: 8 }} />
              <Text style={styles.secondaryBtnText}>Choose from gallery</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  body: { flex: 1, padding: 20, justifyContent: 'center' },
  placeholder: { alignItems: 'center', marginBottom: 32 },
  hint: { textAlign: 'center', color: '#666', fontSize: 14, marginTop: 16, lineHeight: 20 },
  preview: { height: 320, marginBottom: 24, borderRadius: 12, backgroundColor: '#fff' },
  busy: { alignItems: 'center', paddingVertical: 24 },
  busyText: { color: '#666', marginTop: 12 },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  secondaryBtnText: { color: '#6C63FF', fontSize: 16, fontWeight: '700' },
});
