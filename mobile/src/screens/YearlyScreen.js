import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getMonthlySummary } from '../db/localDb';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmt = (n) =>
  `€${Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function YearlyScreen({ navigation }) {
  const { user } = useAuth();
  const [year, setYear]       = useState(new Date().getFullYear());
  const [months, setMonths]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchYear = useCallback(async (y) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          getMonthlySummary(user.id, i + 1, y)
            .then((data) => ({
              month: i + 1,
              income:   parseFloat(data.totalIncome   || 0),
              expenses: parseFloat(data.totalExpenses || 0),
              balance:  parseFloat(data.totalIncome   || 0) - parseFloat(data.totalExpenses || 0),
              count:    data.transactionCount || 0,
            }))
        )
      );
      setMonths(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchYear(year); }, [year]));

  const totalIncome   = months.reduce((s, m) => s + m.income,   0);
  const totalExpenses = months.reduce((s, m) => s + m.expenses, 0);
  const totalBalance  = totalIncome - totalExpenses;
  const maxExpense    = Math.max(...months.map((m) => m.expenses), 1);

  const goToMonth = (m) => {
    navigation.navigate('MainTabs', {
      screen: 'Transactions',
      params: { initialMonth: m.month, initialYear: year },
    });
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="chevron-back" size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <View style={s.yearRow}>
          <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={s.yearArrow}>
            <Ionicons name="chevron-back" size={20} color="#6C63FF" />
          </TouchableOpacity>
          <Text style={s.yearLabel}>{year}</Text>
          <TouchableOpacity onPress={() => setYear((y) => y + 1)} style={s.yearArrow}>
            <Ionicons name="chevron-forward" size={20} color="#6C63FF" />
          </TouchableOpacity>
        </View>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#6C63FF" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* Annual summary */}
          <View style={s.annualCard}>
            <Text style={s.annualTitle}>ANNUAL SUMMARY {year}</Text>
            <View style={s.annualRow}>
              <View style={s.annualItem}>
                <Text style={s.annualLabel}>Income</Text>
                <Text style={[s.annualValue, { color: '#4CAF50' }]}>{fmt(totalIncome)}</Text>
              </View>
              <View style={s.annualDivider} />
              <View style={s.annualItem}>
                <Text style={s.annualLabel}>Expenses</Text>
                <Text style={[s.annualValue, { color: '#F44336' }]}>{fmt(totalExpenses)}</Text>
              </View>
              <View style={s.annualDivider} />
              <View style={s.annualItem}>
                <Text style={s.annualLabel}>Saved</Text>
                <Text style={[s.annualValue, { color: totalBalance >= 0 ? '#6C63FF' : '#F44336' }]}>
                  {totalBalance >= 0 ? '' : '-'}{fmt(totalBalance)}
                </Text>
              </View>
            </View>

            {/* Spending bar per month */}
            <View style={s.barsContainer}>
              {months.map((m) => {
                const pct = maxExpense > 0 ? (m.expenses / maxExpense) : 0;
                const isActive = m.count > 0;
                return (
                  <TouchableOpacity key={m.month} style={s.barCol} onPress={() => isActive && goToMonth(m)}>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { height: `${Math.max(pct * 100, 4)}%`, backgroundColor: isActive ? '#F44336' : '#E0E0E0' }]} />
                    </View>
                    <Text style={[s.barLabel, isActive && { color: '#1A1A2E' }]}>{SHORT[m.month - 1]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Month cards grid */}
          <Text style={s.gridTitle}>MONTHLY DETAIL</Text>
          <View style={s.grid}>
            {months.map((m) => {
              const hasData   = m.count > 0;
              const isPositive = m.balance >= 0;
              return (
                <TouchableOpacity
                  key={m.month}
                  style={[s.monthCard, !hasData && s.monthCardEmpty]}
                  onPress={() => hasData && goToMonth(m)}
                  activeOpacity={hasData ? 0.75 : 1}
                >
                  <View style={s.monthCardTop}>
                    <Text style={s.monthName}>{MONTHS[m.month - 1]}</Text>
                    {hasData && (
                      <View style={[s.balanceBadge, { backgroundColor: isPositive ? '#E8F5E9' : '#FFEBEE' }]}>
                        <Text style={[s.balanceBadgeText, { color: isPositive ? '#4CAF50' : '#F44336' }]}>
                          {isPositive ? '+' : ''}{fmt(m.balance)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {hasData ? (
                    <>
                      <View style={s.monthRow}>
                        <Text style={s.monthRowLabel}>↑ Income</Text>
                        <Text style={[s.monthRowVal, { color: '#4CAF50' }]}>{fmt(m.income)}</Text>
                      </View>
                      <View style={s.monthRow}>
                        <Text style={s.monthRowLabel}>↓ Expenses</Text>
                        <Text style={[s.monthRowVal, { color: '#F44336' }]}>{fmt(m.expenses)}</Text>
                      </View>
                      <Text style={s.txCount}>{m.count} transaction{m.count !== 1 ? 's' : ''}</Text>
                    </>
                  ) : (
                    <Text style={s.noData}>No data</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F8F8FF' },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  back:        { padding: 4, width: 30 },
  yearRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  yearArrow:   { padding: 6 },
  yearLabel:   { fontSize: 20, fontWeight: '800', color: '#1A1A2E', minWidth: 60, textAlign: 'center' },
  content:     { padding: 16, paddingBottom: 40 },

  annualCard:  { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20 },
  annualTitle: { fontSize: 10, fontWeight: '700', color: '#ccc', letterSpacing: 1.2, marginBottom: 14 },
  annualRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  annualItem:  { flex: 1, alignItems: 'center' },
  annualDivider: { width: 1, backgroundColor: '#F0F0F0' },
  annualLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  annualValue: { fontSize: 16, fontWeight: '800' },

  barsContainer: { flexDirection: 'row', justifyContent: 'space-between', height: 80, alignItems: 'flex-end' },
  barCol:      { flex: 1, alignItems: 'center', gap: 4 },
  barTrack:    { flex: 1, width: '60%', justifyContent: 'flex-end', backgroundColor: '#F5F5F5', borderRadius: 3 },
  barFill:     { width: '100%', borderRadius: 3 },
  barLabel:    { fontSize: 9, color: '#bbb', fontWeight: '600' },

  gridTitle:   { fontSize: 10, fontWeight: '700', color: '#ccc', letterSpacing: 1.2, marginBottom: 12 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  monthCard:   { width: CARD_W, backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  monthCardEmpty: { opacity: 0.5 },
  monthCardTop:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  monthName:   { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  balanceBadge:{ borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  balanceBadgeText: { fontSize: 11, fontWeight: '700' },
  monthRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  monthRowLabel: { fontSize: 12, color: '#999' },
  monthRowVal: { fontSize: 12, fontWeight: '700' },
  txCount:     { fontSize: 10, color: '#bbb', marginTop: 6 },
  noData:      { fontSize: 12, color: '#ccc', marginTop: 8 },
});
