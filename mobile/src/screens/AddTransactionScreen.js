import React, { useState, useEffect } from 'react';
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
import { format, getDaysInMonth, getMonth, getYear } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getCategories, createTransaction, updateTransaction } from '../db/localDb';
import CategoryPicker from '../components/CategoryPicker';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AddTransactionScreen({ navigation, route }) {
  const { user } = useAuth();
  const editTx = route?.params?.transaction;
  const [type, setType] = useState(editTx?.type || 'EXPENSE');
  const [amount, setAmount] = useState(editTx ? String(editTx.amount) : '');
  const [description, setDescription] = useState(editTx?.description || '');
  const [selectedCategory, setSelectedCategory] = useState(editTx?.category || null);
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const parseEditDate = (d) => {
    if (!d) return today;
    if (Array.isArray(d)) return new Date(d[0], d[1] - 1, d[2]);
    return new Date(d + 'T00:00:00');
  };
  const editDate = parseEditDate(editTx?.date);
  const [day, setDay]     = useState(editTx ? editDate.getDate()     : today.getDate());
  const [month, setMonth] = useState(editTx ? editDate.getMonth()    : today.getMonth());
  const [year, setYear]   = useState(editTx ? editDate.getFullYear() : today.getFullYear());

  useEffect(() => {
    fetchCategories();
  }, [type]);

  const fetchCategories = async () => {
    try {
      setLoadingCats(true);
      const all = await getCategories(user.id);
      setCategories(all.filter((c) => c.type === type));
    } catch {
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoadingCats(false);
    }
  };

  const handleTypeChange = (t) => {
    setType(t);
    setSelectedCategory(null);
  };

  const daysInMonth = getDaysInMonth(new Date(year, month, 1));
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const adjustDay = (dir) => {
    setDay((d) => {
      const next = d + dir;
      if (next < 1) return daysInMonth;
      if (next > daysInMonth) return 1;
      return next;
    });
  };

  const adjustMonth = (dir) => {
    setMonth((m) => {
      const next = m + dir;
      if (next < 0) { setYear((y) => y - 1); return 11; }
      if (next > 11) { setYear((y) => y + 1); return 0; }
      return next;
    });
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Validation', 'Please select a category');
      return;
    }

    const dateStr = format(new Date(year, month, Math.min(day, daysInMonth)), 'yyyy-MM-dd');

    setSaving(true);
    try {
      const payload = {
        type,
        amount: numAmount,
        description: description.trim(),
        categoryId: selectedCategory.id,
        date: dateStr,
      };

      if (editTx) {
        await updateTransaction(user.id, editTx.id, payload);
      } else {
        await createTransaction(user.id, payload);
      }

      navigation.goBack();
    } catch (err) {
      const msg = err.message || 'Failed to save transaction';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editTx ? 'Edit Transaction' : 'New Transaction'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.amountSection}>
          <Text style={styles.currencySymbol}>€</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#ccc"
          />
        </View>

        <View style={styles.typeToggle}>
          {['EXPENSE', 'INCOME'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t && styles.typeBtnActive(t)]}
              onPress={() => handleTypeChange(t)}
            >
              <Ionicons
                name={t === 'INCOME' ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={18}
                color={type === t ? '#fff' : '#666'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                {t === 'INCOME' ? 'Income' : 'Expense'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          {loadingCats ? (
            <ActivityIndicator color="#6C63FF" style={{ paddingVertical: 20 }} />
          ) : (
            <CategoryPicker
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={styles.descInput}
            placeholder="What was this for?"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Day</Text>
              <View style={styles.datePicker}>
                <TouchableOpacity onPress={() => adjustDay(-1)} style={styles.dateArrow}>
                  <Ionicons name="chevron-back" size={18} color="#6C63FF" />
                </TouchableOpacity>
                <Text style={styles.dateValue}>{String(day).padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => adjustDay(1)} style={styles.dateArrow}>
                  <Ionicons name="chevron-forward" size={18} color="#6C63FF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Month</Text>
              <View style={styles.datePicker}>
                <TouchableOpacity onPress={() => adjustMonth(-1)} style={styles.dateArrow}>
                  <Ionicons name="chevron-back" size={18} color="#6C63FF" />
                </TouchableOpacity>
                <Text style={styles.dateValue}>{MONTHS[month]}</Text>
                <TouchableOpacity onPress={() => adjustMonth(1)} style={styles.dateArrow}>
                  <Ionicons name="chevron-forward" size={18} color="#6C63FF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Year</Text>
              <View style={styles.datePicker}>
                <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={styles.dateArrow}>
                  <Ionicons name="chevron-back" size={18} color="#6C63FF" />
                </TouchableOpacity>
                <Text style={styles.dateValue}>{year}</Text>
                <TouchableOpacity onPress={() => setYear((y) => y + 1)} style={styles.dateArrow}>
                  <Ionicons name="chevron-forward" size={18} color="#6C63FF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{editTx ? 'Update Transaction' : 'Save Transaction'}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  currencySymbol: { fontSize: 32, fontWeight: '700', color: '#6C63FF', marginRight: 4 },
  amountInput: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1A1A2E',
    minWidth: 120,
    textAlign: 'center',
  },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  typeBtnActive: (type) => ({
    backgroundColor: type === 'INCOME' ? '#4CAF50' : '#F44336',
  }),
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
  typeBtnTextActive: { color: '#fff' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  descInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
    minHeight: 60,
  },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  dateField: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 11, color: '#666', fontWeight: '600', marginBottom: 8 },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateArrow: { padding: 8 },
  dateValue: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', minWidth: 36, textAlign: 'center' },
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
