import React, { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { RecordDetail } from '@/features/records/components/RecordDetail';
import { useRecords } from '@/features/records/hooks/useRecords';
import { useTheme } from '@/hooks/use-theme';
import { HealthRecordType } from '@/types/api';
import { HealthRecord } from '@/types/domain';
import { Search, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react-native';
import { HorizontalFilterRow } from '@/components/horizontal-filter-row';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getPickerDate = () => {
    if (!localDate) return new Date();
    const parts = localDate.split('-');
    if (parts.length !== 3) return new Date();
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date();
    return new Date(year, month - 1, day);
  };

  const handleDateSelect = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      const formatted = `${yyyy}-${mm}-${dd}`;
      setLocalDate(formatted);
      updateFilters({ date: formatted, page: 1 });
    }
  };

  const handleDateDismiss = () => {
    setShowDatePicker(false);
  };

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
          <Pressable
            style={s.btn}
            accessibilityLabel="Search"
            onPress={() => updateFilters({ search: localSearch, page: 1 })}>
            <Search size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Type / Category Filters */}
        <HorizontalFilterRow>
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
        </HorizontalFilterRow>

        {/* Tag Filters */}
        <HorizontalFilterRow>
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
        </HorizontalFilterRow>

        {/* Year Filters */}
        <HorizontalFilterRow>
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
        </HorizontalFilterRow>

        {/* Month Filters */}
        <HorizontalFilterRow>
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
        </HorizontalFilterRow>

        {/* Date Filter Input */}
        <View style={s.header}>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={localDate || ''}
              onChange={(e) => {
                const selected = e.target.value; // YYYY-MM-DD
                setLocalDate(selected);
                updateFilters({ date: selected, page: 1 });
              }}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 4,
                border: '1px solid #ccc',
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                fontFamily: 'Poppins_500Medium',
                fontSize: 14,
                height: 40,
                outline: 'none',
              }}
            />
          ) : (
            <Pressable
              style={[s.dateBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              onPress={() => setShowDatePicker(true)}
              accessibilityLabel="Select date filter"
            >
              <CalendarDays size={16} color={theme.text} style={{ marginRight: 8 }} />
              <ThemedText type="smallBold" themeColor={localDate ? 'text' : 'textSecondary'}>
                {localDate ? localDate : 'Select Date'}
              </ThemedText>
            </Pressable>
          )}

          {localDate ? (
            <Pressable
              style={[s.btn, { backgroundColor: '#FF4D4F', marginLeft: 8 }]}
              onPress={() => {
                setLocalDate('');
                updateFilters({ date: '', page: 1 });
              }}
              accessibilityLabel="Clear date filter"
            >
              <ThemedText type="smallBold" style={{ color: '#fff' }}>
                Clear
              </ThemedText>
            </Pressable>
          ) : null}

          {showDatePicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={getPickerDate()}
              mode="date"
              display="default"
              onValueChange={handleDateSelect}
              onDismiss={handleDateDismiss}
              onNeutralButtonPress={handleDateDismiss}
            />
          )}
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
            contentContainerStyle={{ paddingBottom: 96 }}
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
        {totalPages > 1 && (
          <View style={s.paginationRow}>
            <Pressable
              disabled={page === 1}
              onPress={() => updateFilters({ page: page - 1 })}
              accessibilityLabel="Previous page"
              accessibilityRole="button"
              style={[
                s.pageBtn,
                { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
                page === 1 && { opacity: 0.3 },
              ]}>
              <ChevronLeft size={20} color={theme.text} />
            </Pressable>
            <View style={[s.pageIndicator, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>
                {page} / {totalPages}
              </ThemedText>
            </View>
            <Pressable
              disabled={page === totalPages}
              onPress={() => updateFilters({ page: page + 1 })}
              accessibilityLabel="Next page"
              accessibilityRole="button"
              style={[
                s.pageBtn,
                { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
                page === totalPages && { opacity: 0.3 },
              ]}>
              <ChevronRight size={20} color={theme.text} />
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.three, justifyContent: 'center', flexDirection: 'row' },
  safe: { flex: 1, maxWidth: MaxContentWidth, paddingBottom: 0 },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    marginBottom: Platform.OS === 'ios' ? 90 : 76,
  },
  pageBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
});
