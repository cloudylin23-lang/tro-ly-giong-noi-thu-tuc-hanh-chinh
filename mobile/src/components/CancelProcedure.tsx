import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { copy } from '@/copy';
import { colors, layout, radius, space } from '@/theme';
import { AppText } from './AppText';
import { BigButton } from './BigButton';

export function CancelProcedure({ open, onOpenChange, onConfirm, hasDraft = true }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  hasDraft?: boolean;
}) {
  return (
    <>
      <BigButton variant="ghost" icon="close" label={copy.cancel.label} onPress={() => onOpenChange(true)} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => onOpenChange(false)}>
        <SafeAreaView style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card} accessibilityViewIsModal>
              <AppText variant="title" accessibilityRole="header">{copy.cancel.title}</AppText>
              <AppText>{hasDraft ? copy.cancel.message : copy.cancel.beforeStart}</AppText>
              <BigButton label={copy.cancel.keep} onPress={() => onOpenChange(false)} />
              <BigButton variant="important" icon="close" label={copy.cancel.confirm} onPress={onConfirm} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: space.md },
  card: { width: '100%', maxWidth: layout.pageWidth, backgroundColor: colors.surface, borderRadius: radius, padding: space.md, gap: space.md },
});
