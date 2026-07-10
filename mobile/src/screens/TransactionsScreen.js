import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, getMonth, getYear } from 'date-fns';
import { getTransactions, deleteTransaction } from '../db/localDb';
import MonthSelector from '../components/MonthSelector';
import TransactionItem from '../components/TransactionItem';
import { useAuth } from '../context/AuthContext';

const FILTERS = ['ALL', 'INCOME', 'EXPENSE'];

const parseDate = (d) => new Date(d + 'T00:00:00');

const groupByDate = (transactions) => {
  const map = {};
  transactions.forEach((tx) => {
    const key = tx.date;
    if (!map[key]) map[key] = [];
    map[key].push(tx);
  });
  return Object.keys(map)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({ title: key, data: map[key] }));
};

export default function TransactionsScreen({ navigation, route }) {
  const { user } = useAuth();
  const initDate = route?.params?.initialMonth
    ? new Date(route.params.initialYear, route.params.initialMonth - 1, 1)
    : new Date();
  const [date, setDate]               = useState(initDate);
  const [filter, setFilter]           = useState('ALL');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]         = useState(true);

  const fetchTransactions = useCallback(async (d, f) => {
    try {
      setLoading(true);
      const params = { month: getMonth(d) + 1, year: getYear(d) };
      if (f !== 'ALL') params.type = f;
      const list = await getTransactions(user.id, params);
      setTransactions(Array.isArray(list) ? list : []);
    } catch {
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useFocusEffect(
    useCallback(() => { fetchTransactions(date, filter); }, [date, filter])
  );

  const handleMonthChange = (d) => { setDate(d); fetchTransactions(d, filter); };
  const handleFilter = (f) => { setFilter(f); fetchTransactions(date, f); };

  const handleDelete = (tx) => {
    Alert.alert('Delete', `Delete "${tx.description || 'this transaction'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransaction(user.id, tx.id);
            fetchTransactions(date, filter);
          } catch {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  const handleEdit = (tx) => {
    navigation.navigate('AddTransaction', { transaction: tx });
  };

  const sections = groupByDate(transactions);

  return (
    <View style={s.container}>
      <MonthSelector date={date} onChange={handleMonthChange} />

      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
            onPress={() => handleFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === 'ALL' ? 'All' : f === 'INCOME' ? 'Income' : 'Expenses'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#6C63FF" /></View>
      ) : sections.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={48} color="#ccc" />
          <Text style={s.emptyText}>No transactions this month</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TransactionItem
              transaction={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          renderSectionHeader={({ section: { title } }) => {
            const d = parseDate(title);
            return (
              <View style={s.sectionHeader}>
                <Text style={s.sectionDate}>{format(d, 'EEEE, dd MMM yyyy')}</Text>
              </View>
            );
          }}
          stickySectionHeadersEnabled
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('AddTransaction')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F8F8FF' },
  filterRow:       { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filterBtn:       { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center', marginHorizontal: 3, backgroundColor: '#F5F5F5' },
  filterBtnActive: { backgroundColor: '#6C63FF' },
  filterText:      { fontSize: 13, fontWeight: '600', color: '#666' },
  filterTextActive:{ color: '#fff' },
  sectionHeader:   { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F0EEFF' },
  sectionDate:     { fontSize: 12, fontWeight: '600', color: '#6C63FF', textTransform: 'uppercase', letterSpacing: 0.5 },
  list:            { paddingBottom: 100 },
  centered:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText:       { color: '#999', marginTop: 10, fontSize: 14 },
  fab:             { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
