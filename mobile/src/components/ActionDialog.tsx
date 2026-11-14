import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, radius, space } from '@/theme';
import { AppText } from './AppText';
import { BigButton } from './BigButton';

/** Hộp thoại dùng được trên web và native, giữ cỡ chữ và vùng bấm của app. */
export function ActionDialog({ open, title, message, confirmLabel, onConfirm, cancelLabel, onCancel }: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel ?? onConfirm}>
      <SafeAreaView style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card} accessibilityViewIsModal>
            <AppText variant="title" accessibilityRole="header">{title}</AppText>
            <AppText>{message}</AppText>
            <BigButton label={confirmLabel} onPress={onConfirm} />
            {cancelLabel && onCancel ? <BigButton variant="secondary" label={cancelLabel} onPress={onCancel} /> : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: space.md },
  card: { width: '100%', maxWidth: layout.pageWidth, backgroundColor: colors.surface, borderRadius: radius, padding: space.lg, gap: space.md },
});
