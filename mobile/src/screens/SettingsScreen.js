import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext';
import { exportUserData, importUserData } from '../db/localDb';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    try {
      setBusy(true);
      const data = await exportUserData(user.id);
      const json = JSON.stringify(data, null, 2);
      const stamp = new Date().toISOString().slice(0, 10);
      const fileName = `fintrack-backup-${stamp}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const uri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(uri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export FinTrack backup',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Backup saved', `File saved at:\n${uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e.message || 'Could not export data');
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (json) => {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      throw new Error('The selected file is not a valid backup');
    }
    const result = await importUserData(user.id, data);
    Alert.alert(
      'Import complete',
      `${result.categories} categories and ${result.transactions} transactions restored.`
    );
  };

  const handleImport = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];

      Alert.alert(
        'Restore backup',
        'This will replace all current categories and transactions for your account. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                setBusy(true);
                const json = await FileSystem.readAsStringAsync(asset.uri, {
                  encoding: FileSystem.EncodingType.UTF8,
                });
                await runImport(json);
              } catch (e) {
                Alert.alert('Import failed', e.message || 'Could not import data');
              } finally {
                setBusy(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Import failed', e.message || 'Could not read file');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>Backup & transfer</Text>
        <Text style={styles.hint}>
          Move your data to another phone: export a backup file here, send it to the
          other device (WhatsApp, Drive, email…) and import it there.
        </Text>

        <TouchableOpacity style={styles.card} onPress={handleExport} disabled={busy}>
          <View style={[styles.cardIcon, { backgroundColor: '#EDEBFF' }]}>
            <Ionicons name="cloud-upload-outline" size={22} color="#6C63FF" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Export data</Text>
            <Text style={styles.cardSub}>Save all your categories and transactions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#bbb" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={handleImport} disabled={busy}>
          <View style={[styles.cardIcon, { backgroundColor: '#E8F7EE' }]}>
            <Ionicons name="cloud-download-outline" size={22} color="#4CAF50" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Import data</Text>
            <Text style={styles.cardSub}>Restore from a backup file (replaces current data)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#bbb" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logout} onPress={logout} disabled={busy}>
          <Ionicons name="log-out-outline" size={20} color="#F44336" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  body: { padding: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#999', textTransform: 'uppercase', marginBottom: 8 },
  hint: { fontSize: 13, color: '#777', lineHeight: 19, marginBottom: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  cardSub: { fontSize: 12, color: '#999', marginTop: 2 },
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 24, padding: 14, borderRadius: 14,
    backgroundColor: '#FFF0F0',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#F44336' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center',
  },
});
