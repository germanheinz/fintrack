import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const formatAmount = (value) => {
  const num = parseFloat(value) || 0;
  return `€ ${Math.abs(num).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function SummaryCard({ label, amount, color, subtitle }) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, { color }]}>{formatAmount(amount)}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    borderTopWidth: 3,
    minWidth: 80,
  },
  label: { fontSize: 11, color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  amount: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  subtitle: { fontSize: 11, color: '#666', marginTop: 4 },
});
