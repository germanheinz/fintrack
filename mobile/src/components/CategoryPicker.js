import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function CategoryPicker({ categories, selected, onSelect }) {
  if (!categories || categories.length === 0) {
    return <Text style={s.empty}>No categories available</Text>;
  }

  return (
    <View style={s.grid}>
      {categories.map((item) => {
        const isSelected = selected?.id === item.id;
        const bg = item.color || '#6C63FF';
        return (
          <TouchableOpacity
            key={String(item.id)}
            style={[s.item, isSelected && s.itemSelected]}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
          >
            <View style={[s.iconCircle, { backgroundColor: isSelected ? bg : bg + '22' }]}>
              <Text style={s.emoji}>{item.icon || '💰'}</Text>
            </View>
            <Text style={[s.name, isSelected && { color: '#6C63FF', fontWeight: '700' }]} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid:        { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  item:        { width: '25%', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', marginBottom: 8 },
  itemSelected:{ borderColor: '#6C63FF', backgroundColor: '#F0EEFF' },
  iconCircle:  { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  emoji:       { fontSize: 20 },
  name:        { fontSize: 11, color: '#666', textAlign: 'center' },
  empty:       { color: '#bbb', fontSize: 13, paddingVertical: 16, textAlign: 'center' },
});
