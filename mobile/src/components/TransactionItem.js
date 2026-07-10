import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const parseDate = (d) => {
  if (Array.isArray(d)) return new Date(d[0], d[1] - 1, d[2]);
  if (typeof d === 'string') return new Date(d);
  return new Date(d);
};

const formatAmount = (value) =>
  `€ ${Math.abs(parseFloat(value) || 0).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function TransactionItem({ transaction, onEdit, onDelete }) {
  const { type, amount, description, category } = transaction;
  const isIncome = type === 'INCOME';
  const iconBg = category?.color || (isIncome ? '#4CAF50' : '#F44336');
  const dateObj = parseDate(transaction.date);

  return (
    <TouchableOpacity style={s.row} onPress={() => onEdit && onEdit(transaction)} activeOpacity={0.75}>
      <View style={[s.iconWrap, { backgroundColor: iconBg + '22' }]}>
        <Text style={s.emoji}>{category?.icon || (isIncome ? '💰' : '💸')}</Text>
      </View>
      <View style={s.info}>
        <Text style={s.desc} numberOfLines={1}>{description || category?.name || 'Transaction'}</Text>
        <Text style={s.cat}>{category?.name || ''}</Text>
      </View>
      <View style={s.right}>
        <Text style={[s.amount, { color: isIncome ? '#4CAF50' : '#F44336' }]}>
          {isIncome ? '+' : '-'}{formatAmount(amount)}
        </Text>
        <Text style={s.date}>{format(dateObj, 'dd MMM')}</Text>
      </View>
      <TouchableOpacity onPress={() => onDelete && onDelete(transaction)} style={s.trash} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="trash-outline" size={17} color="#ccc" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  emoji:    { fontSize: 20 },
  info:     { flex: 1 },
  desc:     { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  cat:      { fontSize: 12, color: '#666', marginTop: 2 },
  right:    { alignItems: 'flex-end', marginRight: 10 },
  amount:   { fontSize: 15, fontWeight: '700' },
  date:     { fontSize: 11, color: '#666', marginTop: 2 },
  trash:    { padding: 4 },
});
