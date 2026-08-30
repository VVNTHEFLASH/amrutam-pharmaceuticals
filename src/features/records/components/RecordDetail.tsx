import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, Image, Linking, ActivityIndicator, Modal } from 'react-native';
import { FileText, ExternalLink, Image as ImageIcon, FileWarning, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { HealthRecord } from '@/types/domain';
import { useTheme } from '@/hooks/use-theme';
import { classifyAttachment } from '../utils/attachmentUtils';

interface RecordDetailProps {
  record: HealthRecord;
  onBack: () => void;
}

export function RecordDetail({ record, onBack }: RecordDetailProps) {
  const theme = useTheme();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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
            <ThemedText
              type="small"
              style={[s.prescriptionBox, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            >
              {record.prescription}
            </ThemedText>
          </View>

          {record.attachmentUrl && (
            <View style={s.section}>
              <ThemedText type="default" style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Attachment File
              </ThemedText>
              
              {(() => {
                const type = classifyAttachment(record.attachmentUrl!);
                const filename = record.attachmentUrl!.split('/').pop() || 'attachment';

                if (type === 'image') {
                  return (
                    <View style={s.attachmentContainer}>
                      <Pressable 
                        style={[s.previewBox, { borderColor: theme.backgroundSelected }]} 
                        onPress={() => setModalVisible(true)}
                        accessibilityLabel="View full image"
                      >
                        <Image
                          source={{ uri: record.attachmentUrl }}
                          style={s.thumbnail}
                          resizeMode="cover"
                          onLoadStart={() => setImageLoading(true)}
                          onLoadEnd={() => setImageLoading(false)}
                          onError={() => {
                            setImageLoading(false);
                            setImageError(true);
                          }}
                        />
                        {imageLoading && (
                          <View style={StyleSheet.absoluteFill}>
                            <ActivityIndicator size="small" color={theme.text} style={s.loader} />
                          </View>
                        )}
                        {imageError && (
                          <View style={s.errorPlaceholder}>
                            <ImageIcon size={24} color={theme.textSecondary} />
                            <ThemedText type="small" themeColor="textSecondary">Failed to load</ThemedText>
                          </View>
                        )}
                      </Pressable>
                      <View style={s.attachmentInfo}>
                        <ThemedText type="smallBold" numberOfLines={1}>{filename}</ThemedText>
                        <Pressable onPress={() => Linking.openURL(record.attachmentUrl!)}>
                          <ThemedText type="linkPrimary">Open original</ThemedText>
                        </Pressable>
                      </View>

                      {modalVisible && (
                        <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
                          <View style={s.modalOverlay}>
                            <Pressable style={s.closeModal} onPress={() => setModalVisible(false)} accessibilityLabel="Close full screen image">
                              <X size={24} color="#fff" />
                            </Pressable>
                            <Image
                              source={{ uri: record.attachmentUrl }}
                              style={s.fullImage}
                              resizeMode="contain"
                            />
                          </View>
                        </Modal>
                      )}
                    </View>
                  );
                }

                if (type === 'pdf') {
                  return (
                    <View style={s.attachmentContainer}>
                      <Pressable 
                        style={[s.previewBox, s.pdfBox, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]} 
                        onPress={() => Linking.openURL(record.attachmentUrl!)}
                        accessibilityLabel="Open PDF attachment"
                      >
                        <FileText size={40} color="#FF4D4F" />
                        <ThemedText type="smallBold" style={{ marginTop: 4 }}>PDF File</ThemedText>
                      </Pressable>
                      <View style={s.attachmentInfo}>
                        <ThemedText type="smallBold" numberOfLines={1}>{filename}</ThemedText>
                        <Pressable style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => Linking.openURL(record.attachmentUrl!)}>
                          <ThemedText type="linkPrimary">Open PDF </ThemedText>
                          <ExternalLink size={12} color="#208AEF" style={{ marginLeft: 4 }} />
                        </Pressable>
                      </View>
                    </View>
                  );
                }

                // Unsupported
                return (
                  <View style={s.attachmentContainer}>
                    <View style={[s.previewBox, s.fallbackBox, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}>
                      <FileWarning size={40} color={theme.textSecondary} />
                      <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 4 }}>Unsupported format</ThemedText>
                    </View>
                    <View style={s.attachmentInfo}>
                      <ThemedText type="smallBold" numberOfLines={1}>{filename}</ThemedText>
                      <Pressable onPress={() => Linking.openURL(record.attachmentUrl!)}>
                        <ThemedText type="linkPrimary">Try opening external link</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                );
              })()}
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
  scroll: { paddingBottom: 96 },
  card: { padding: Spacing.four, borderRadius: Spacing.three },
  title: { fontWeight: '600', marginBottom: Spacing.one },
  meta: { marginBottom: Spacing.two },
  divider: { height: 1, marginVertical: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.one },
  label: { color: '#666' },
  value: { fontWeight: '500' },
  section: { marginVertical: Spacing.two },
  prescriptionBox: { padding: Spacing.two, borderRadius: 4, fontStyle: 'italic' },
  tagSection: { marginTop: Spacing.one },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagBadge: { backgroundColor: '#208AEF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  previewBox: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  loader: {
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  errorPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  pdfBox: {
    padding: Spacing.two,
  },
  fallbackBox: {
    padding: Spacing.two,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModal: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
});
