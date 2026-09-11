import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  RECURRENCE_LABELS,
  RECURRENCE_TYPES,
  WEEKDAY_LABELS,
  type Recurrence,
} from '@/lib/recurrence';

/**
 * A controlled Repeat selector (F11) — "None" plus the six named recurrence
 * types, with a weekday multi-select revealed for "Specific days of the
 * week". A plain `Modal` (no new dependency needed — unlike F9's
 * `pickDateTime`, there's no native OS dialog to wrap for recurrence).
 * Reused, unmodified, by both `TaskComposer` and `TaskRow` (the two entry
 * points).
 *
 * Draft state reseeds from `recurrence`/`recurrenceDays` every time
 * `visible` flips to `true`, so re-opening always starts from the task's
 * actual current state, never a stale draft. "Confirm" is disabled while
 * "Specific days of the week" has zero days checked — there is no way to
 * end up with `recurrence = 'specific-days'` and no days. "Cancel" calls
 * `onCancel` without ever calling `onConfirm`, leaving the caller's stored
 * state untouched.
 */
interface RepeatPickerProps {
  visible: boolean;
  recurrence: Recurrence | null;
  recurrenceDays: number[] | null;
  onConfirm: (recurrence: Recurrence | null, recurrenceDays: number[] | null) => void;
  onCancel: () => void;
}

export function RepeatPicker({
  visible,
  recurrence,
  recurrenceDays,
  onConfirm,
  onCancel,
}: RepeatPickerProps) {
  const [draftRecurrence, setDraftRecurrence] = useState<Recurrence | null>(recurrence);
  const [draftDays, setDraftDays] = useState<number[]>(recurrenceDays ?? []);

  // Reseed the draft from props whenever the modal transitions to visible —
  // React's documented "adjusting state when a prop changes" pattern
  // (setState conditionally during render, tracked via state rather than a
  // ref), not an effect, so opening the picker never renders a stale draft
  // for a frame first. Reseeding only on that transition (not every render
  // while open) means picking an option mid-session is never clobbered by a
  // parent re-render passing the same, still-unconfirmed props.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraftRecurrence(recurrence);
      setDraftDays(recurrenceDays ?? []);
    }
  }

  const toggleDay = (day: number) => {
    setDraftDays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b),
    );
  };

  const canConfirm = draftRecurrence !== 'specific-days' || draftDays.length > 0;

  const handleConfirm = () => {
    onConfirm(draftRecurrence, draftRecurrence === 'specific-days' ? draftDays : null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View testID="repeat-picker" style={styles.sheet}>
          <Text style={styles.title}>Repeat</Text>

          <Pressable
            testID="repeat-option-none"
            accessibilityRole="radio"
            accessibilityState={{ checked: draftRecurrence === null }}
            onPress={() => setDraftRecurrence(null)}
            style={styles.option}
          >
            <Text
              style={[styles.optionText, draftRecurrence === null && styles.optionTextSelected]}
            >
              None
            </Text>
          </Pressable>

          {RECURRENCE_TYPES.map((type) => (
            <Pressable
              key={type}
              testID={`repeat-option-${type}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: draftRecurrence === type }}
              onPress={() => setDraftRecurrence(type)}
              style={styles.option}
            >
              <Text
                style={[styles.optionText, draftRecurrence === type && styles.optionTextSelected]}
              >
                {RECURRENCE_LABELS[type]}
              </Text>
            </Pressable>
          ))}

          {draftRecurrence === 'specific-days' && (
            <View testID="repeat-weekday-row" style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, day) => {
                const selected = draftDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    testID={`repeat-weekday-${day}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleDay(day)}
                    style={[styles.weekdayChip, selected && styles.weekdayChipSelected]}
                  >
                    <Text
                      style={[styles.weekdayChipText, selected && styles.weekdayChipTextSelected]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.actions}>
            <Pressable
              testID="repeat-cancel"
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onCancel}
              style={styles.actionButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="repeat-confirm"
              accessibilityRole="button"
              accessibilityLabel="Confirm repeat"
              accessibilityState={{ disabled: !canConfirm }}
              disabled={!canConfirm}
              onPress={handleConfirm}
              style={[styles.actionButton, !canConfirm && styles.actionButtonDisabled]}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    paddingBottom: 8,
  },
  option: {
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 16,
    color: '#1c1c1e',
  },
  optionTextSelected: {
    color: '#208AEF',
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  weekdayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  weekdayChipSelected: {
    backgroundColor: '#208AEF',
  },
  weekdayChipText: {
    fontSize: 14,
    color: '#1c1c1e',
  },
  weekdayChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 16,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  cancelText: {
    fontSize: 16,
    color: '#8a8a8e',
  },
  confirmText: {
    fontSize: 16,
    color: '#208AEF',
    fontWeight: '600',
  },
});
