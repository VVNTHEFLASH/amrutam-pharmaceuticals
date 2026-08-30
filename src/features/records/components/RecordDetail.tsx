import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { HealthRecord } from '@/types/domain';

interface RecordDetailProps {
  record: HealthRecord;
  onBack: () => void;
}

export function RecordDetail({ record, onBack }: RecordDetailProps) {
  return (
    <View style={s.container}>
      <Pressable style={s.backButton} onPress={onBack}>
        <ThemedText type="linkPrimary">← Back to Records</ThemedText>
      </Pressable>

      <ScrollView contentContainerStyle={s.scroll}>
        <ThemedView type="backgroundElement" style={s.card}>
          <ThemedText type="subtitle" style={s.title}>
            {record.type} Details
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={s.meta}>
            Record ID: {record.id} • Date: {record.date}
          </ThemedText>

          <View style={s.divider} />

          <View style={s.row}>
            <ThemedText type="small" style={s.label}>
              Patient Name:
            </ThemedText>
            <ThemedText type="default" style={s.value}>
              {record.patientName}
            </ThemedText>
          </View>

          <View style={s.row}>
            <ThemedText type="small" style={s.label}>
              Doctor / Practitioner:
            </ThemedText>
            <ThemedText type="default" style={s.value}>
              {record.doctorName}
            </ThemedText>
          </View>

          <View style={s.divider} />

          <View style={s.section}>
            <ThemedText type="default" style={{ fontWeight: 'bold', marginBottom: 4 }}>
              Diagnosis
            </ThemedText>
            <ThemedText type="small">{record.diagnosis}</ThemedText>
          </View>

          <View style={s.section}>
            <ThemedText type="default" style={{ fontWeight: 'bold', marginBottom: 4 }}>
              Treatment Plan
            </ThemedText>
            <ThemedText type="small">{record.treatment}</ThemedText>
          </View>

          <View style={s.section}>
            <ThemedText type="default" style={{ fontWeight: 'bold', marginBottom: 4 }}>
              Prescription Detail
            </ThemedText>
            <ThemedText type="small" style={s.prescriptionBox}>
              {record.prescription}
            </ThemedText>
          </View>

          {record.attachmentUrl && (
            <View style={s.section}>
              <ThemedText type="default" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                Attachment File
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                URL: {record.attachmentUrl}
              </ThemedText>
            </View>
          )}

          <View style={s.divider} />

          <View style={s.tagSection}>
            <ThemedText type="small" style={s.label}>
              Tags:
            </ThemedText>
            <View style={s.tagList}>
              {record.tags.map((tag, idx) => (
                <View key={`${tag}-${idx}`} style={s.tagBadge}>
                  <ThemedText type="small" style={{ color: '#fff' }}>
                    {tag}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ThemedView>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: Spacing.two },
  backButton: { marginBottom: Spacing.three, paddingVertical: Spacing.one },
  scroll: { paddingBottom: Spacing.four },
  card: { padding: Spacing.four, borderRadius: Spacing.three },
  title: { fontWeight: '600', marginBottom: Spacing.one },
  meta: { marginBottom: Spacing.two },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.one },
  label: { color: '#666' },
  value: { fontWeight: '500' },
  section: { marginVertical: Spacing.two },
  prescriptionBox: { padding: Spacing.two, backgroundColor: '#f9f9f9', borderRadius: 4, fontStyle: 'italic', color: '#333' },
  tagSection: { marginTop: Spacing.one },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagBadge: { backgroundColor: '#208AEF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});
