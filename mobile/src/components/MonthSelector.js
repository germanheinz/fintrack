import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addMonths, subMonths } from 'date-fns';

export default function MonthSelector({ date, onChange }) {
  const prev = () => onChange(subMonths(date, 1));
  const next = () => onChange(addMonths(date, 1));
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={prev} style={styles.arrow}>
        <Ionicons name="chevron-back" size={20} color="#6C63FF" />
      </TouchableOpacity>
      <Text style={styles.label}>{format(date, 'MMMM yyyy')}</Text>
      <TouchableOpacity onPress={next} style={styles.arrow}>
        <Ionicons name="chevron-forward" size={20} color="#6C63FF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  arrow: { padding: 8 },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    minWidth: 140,
    textAlign: 'center',
  },
});
