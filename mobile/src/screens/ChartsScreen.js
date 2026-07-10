import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Dimensions, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { format, subMonths, getMonth, getYear } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getMonthlySummary, getTransactions } from '../db/localDb';
import MonthSelector from '../components/MonthSelector';
import TransactionItem from '../components/TransactionItem';

const { width } = Dimensions.get('window');
const CHART_W = width - 48;

const EXPENSE_COLORS = ['#F44336','#FF9800','#E91E63','#FF5722','#9C27B0','#673AB7','#F06292','#FFB74D'];
const INCOME_COLORS  = ['#4CAF50','#2196F3','#00BCD4','#8BC34A','#009688','#3F51B5','#1DE9B6','#76FF03'];

const parseDate = (d) => {
  if (Array.isArray(d)) return new Date(d[0], d[1] - 1, d[2]);
  return new Date(d + 'T00:00:00');
};

const base = {
  backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
  decimalPlaces: 0, labelColor: () => '#bbb',
  color: (o = 1) => `rgba(108, 99, 255, ${o})`,
  propsForBackgroundLines: { stroke: '#F5F5F5' },
};

const fmt = (n) =>
  `€${Math.abs(parseFloat(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── SVG Donut chart ──────────────────────────────────────────────────────────
const DONUT_SIZE = 220;
const RADIUS     = 80;
const INNER_R    = 52;
const CX = DONUT_SIZE / 2;
const CY = DONUT_SIZE / 2;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const gap = 1.2; // degrees gap between slices
  const s = startAngle + gap / 2;
  const e = endAngle   - gap / 2;
  const s1 = polarToCartesian(cx, cy, r,      s);
  const e1 = polarToCartesian(cx, cy, r,      e);
  const s2 = polarToCartesian(cx, cy, INNER_R, s);
  const e2 = polarToCartesian(cx, cy, INNER_R, e);
  const large = e - s > 180 ? 1 : 0;
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${r} ${r} 0 ${large} 1 ${e1.x} ${e1.y}`,
    `L ${e2.x} ${e2.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${s2.x} ${s2.y}`,
    'Z',
  ].join(' ');
}

function DonutChart({ data, total, activeIndex, onSlicePress, centerLabel, centerSub }) {
  let cursor = 0;
  const segments = data.map((d) => {
    const pct   = total > 0 ? d.amount / total : 0;
    const start = cursor;
    cursor += pct * 360;
    return { ...d, pct, startAngle: start, endAngle: cursor };
  });

  return (
    <View style={pie.donutWrap}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        <Circle cx={CX} cy={CY} r={INNER_R} fill="#fff" />
        {segments.map((seg, i) => {
          const isActive = activeIndex === null || activeIndex === i;
          return (
            <Path
              key={i}
              d={arcPath(CX, CY, RADIUS, seg.startAngle, seg.endAngle)}
              fill={seg.color}
              opacity={isActive ? 1 : 0.25}
              onPress={() => onSlicePress(seg, i)}
            />
          );
        })}
        {/* Center text */}
        <G>
          <Circle cx={CX} cy={CY} r={INNER_R - 2} fill="#fff" />
        </G>
      </Svg>
      {/* Center label overlay */}
      <View style={pie.centerOverlay} pointerEvents="none">
        <Text style={pie.centerLabel}>{centerLabel}</Text>
        <Text style={pie.centerSub}>{centerSub}</Text>
      </View>
    </View>
  );
}

function DonutPie({ data, onSlicePress }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const total = data.reduce((s, d) => s + d.amount, 0);

  if (total === 0 || data.length === 0) return <Empty text="No data this month" />;

  const activeSeg = activeIndex !== null ? data[activeIndex] : null;
  const pctActive = activeSeg ? (activeSeg.amount / total) * 100 : null;

  const centerLabel = activeSeg ? `${pctActive.toFixed(1)}%` : `${data.length}`;
  const centerSub   = activeSeg ? activeSeg.name : 'categories';

  const handlePress = (seg, i) => {
    const next = activeIndex === i ? null : i;
    setActiveIndex(next);
    if (next !== null) onSlicePress(seg);
  };

  return (
    <View style={pie.container}>
      <DonutChart
        data={data}
        total={total}
        activeIndex={activeIndex}
        onSlicePress={handlePress}
        centerLabel={centerLabel}
        centerSub={centerSub}
      />

      {/* Tooltip — visible when a slice is selected */}
      {activeSeg ? (
        <View style={[pie.tooltip, { borderLeftColor: activeSeg.color }]}>
          <View style={pie.tooltipLeft}>
            <View style={[pie.tooltipDot, { backgroundColor: activeSeg.color }]} />
            <View>
              <Text style={pie.tooltipName}>{activeSeg.name}</Text>
              <Text style={pie.tooltipHint}>Tap again to deselect · tap legend to view transactions</Text>
            </View>
          </View>
          <View style={pie.tooltipRight}>
            <Text style={[pie.tooltipAmt, { color: activeSeg.color }]}>{fmt(activeSeg.amount)}</Text>
            <Text style={pie.tooltipPct}>{pctActive.toFixed(1)}% of total</Text>
          </View>
        </View>
      ) : (
        <Text style={pie.tapHint}>Tap a slice to see details</Text>
      )}

      {/* Legend */}
      <View style={pie.legend}>
        {data.map((seg, i) => {
          const pct      = total > 0 ? (seg.amount / total) * 100 : 0;
          const isActive = activeIndex === null || activeIndex === i;
          return (
            <TouchableOpacity
              key={i}
              style={[pie.legendRow, !isActive && { opacity: 0.3 }]}
              onPress={() => handlePress(seg, i)}
            >
              <View style={[pie.dot, { backgroundColor: seg.color }]} />
              <View style={pie.legendInfo}>
                <Text style={pie.legendName}>{seg.name}</Text>
                <Text style={pie.legendAmt}>{fmt(seg.amount)}</Text>
              </View>
              <View style={pie.legendRight}>
                <Text style={[pie.legendPct, { color: seg.color }]}>{pct.toFixed(1)}%</Text>
                {activeIndex === i && (
                  <TouchableOpacity onPress={() => onSlicePress(seg)} style={pie.txBtn}>
                    <Text style={pie.txBtnText}>Transactions →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const pie = StyleSheet.create({
  container:     { gap: 16 },
  donutWrap:     { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  centerOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: INNER_R * 2 - 8, height: INNER_R * 2 - 8, borderRadius: INNER_R },
  centerLabel:   { fontSize: 22, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' },
  centerSub:     { fontSize: 10, color: '#999', textAlign: 'center', marginTop: 2 },
  tapHint:       { textAlign: 'center', fontSize: 11, color: '#ccc', marginVertical: 4 },
  tooltip:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F8FF', borderRadius: 12, padding: 14, borderLeftWidth: 4, marginBottom: 4 },
  tooltipLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  tooltipDot:    { width: 14, height: 14, borderRadius: 7 },
  tooltipName:   { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  tooltipHint:   { fontSize: 10, color: '#bbb', marginTop: 2 },
  tooltipRight:  { alignItems: 'flex-end', marginLeft: 8 },
  tooltipAmt:    { fontSize: 18, fontWeight: '800' },
  tooltipPct:    { fontSize: 11, color: '#999', marginTop: 2 },
  legend:        {},
  legendRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dot:           { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendInfo:    { flex: 1 },
  legendName:    { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  legendAmt:     { fontSize: 11, color: '#999', marginTop: 1 },
  legendRight:   { alignItems: 'flex-end', gap: 4 },
  legendPct:     { fontSize: 15, fontWeight: '800' },
  txBtn:         { backgroundColor: '#F0EEFF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  txBtnText:     { fontSize: 10, color: '#6C63FF', fontWeight: '700' },
});

export default function ChartsScreen({ navigation }) {
  const { user } = useAuth();
  const [date, setDate]               = useState(new Date());
  const [loading, setLoading]         = useState(true);
  const [summary, setSummary]         = useState(null);
  const [history, setHistory]         = useState([]);
  const [allTransactions, setAllTx]   = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [modalVisible, setModalVisible]          = useState(false);
  const [pieType, setPieType]                    = useState('EXPENSE');

  const fetchData = useCallback(async (d) => {
    setLoading(true);
    try {
      const month = getMonth(d) + 1;
      const year  = getYear(d);

      const histPromises = Array.from({ length: 6 }, (_, i) => {
        const past = subMonths(d, 5 - i);
        return getMonthlySummary(user.id, getMonth(past) + 1, getYear(past))
          .then((data) => ({
            label:    format(past, 'MMM'),
            income:   parseFloat(data.totalIncome   || 0),
            expenses: parseFloat(data.totalExpenses || 0),
            savings:  parseFloat(data.savingsRate   || 0),
          }));
      });

      const [summaryData, txData, ...histItems] = await Promise.all([
        getMonthlySummary(user.id, month, year),
        getTransactions(user.id, { month, year }),
        ...histPromises,
      ]);

      setSummary(summaryData);
      setHistory(histItems);
      setAllTx(Array.isArray(txData) ? txData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(date); }, [date]));

  const handleMonthChange = (d) => { setDate(d); fetchData(d); };

  const handleSlicePress = (seg) => {
    const txs = allTransactions.filter(
      (t) => t.type === pieType && t.category?.name === seg.name
    );
    setSelectedCategory({ ...seg, transactions: txs, type: pieType });
    setModalVisible(true);
  };

  // Expense pie from summary breakdown
  const expensePie = (summary?.expensesByCategory || [])
    .filter((c) => parseFloat(c.total) > 0)
    .slice(0, 8)
    .map((c, i) => ({
      name:   c.categoryName || 'Other',
      amount: parseFloat(c.total),
      color:  c.categoryColor || EXPENSE_COLORS[i % EXPENSE_COLORS.length],
    }));

  // Income pie computed from transactions
  const incomeMap = {};
  allTransactions.filter((t) => t.type === 'INCOME').forEach((t) => {
    const key   = t.category?.name || 'Other';
    const color = t.category?.color || INCOME_COLORS[Object.keys(incomeMap).length % INCOME_COLORS.length];
    if (!incomeMap[key]) incomeMap[key] = { amount: 0, color };
    incomeMap[key].amount += parseFloat(t.amount);
  });
  const incomePie = Object.entries(incomeMap).map(([name, v]) => ({ name, ...v }));

  const activePie   = pieType === 'EXPENSE' ? expensePie : incomePie;
  const activeTotal = activePie.reduce((s, c) => s + c.amount, 0);
  const totalExpenses = expensePie.reduce((s, c) => s + c.amount, 0);

  // Bar: income vs expenses 6 months
  const barData = {
    labels: history.map((h) => h.label),
    datasets: [
      { data: history.map((h) => Math.max(h.income,   0.01)), color: () => '#4CAF50', strokeWidth: 2 },
      { data: history.map((h) => Math.max(h.expenses, 0.01)), color: () => '#F44336', strokeWidth: 2 },
    ],
    legend: ['Income', 'Expenses'],
  };

  // Line: net savings per month
  const savingsLineData = {
    labels: history.map((h) => h.label),
    datasets: [{
      data: history.map((h) => Math.max(h.income - h.expenses, 0.01)),
      color: (o = 1) => `rgba(108, 99, 255, ${o})`,
      strokeWidth: 2,
    }],
  };

  // Bar: day-of-week spending pattern
  const dow = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const dowTotals = new Array(7).fill(0);
  allTransactions.filter((t) => t.type === 'EXPENSE').forEach((t) => {
    const d = parseDate(t.date);
    const idx = (d.getDay() + 6) % 7; // Monday = 0
    dowTotals[idx] += parseFloat(t.amount);
  });
  const dowBarData = {
    labels: dow,
    datasets: [{ data: dowTotals.map((v) => Math.max(v, 0.01)) }],
  };

  // Top 3 biggest expense days
  const dayMap = {};
  allTransactions.filter((t) => t.type === 'EXPENSE').forEach((t) => {
    const key = Array.isArray(t.date)
      ? `${t.date[0]}-${String(t.date[1]).padStart(2,'0')}-${String(t.date[2]).padStart(2,'0')}`
      : String(t.date).slice(0, 10);
    dayMap[key] = (dayMap[key] || 0) + parseFloat(t.amount);
  });
  const topDays = Object.entries(dayMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const income   = parseFloat(summary?.totalIncome   || 0);
  const expenses = parseFloat(summary?.totalExpenses || 0);
  const balance  = income - expenses;

  return (
    <View style={s.container}>
      <MonthSelector date={date} onChange={handleMonthChange} />

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#6C63FF" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* Summary chips */}
          <View style={s.chipRow}>
            <Chip label="Income"   value={fmt(income)}   color="#4CAF50" />
            <Chip label="Expenses" value={fmt(expenses)} color="#F44336" />
            <Chip label="Balance"  value={fmt(balance)}  color={balance >= 0 ? '#6C63FF' : '#F44336'} />
          </View>

          {/* 1 — Category pie with EXPENSE / INCOME toggle */}
          <View style={s.card}>
            <Text style={s.cardTitle}>BREAKDOWN BY CATEGORY — tap to see transactions</Text>
            {/* Toggle */}
            <View style={s.pieToggle}>
              <TouchableOpacity
                style={[s.pieTab, pieType === 'EXPENSE' && s.pieTabActiveExp]}
                onPress={() => setPieType('EXPENSE')}
              >
                <Text style={[s.pieTabText, pieType === 'EXPENSE' && { color: '#fff' }]}>
                  ↑ Expenses  {fmt(totalExpenses)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.pieTab, pieType === 'INCOME' && s.pieTabActiveInc]}
                onPress={() => setPieType('INCOME')}
              >
                <Text style={[s.pieTabText, pieType === 'INCOME' && { color: '#fff' }]}>
                  ↓ Income  {fmt(allTransactions.filter(t=>t.type==='INCOME').reduce((s,t)=>s+parseFloat(t.amount),0))}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Total label */}
            <Text style={s.pieTotal}>
              Total: <Text style={{ color: pieType === 'EXPENSE' ? '#F44336' : '#4CAF50', fontWeight: '800' }}>{fmt(activeTotal)}</Text>
            </Text>
            <DonutPie data={activePie} onSlicePress={handleSlicePress} />
          </View>

          {/* 2 — 6-month income vs expenses */}
          <Card title="6-MONTH INCOME VS EXPENSES">
            <View style={s.legend}>
              <LegendDot color="#4CAF50" label="Income" />
              <LegendDot color="#F44336" label="Expenses" />
            </View>
            <BarChart
              data={barData}
              width={CHART_W - 8}
              height={180}
              chartConfig={{ ...base, color: (o=1) => `rgba(108,99,255,${o})` }}
              fromZero withInnerLines={false} showBarTops={false}
              style={s.chart}
            />
          </Card>

          {/* 3 — Net savings per month */}
          <Card title="NET SAVINGS TREND (6 MONTHS)">
            <LineChart
              data={savingsLineData}
              width={CHART_W - 8}
              height={160}
              chartConfig={{
                ...base,
                color: (o=1) => `rgba(108,99,255,${o})`,
                fillShadowGradient: '#6C63FF',
                fillShadowGradientOpacity: 0.12,
              }}
              bezier withDots withInnerLines={false} withOuterLines={false}
              formatYLabel={(v) => `€${Math.round(parseFloat(v))}`}
              style={s.chart}
            />
          </Card>

          {/* 4 — Spending by day of week */}
          <Card title="SPENDING BY DAY OF WEEK">
            {dowTotals.every((v) => v === 0) ? (
              <Empty text="No expense data this month" />
            ) : (
              <BarChart
                data={dowBarData}
                width={CHART_W - 8}
                height={160}
                chartConfig={{ ...base, color: (o=1) => `rgba(244,67,54,${o})` }}
                fromZero withInnerLines={false} showBarTops={false}
                style={s.chart}
              />
            )}
            <Text style={s.chartNote}>Which days you tend to spend more</Text>
          </Card>

          {/* 5 — Top spending days */}
          {topDays.length > 0 && (
            <Card title="TOP SPENDING DAYS THIS MONTH">
              {topDays.map(([day, total], i) => {
                const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
                return (
                  <View key={day} style={s.topDayRow}>
                    <View style={[s.rank, { backgroundColor: i === 0 ? '#F44336' : i === 1 ? '#FF9800' : '#FFC107' }]}>
                      <Text style={s.rankText}>{i + 1}</Text>
                    </View>
                    <View style={s.topDayInfo}>
                      <Text style={s.topDayDate}>{format(new Date(day + 'T00:00:00'), 'EEEE, dd MMM')}</Text>
                      <View style={s.barBg}>
                        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: i === 0 ? '#F44336' : i === 1 ? '#FF9800' : '#FFC107' }]} />
                      </View>
                    </View>
                    <Text style={s.topDayAmt}>{fmt(total)}</Text>
                  </View>
                );
              })}
            </Card>
          )}

          {/* 6 — Expense breakdown bars */}
          {expensePie.length > 0 && (
            <Card title="EXPENSE BREAKDOWN">
              {expensePie.map((c) => {
                const pct = totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0;
                return (
                  <TouchableOpacity key={c.name} style={s.catRow} onPress={() => handleSlicePress(c)}>
                    <View style={[s.catDot, { backgroundColor: c.color }]} />
                    <View style={s.catInfo}>
                      <View style={s.catTopRow}>
                        <Text style={s.catName}>{c.name}</Text>
                        <Text style={s.catAmt}>{fmt(c.amount)}</Text>
                      </View>
                      <View style={s.barBg}>
                        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: c.color }]} />
                      </View>
                      <Text style={s.pct}>{pct.toFixed(1)}%</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Card>
          )}

        </ScrollView>
      )}

      {/* Category transactions modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <View style={[s.modalDot, { backgroundColor: selectedCategory?.color }]} />
              <Text style={s.modalTitle}>{selectedCategory?.name}</Text>
              <Text style={[s.modalTotal, { color: selectedCategory?.color }]}>
                {fmt(selectedCategory?.amount)}
              </Text>
            </View>
            <ScrollView style={s.modalList} showsVerticalScrollIndicator={false}>
              {(selectedCategory?.transactions || []).length === 0 ? (
                <Text style={s.modalEmpty}>No transactions found</Text>
              ) : (
                (selectedCategory?.transactions || [])
                  .sort((a, b) => parseDate(b.date) - parseDate(a.date))
                  .map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      onEdit={() => { setModalVisible(false); navigation.navigate('AddTransaction', { transaction: tx }); }}
                      onDelete={() => setModalVisible(false)}
                    />
                  ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Card({ title, children }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Empty({ text }) {
  return <View style={s.empty}><Text style={s.emptyText}>{text}</Text></View>;
}
function Chip({ label, value, color }) {
  return (
    <View style={[s.chip, { borderColor: color }]}>
      <Text style={s.chipLabel}>{label}</Text>
      <Text style={[s.chipValue, { color }]}>{value}</Text>
    </View>
  );
}
function LegendDot({ color, label }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8F8FF' },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:      { padding: 16, paddingBottom: 100 },

  pieToggle:       { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pieTab:          { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: '#F5F5F5' },
  pieTabActiveExp: { backgroundColor: '#F44336' },
  pieTabActiveInc: { backgroundColor: '#4CAF50' },
  pieTabText:      { fontSize: 12, fontWeight: '700', color: '#666' },
  pieTotal:        { fontSize: 12, color: '#999', marginBottom: 12, textAlign: 'center' },

  chipRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  chip:         { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 10, backgroundColor: '#fff', alignItems: 'center' },
  chipLabel:    { fontSize: 10, color: '#999', fontWeight: '600', marginBottom: 2 },
  chipValue:    { fontSize: 13, fontWeight: '800' },

  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle:    { fontSize: 10, fontWeight: '700', color: '#ccc', letterSpacing: 1.2, marginBottom: 12 },
  chart:        { borderRadius: 8, marginLeft: -8 },
  chartNote:    { fontSize: 11, color: '#bbb', marginTop: 6, textAlign: 'center' },

  legend:       { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  legendText:   { fontSize: 12, color: '#666' },

  empty:        { alignItems: 'center', paddingVertical: 24 },
  emptyText:    { color: '#bbb', fontSize: 13 },

  topDayRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rank:         { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  rankText:     { color: '#fff', fontSize: 12, fontWeight: '800' },
  topDayInfo:   { flex: 1 },
  topDayDate:   { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 4 },
  topDayAmt:    { fontSize: 13, fontWeight: '700', color: '#F44336', marginLeft: 8 },

  catRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  catDot:       { width: 10, height: 10, borderRadius: 5, marginRight: 12, marginTop: 3 },
  catInfo:      { flex: 1 },
  catTopRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName:      { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  catAmt:       { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  barBg:        { height: 5, backgroundColor: '#F0F0F0', borderRadius: 3 },
  barFill:      { height: 5, borderRadius: 3 },
  pct:          { fontSize: 10, color: '#999', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  modalHandle:  { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 },
  modalDot:     { width: 12, height: 12, borderRadius: 6 },
  modalTitle:   { flex: 1, fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  modalTotal:   { fontSize: 16, fontWeight: '800' },
  modalList:    {},
  modalEmpty:   { textAlign: 'center', color: '#bbb', padding: 24 },
});
