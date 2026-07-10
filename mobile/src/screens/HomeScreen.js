import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMonth, getYear } from 'date-fns';
import { getTransactions, getMonthlySummary, deleteTransaction } from '../db/localDb';
import MonthSelector from '../components/MonthSelector';
import SummaryCard from '../components/SummaryCard';
import TransactionItem from '../components/TransactionItem';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (d = date) => {
    try {
      const month = getMonth(d) + 1;
      const year = getYear(d);
      const [summaryData, txList] = await Promise.all([
        getMonthlySummary(user.id, month, year),
        getTransactions(user.id, { month, year }),
      ]);
      setSummary(summaryData);
      const sliced = Array.isArray(txList) ? txList.slice(0, 5) : [];
      setTransactions(sliced);
    } catch (err) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, user.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData(date);
    }, [date])
  );

  const handleMonthChange = (newDate) => {
    setDate(newDate);
    setLoading(true);
    fetchData(newDate);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(date);
  };

  const income = parseFloat(summary?.totalIncome || 0);
  const expenses = parseFloat(summary?.totalExpenses || 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(0) : '0';

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'}</Text>
          <Text style={styles.subGreeting}>Here's your overview</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.navigate('Yearly')}>
            <Ionicons name="calendar-outline" size={26} color="#6C63FF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.navigate('AddTransaction')}>
            <Ionicons name="add-circle" size={28} color="#6C63FF" />
          </TouchableOpacity>
        </View>
      </View>

      <MonthSelector date={date} onChange={handleMonthChange} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6C63FF" />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardsRow}>
            <SummaryCard label="Income" amount={income} color="#4CAF50" />
            <SummaryCard label="Expenses" amount={expenses} color="#F44336" />
          </View>
          <View style={styles.cardsRow}>
            <SummaryCard label="Balance" amount={balance} color="#6C63FF" />
            <SummaryCard label="Savings" amount={balance} color="#FF9800" subtitle={`${savingsRate}% of income`} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {transactions.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={40} color="#ccc" />
                <Text style={styles.emptyText}>No transactions this month</Text>
              </View>
            ) : (
              <View style={styles.txList}>
                {transactions.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    onEdit={(t) => navigation.navigate('AddTransaction', { transaction: t })}
                    onDelete={(t) => {
                      Alert.alert('Delete Transaction', 'Are you sure?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await deleteTransaction(user.id, t.id);
                              fetchData(date);
                            } catch {
                              Alert.alert('Error', 'Failed to delete');
                            }
                          },
                        },
                      ]);
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTransaction')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  greeting: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  subGreeting: { fontSize: 13, color: '#666', marginTop: 2 },
  logoutBtn: { padding: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  cardsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8 },
  section: { marginTop: 16, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  seeAll: { fontSize: 13, color: '#6C63FF', fontWeight: '600' },
  txList: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 12, overflow: 'hidden' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#999', marginTop: 8, fontSize: 14 },
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
});
