import React, { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { RecordDetail } from '@/features/records/components/RecordDetail';
import { useRecords } from '@/features/records/hooks/useRecords';
import { useTheme } from '@/hooks/use-theme';
import { HealthRecordType } from '@/types/api';
import { HealthRecord } from '@/types/domain';

const TYPES: HealthRecordType[] = ['Prescription', 'Diagnostic Report', 'Lab Result', 'Immunization'];
const TAGS = ['Ayurveda', 'Critical', 'Routine', 'Past Illness', 'Follow-up', 'Reference'];
const YEARS = [2026, 2025, 2024, 2023];
const MONTHS = [
  { label: 'Jan', val: 1 },
  { label: 'Feb', val: 2 },
  { label: 'Mar', val: 3 },
  { label: 'Apr', val: 4 },
  { label: 'May', val: 5 },
  { label: 'Jun', val: 6 },
  { label: 'Jul', val: 7 },
  { label: 'Aug', val: 8 },
  { label: 'Sep', val: 9 },
  { label: 'Oct', val: 10 },
  { label: 'Nov', val: 11 },
  { label: 'Dec', val: 12 },
];

export default function RecordsScreen() {
  const {
    records,
    loading,
    error,
    totalPages,
    totalCount,
    page,
    filters,
    updateFilters,
    resetFilters,
    retry,
  } = useRecords();

  const theme = useTheme();

  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localDate, setLocalDate] = useState(filters.date);

  const handleResetAll = () => {
    resetFilters();
    setLocalSearch('');
    setLocalDate('');
  };

  if (selectedRecord) {
    return (
      <ThemedView style={s.container}>
        <SafeAreaView style={s.safe}>
          <RecordDetail record={selectedRecord} onBack={() => setSelectedRecord(null)} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={s.container}>
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.topBar}>
          <ThemedText type="subtitle">Health Records</ThemedText>
          <Pressable style={s.resetBtn} onPress={handleResetAll}>
            <ThemedText type="smallBold" style={{ color: '#208AEF' }}>
              Reset Filters
            </ThemedText>
          </Pressable>
        </View>

        {/* Search */}
        <View style={s.header}>
          <TextInput
            style={s.input}
            value={localSearch}
            onChangeText={setLocalSearch}
            onSubmitEditing={() => updateFilters({ search: localSearch, page: 1 })}
            placeholder="Search provider, diagnoses..."
            placeholderTextColor="#999"
          />
          <Pressable style={s.btn} onPress={() => updateFilters({ search: localSearch, page: 1 })}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              Search
            </ThemedText>
          </Pressable>
        </View>

        {/* Type / Category Filters */}
        <View style={{ height: 32, marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              onPress={() => updateFilters({ type: undefined, page: 1 })}
              style={[s.chip, { backgroundColor: theme.backgroundElement }, !filters.type && s.act]}>
              <ThemedText type="small">All Types</ThemedText>
            </Pressable>
            {TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => updateFilters({ type, page: 1 })}
                style={[s.chip, { backgroundColor: theme.backgroundElement }, filters.type === type && s.act]}>
                <ThemedText type="small">{type}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Tag Filters */}
        <View style={{ height: 32, marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              onPress={() => updateFilters({ tag: '', page: 1 })}
              style={[s.chip, { backgroundColor: theme.backgroundElement }, !filters.tag && s.act]}>
              <ThemedText type="small">All Tags</ThemedText>
            </Pressable>
            {TAGS.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => updateFilters({ tag, page: 1 })}
                style={[s.chip, { backgroundColor: theme.backgroundElement }, filters.tag === tag && s.act]}>
                <ThemedText type="small">{tag}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Year Filters */}
        <View style={{ height: 32, marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              onPress={() => updateFilters({ year: undefined, page: 1 })}
              style={[s.chip, { backgroundColor: theme.backgroundElement }, filters.year === undefined && s.act]}>
              <ThemedText type="small">All Years</ThemedText>
            </Pressable>
            {YEARS.map((yr) => (
              <Pressable
                key={yr}
                onPress={() => updateFilters({ year: yr, page: 1 })}
                style={[s.chip, { backgroundColor: theme.backgroundElement }, filters.year === yr && s.act]}>
                <ThemedText type="small">{yr}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Month Filters */}
        <View style={{ height: 32, marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              onPress={() => updateFilters({ month: undefined, page: 1 })}
              style={[s.chip, { backgroundColor: theme.backgroundElement }, filters.month === undefined && s.act]}>
              <ThemedText type="small">All Months</ThemedText>
            </Pressable>
            {MONTHS.map((mn) => (
              <Pressable
                key={mn.val}
                onPress={() => updateFilters({ month: mn.val, page: 1 })}
                style={[s.chip, { backgroundColor: theme.backgroundElement }, filters.month === mn.val && s.act]}>
                <ThemedText type="small">{mn.label}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Date Filter Input */}
        <View style={s.header}>
          <TextInput
            style={s.input}
            value={localDate}
            onChangeText={setLocalDate}
            placeholder="Date (YYYY-MM-DD)..."
            placeholderTextColor="#999"
          />
          <Pressable style={s.btn} onPress={() => updateFilters({ date: localDate, page: 1 })}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              Set Date
            </ThemedText>
          </Pressable>
        </View>

        {/* Results Info */}
        <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: 8 }}>
          Found {totalCount} records
        </ThemedText>

        {/* List / Loading / Error / Empty States */}
        {loading ? (
          <ThemedText type="small">Loading health records...</ThemedText>
        ) : error ? (
          <View style={s.center}>
            <ThemedText type="small" style={{ color: 'red', marginBottom: 8 }}>
              {error}
            </ThemedText>
            <Pressable style={s.retryBtn} onPress={retry}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>
                Retry
              </ThemedText>
            </Pressable>
          </View>
        ) : records.length === 0 ? (
          <View style={s.center}>
            <ThemedText type="small">No records found matching filters.</ThemedText>
            <Pressable style={s.retryBtn} onPress={handleResetAll}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>
                Reset Filters
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelectedRecord(item)}>
                <ThemedView type="backgroundElement" style={s.card}>
                  <View style={s.row}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="default" style={{ fontWeight: 'bold' }}>
                        {item.type} - {item.diagnosis}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Patient: {item.patientName} • Practitioner: {item.doctorName}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                        Date: {item.date} • Tags: {item.tags.join(', ')}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={{ color: '#208AEF', fontWeight: 'bold' }}>
                      View →
                    </ThemedText>
                  </View>
                </ThemedView>
              </Pressable>
            )}
          />
        )}

        {/* Pagination */}
        <View style={s.paginationRow}>
          <Pressable
            disabled={page === 1}
            onPress={() => updateFilters({ page: page - 1 })}
            style={[s.pageBtn, page === 1 && { opacity: 0.5 }]}>
            <ThemedText type="smallBold">Prev</ThemedText>
          </Pressable>
          <ThemedText type="small">
            Page {page} / {totalPages}
          </ThemedText>
          <Pressable
            disabled={page === totalPages}
            onPress={() => updateFilters({ page: page + 1 })}
            style={[s.pageBtn, page === totalPages && { opacity: 0.5 }]}>
            <ThemedText type="smallBold">Next</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.four, justifyContent: 'center', flexDirection: 'row' },
  safe: { flex: 1, maxWidth: MaxContentWidth, paddingBottom: Spacing.three },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  resetBtn: { paddingVertical: Spacing.one },
  header: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    height: 40,
    backgroundColor: '#fff',
    color: '#000',
  },
  btn: { backgroundColor: '#208AEF', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 4 },
  chip: { paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#eee', marginRight: 8, justifyContent: 'center', height: 32 },
  act: { backgroundColor: '#208AEF' },
  card: { padding: 12, borderRadius: 8, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  retryBtn: { backgroundColor: '#208AEF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 4, marginTop: 8 },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
});
