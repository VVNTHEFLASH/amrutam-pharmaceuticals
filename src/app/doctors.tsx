import React, { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { DoctorDetail } from '@/features/consultation/components/DoctorDetail';
import { useConsultation } from '@/features/consultation/hooks/useConsultation';
import { useTheme } from '@/hooks/use-theme';
import { useClientStore } from '@/store/clientStore';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { HorizontalFilterRow } from '@/components/horizontal-filter-row';
import { Doctor } from '@/types/domain';

const SP = ['General Physician', 'Ayurvedic Specialist', 'Homeopathic Specialist', 'Dermatologist'];
const DY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorsScreen() {
  const {
    doctors,
    loading,
    error,
    totalPages,
    page,
    search,
    specialty,
    availability,
    sort,
    setFilters,
    selectedDoctor,
    selectedDate,
    slots,
    loadingSlots,
    slotsError,
    setSelectedDoctor,
    setSelectedDate,
    bookSlot,
  } = useConsultation();
  const queue = useClientStore((s) => s.bookingQueue);
  const theme = useTheme();
  const [localSearch, setLocalSearch] = useState(search);
  const [msg, setMsg] = useState<string | null>(null);

  const handleBook = async (doctor: Doctor, slotTime: string) => {
    setMsg(null);
    try {
      await bookSlot(doctor, selectedDate, slotTime);
      Platform.OS === 'web' ? alert('Booked!') : Alert.alert('Success', 'Booked!');
    } catch (err: any) {
      setMsg(err.message);
      Platform.OS === 'web' ? alert(err.message) : Alert.alert('Error', err.message);
    }
  };

  const renderDoc = ({ item }: { item: Doctor }) => (
    <Pressable
      onPress={() => {
        setSelectedDoctor(item);
        setMsg(null);
      }}
      accessibilityLabel={`Book appointment with ${item.name}`}
      accessibilityRole="button"
    >
      <ThemedView type="backgroundElement" style={s.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: Spacing.two }}>
            <ThemedText type="default" style={{ fontWeight: '600' }}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.specialty} • ₹{item.consultationFee}
            </ThemedText>
          </View>
          <ThemedText type="default" style={{ fontWeight: '600', color: '#208AEF' }}>
            Book
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );

  if (selectedDoctor) {
    return (
      <ThemedView style={s.container}>
        <SafeAreaView style={s.safe}>
          <DoctorDetail
            doctor={selectedDoctor}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            slots={slots}
            loadingSlots={loadingSlots}
            slotsError={slotsError}
            onBack={() => {
              setSelectedDoctor(null);
              setSelectedDate('2026-08-30');
            }}
            onBook={handleBook}
            bookingQueue={queue}
            bookingMessage={msg}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={s.container}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TextInput
            style={s.input}
            value={localSearch}
            onChangeText={setLocalSearch}
            onSubmitEditing={() => setFilters({ search: localSearch, page: 1 })}
            placeholder="Search..."
            placeholderTextColor="#999"
          />
          <Pressable
            style={s.btn}
            accessibilityLabel="Search"
            onPress={() => setFilters({ search: localSearch, page: 1 })}>
            <Search size={16} color="#fff" />
          </Pressable>
        </View>

        <HorizontalFilterRow>
          <Pressable
            onPress={() => setFilters({ specialty: '', page: 1 })}
            style={[s.chip, { backgroundColor: theme.backgroundElement }, !specialty && s.act]}>
            <ThemedText type="small">All Specialties</ThemedText>
          </Pressable>
          {SP.map((sp) => (
            <Pressable
              key={sp}
              onPress={() => setFilters({ specialty: sp, page: 1 })}
              style={[s.chip, { backgroundColor: theme.backgroundElement }, specialty === sp && s.act]}>
              <ThemedText type="small">{sp}</ThemedText>
            </Pressable>
          ))}
        </HorizontalFilterRow>

        <HorizontalFilterRow>
          <Pressable
            onPress={() => setFilters({ availability: '', page: 1 })}
            style={[s.chip, { backgroundColor: theme.backgroundElement }, !availability && s.act]}>
            <ThemedText type="small">Any Day</ThemedText>
          </Pressable>
          {DY.map((dy) => (
            <Pressable
              key={dy}
              onPress={() => setFilters({ availability: dy, page: 1 })}
              style={[s.chip, { backgroundColor: theme.backgroundElement }, availability === dy && s.act]}>
              <ThemedText type="small">{dy}</ThemedText>
            </Pressable>
          ))}
        </HorizontalFilterRow>

        <View style={s.sortRow}>
          {([
            { label: '★ Rating', val: 'rating_desc' },
            { label: 'Fee ↑', val: 'fee_asc' },
            { label: 'A-Z', val: 'name_asc' },
          ] as const).map((opt) => (
            <Pressable
              key={opt.val}
              onPress={() => setFilters({ sort: opt.val, page: 1 })}
              style={[s.sort, { backgroundColor: theme.backgroundElement }, sort === opt.val && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small">{opt.label}</ThemedText>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ThemedText type="small">Loading...</ThemedText>
        ) : error ? (
          <ThemedText type="small" style={{ color: 'red' }}>
            {error}
          </ThemedText>
        ) : doctors.length === 0 ? (
          <ThemedText type="small">No doctors.</ThemedText>
        ) : (
          <FlatList
            data={doctors}
            keyExtractor={(item) => item.id}
            renderItem={renderDoc}
            contentContainerStyle={{ paddingBottom: 96 }}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={s.paginationRow}>
            <Pressable
              disabled={page === 1}
              onPress={() => setFilters({ page: page - 1 })}
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
              onPress={() => setFilters({ page: page + 1 })}
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
  header: { flexDirection: 'row', gap: 8, marginVertical: 12 },
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
  chip: { paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#eee', marginRight: 8, justifyContent: 'center', height: 32 },
  act: { backgroundColor: '#208AEF' },
  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sort: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#eee' },
  actSort: { backgroundColor: '#ccc' },
  card: { padding: 12, borderRadius: 8, marginBottom: 8 },
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
