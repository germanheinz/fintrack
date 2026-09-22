import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../db/localDb';

const ICON_OPTIONS = ['🍔', '🍽️', '🚗', '🛍️', '🎬', '💊', '🏠', '⚡', '💼', '💻', '📈', '🎓', '✈️', '👕', '🏃', '🎁', '❓'];
const COLOR_OPTIONS = ['#6C63FF', '#4CAF50', '#F44336', '#FF9800', '#2196F3', '#E91E63', '#009688', '#795548'];

export default function CategoriesScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState('EXPENSE');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(ICON_OPTIONS[ICON_OPTIONS.length - 1]);
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const all = await getCategories(user.id);
      setCategories(all);
    } catch {
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [])
  );

  const handleDelete = (cat) => {
    Alert.alert('Delete Category', `Delete "${cat.name}"? This may affect existing transactions.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCategory(user.id, cat.id);
            fetchCategories();
          } catch (err) {
            Alert.alert('Cannot delete', err.message);
          }
        },
      },
    ]);
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      Alert.alert('Validation', 'Category name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(user.id, editingId, {
          name: newName.trim(),
          icon: newIcon,
          color: newColor,
        });
      } else {
        await createCategory(user.id, {
          name: newName.trim(),
          icon: newIcon,
          color: newColor,
          type: tab,
        });
      }
      closeModal();
      fetchCategories();
    } catch {
      Alert.alert('Error', editingId ? 'Failed to update category' : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setNewName('');
    setNewIcon(ICON_OPTIONS[ICON_OPTIONS.length - 1]);
    setNewColor(COLOR_OPTIONS[0]);
    setModalVisible(true);
  };

  const openEdit = (cat) => {
    setEditingId(cat.id);
    setNewName(cat.name);
    setNewIcon(cat.icon);
    setNewColor(cat.color || COLOR_OPTIONS[0]);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setNewName('');
    setNewIcon(ICON_OPTIONS[ICON_OPTIONS.length - 1]);
    setNewColor(COLOR_OPTIONS[0]);
  };

  const filtered = categories.filter((c) => c.type === tab);

  const renderItem = ({ item }) => {
    const bg = item.color || '#6C63FF';
    return (
      <TouchableOpacity
        style={styles.catRow}
        onPress={() => openEdit(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: bg + '22' }]}>
          <Text style={styles.iconEmoji}>{item.icon}</Text>
        </View>
        <View style={[styles.colorDot, { backgroundColor: bg }]} />
        <Text style={styles.catName}>{item.name}</Text>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#F44336" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {['EXPENSE', 'INCOME'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'EXPENSE' ? 'Expenses' : 'Income'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No {tab.toLowerCase()} categories</Text>
            </View>
          }
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Category' : `New ${tab === 'EXPENSE' ? 'Expense' : 'Income'} Category`}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Category name"
              value={newName}
              onChangeText={setNewName}
              placeholderTextColor="#999"
            />

            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.iconRow}>
              <View style={styles.emojiPreview}>
                <Text style={styles.emojiPreviewText}>{newIcon}</Text>
              </View>
              <TextInput
                style={styles.emojiInput}
                value={newIcon}
                onChangeText={(t) => setNewIcon(t)}
                placeholder="Type any emoji 😀"
                placeholderTextColor="#999"
                maxLength={8}
              />
            </View>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconOption, newIcon === icon && styles.iconOptionActive]}
                  onPress={() => setNewIcon(icon)}
                >
                  <Text style={styles.iconOptionEmoji}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorOption, { backgroundColor: c }, newColor === c && styles.colorOptionActive]}
                  onPress={() => setNewColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Category'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6C63FF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#6C63FF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 100 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  iconWrap: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconEmoji: { fontSize: 22 },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  catName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1A1A2E' },
  deleteBtn: { padding: 6 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  emojiPreview: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F0EEFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  emojiPreviewText: { fontSize: 26 },
  emojiInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconOptionActive: { borderColor: '#6C63FF', backgroundColor: '#F0EEFF' },
  iconOptionEmoji: { fontSize: 20 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorOption: { width: 32, height: 32, borderRadius: 16 },
  colorOptionActive: { borderWidth: 3, borderColor: '#1A1A2E' },
  saveBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
