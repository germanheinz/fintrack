import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getTransactionItems } from '../db/localDb';

const formatAmount = (value) =>
  `€ ${(parseFloat(value) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const parseDate = (d) => (Array.isArray(d) ? new Date(d[0], d[1] - 1, d[2]) : new Date(`${d}T00:00:00`));

export default function ReceiptDetailScreen({ navigation, route }) {
  const { transaction } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransactionItems(user.id, transaction.id)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [user.id, transaction.id]);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Receipt</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={s.summary}>
          <Text style={s.merchant}>{transaction.description || transaction.category?.name}</Text>
          <Text style={s.meta}>
            {transaction.category?.icon} {transaction.category?.name} · {format(parseDate(transaction.date), 'dd MMM yyyy')}
          </Text>
          <Text style={s.total}>{formatAmount(transaction.amount)}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Items ({items.length})</Text>
          {loading ? (
            <ActivityIndicator color="#6C63FF" style={{ paddingVertical: 20 }} />
          ) : (
            items.map((item) => (
              <View key={item.id} style={s.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{item.name}</Text>
                  {item.quantity != null && item.quantity !== 1 && <Text style={s.itemQty}>x {item.quantity}</Text>}
                </View>
                <Text style={s.itemAmount}>{formatAmount(item.amount)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  summary: { backgroundColor: '#fff', padding: 20, alignItems: 'center', marginBottom: 8 },
  merchant: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  meta: { fontSize: 13, color: '#666', marginTop: 4 },
  total: { fontSize: 32, fontWeight: '800', color: '#F44336', marginTop: 12 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 16 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemName: { fontSize: 14, color: '#1A1A2E' },
  itemQty: { fontSize: 12, color: '#999', marginTop: 2 },
  itemAmount: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
});
