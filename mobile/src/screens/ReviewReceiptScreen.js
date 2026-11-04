import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import * as Crypto from 'expo-crypto';
import { findOrCreateExpenseCategory, submitReceipt } from '../api/backendSync';
import { useAuth } from '../context/AuthContext';
import { getCategories, createReceiptTransaction } from '../db/localDb';

const TOLERANCE = 0.02;

const parseAmount = (text) => {
  const value = parseFloat(String(text ?? '').replace(',', '.'));
  return Number.isFinite(value) ? value : null;
};

const WARNING_TEXT = {
  NO_ITEMS: 'No items were found. Add them by hand.',
  NO_TOTAL: 'No total was found on the receipt. The total is the sum of the items.',
  TOTAL_MISMATCH: 'The items do not add up to the total printed on the receipt. An item may be missing or misread.',
};

let nextKey = 0;
const newItem = (item = {}) => ({
  key: String(nextKey++),
  rawName: item.rawName || '',
  quantity: item.quantity ?? null,
  lineTotal: item.lineTotal != null ? String(item.lineTotal) : '',
});

export default function ReviewReceiptScreen({ navigation, route }) {
  const { parsed, rows } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const idempotencyKey = useRef(Crypto.randomUUID()).current;
  // Same id in the local database and in the backend, so a later backup sync does not duplicate it.
  const transactionId = useRef(Crypto.randomUUID()).current;

  const [merchant, setMerchant] = useState(parsed.merchant || '');
  const [dateText, setDateText] = useState(parsed.date || format(new Date(), 'yyyy-MM-dd'));
  // null = the total follows the items; a string = the user typed it.
  const [manualTotal, setManualTotal] = useState(null);
  const [discount, setDiscount] = useState(parsed.discountAmount ? String(parsed.discountAmount) : '');
  const [items, setItems] = useState(() => parsed.items.map(newItem));
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await getCategories(user.id);
        setCategories(all.filter((c) => c.type === 'EXPENSE'));
      } catch (e) {
        Alert.alert('Error', e.message || 'Could not load categories');
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const { itemsSum, expectedTotal } = useMemo(() => {
    const sum = items.reduce((acc, item) => acc + (parseAmount(item.lineTotal) || 0), 0);
    return { itemsSum: sum, expectedTotal: sum - (parseAmount(discount) || 0) };
  }, [items, discount]);

  const total = manualTotal ?? expectedTotal.toFixed(2);
  const difference = expectedTotal - (parseAmount(total) || 0);

  const updateItem = (key, patch) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const handleSave = async () => {
    const totalValue = parseAmount(total);
    const validItems = items.filter((item) => item.rawName.trim() && parseAmount(item.lineTotal) !== null);

    if (!merchant.trim()) return Alert.alert('Validation', 'Enter the merchant name');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return Alert.alert('Validation', 'Date must be YYYY-MM-DD');
    if (!categoryId) return Alert.alert('Validation', 'Select a category');
    if (totalValue === null || totalValue <= 0) return Alert.alert('Validation', 'Enter a valid total');
    if (validItems.length === 0) return Alert.alert('Validation', 'Add at least one item');
    if (Math.abs(difference) > TOLERANCE) {
      return Alert.alert('Validation', 'The items do not add up to the total. Fix the amounts first.');
    }

    setSaving(true);
    try {
      const category = categories.find((c) => c.id === categoryId);
      const backendCategoryId = await findOrCreateExpenseCategory(category);
      await submitReceipt(
        {
          transactionId,
          merchant: merchant.trim(),
          date: dateText,
          categoryId: backendCategoryId,
          total: totalValue,
          discountAmount: parseAmount(discount) || 0,
          items: validItems.map((item) => ({
            rawName: item.rawName.trim(),
            quantity: item.quantity,
            lineTotal: parseAmount(item.lineTotal),
          })),
        },
        idempotencyKey,
      );
      await createReceiptTransaction(user.id, {
        id: transactionId,
        amount: totalValue,
        description: merchant.trim(),
        date: dateText,
        categoryId,
        items: validItems.map((item) => ({
          name: item.rawName.trim(),
          quantity: item.quantity,
          amount: parseAmount(item.lineTotal),
        })),
      });
      Alert.alert('Saved', 'Receipt saved.', [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }]);
    } catch (e) {
      Alert.alert('Could not save', e.response?.data?.message || e.message || 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review receipt</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {parsed.warnings.map((code) => (
          <View key={code} style={styles.warning}>
            <Ionicons name="warning-outline" size={18} color="#B26A00" style={{ marginRight: 8 }} />
            <Text style={styles.warningText}>{WARNING_TEXT[code] || code}</Text>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.label}>Merchant</Text>
          <TextInput style={styles.input} value={merchant} onChangeText={setMerchant} placeholder="Store name" />
          <Text style={[styles.label, { marginTop: 12 }]}>Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={dateText} onChangeText={setDateText} placeholder="2026-11-03" />
          <Text style={[styles.label, { marginTop: 12 }]}>Category</Text>
          {categories.length === 0 && (
            <Text style={styles.categoryRequired}>No expense categories. Create one in the Categories tab.</Text>
          )}
          {categories.length > 0 && !categoryId && (
            <Text style={styles.categoryRequired}>Choose a category before saving</Text>
          )}
          <View style={styles.chipWrap}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, categoryId === c.id && styles.chipActive]}
                onPress={() => setCategoryId(c.id)}
              >
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                  {c.icon} {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Items</Text>
          {items.map((item) => (
            <View key={item.key} style={styles.itemBlock}>
              <View style={styles.itemRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={item.rawName}
                  onChangeText={(text) => updateItem(item.key, { rawName: text })}
                  placeholder="Item"
                />
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  value={item.lineTotal}
                  onChangeText={(text) => updateItem(item.key, { lineTotal: text })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
                <TouchableOpacity onPress={() => setItems((cur) => cur.filter((i) => i.key !== item.key))}>
                  <Ionicons name="trash-outline" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addItemBtn} onPress={() => setItems((cur) => [...cur, newItem()])}>
            <Ionicons name="add" size={18} color="#6C63FF" />
            <Text style={styles.addItemText}>Add item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Discounts</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={discount}
              onChangeText={setDiscount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Total</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={total}
              onChangeText={setManualTotal}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
          <Text style={[styles.sumText, Math.abs(difference) > TOLERANCE && styles.sumTextError]}>
            Items: {itemsSum.toFixed(2)}
            {Math.abs(difference) > TOLERANCE ? `  (difference ${difference.toFixed(2)})` : '  (matches)'}
          </Text>
          {parsed.printedTotal != null && Math.abs(parsed.printedTotal - expectedTotal) > TOLERANCE && (
            <Text style={styles.sumTextError}>Total read from the receipt: {parsed.printedTotal.toFixed(2)}</Text>
          )}
          {manualTotal !== null && (
            <TouchableOpacity onPress={() => setManualTotal(null)}>
              <Text style={styles.useSumText}>Use the sum of the items as total</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.rawToggle} onPress={() => setShowRaw((v) => !v)}>
          <Text style={styles.rawToggleText}>{showRaw ? 'Hide' : 'Show'} recognized text</Text>
        </TouchableOpacity>
        {showRaw && (
          <View style={styles.section}>
            {rows.map((row, index) => (
              <Text key={index} style={styles.rawRow}>
                {row}
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save receipt</Text>}
        </TouchableOpacity>
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8FF' },
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
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E0',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
  },
  warningText: { flex: 1, color: '#B26A00', fontSize: 13 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
  },
  amountInput: { width: 84, textAlign: 'right' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F5',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: '#6C63FF' },
  chipText: { fontSize: 13, color: '#444' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  itemBlock: { marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  addItemText: { color: '#6C63FF', fontWeight: '600', marginLeft: 4 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sumText: { fontSize: 13, color: '#4CAF50', textAlign: 'right' },
  sumTextError: { color: '#F44336', textAlign: 'right' },
  categoryRequired: { color: '#F44336', fontSize: 13, marginBottom: 6 },
  useSumText: { color: '#6C63FF', fontSize: 13, fontWeight: '600', textAlign: 'right', marginTop: 6 },
  rawToggle: { alignItems: 'center', paddingVertical: 12 },
  rawToggleText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  rawRow: { fontSize: 12, color: '#444', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 2 },
  saveBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
