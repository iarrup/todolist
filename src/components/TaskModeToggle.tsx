import { Pressable, StyleSheet, Text, View } from 'react-native';

export type TaskMode = 'open' | 'browse';

/**
 * The Tasks tab's Open/Browse mode switch (F10). Open (default) is F8's
 * existing open-only, unfiltered-by-date list; Browse is the new day/week/
 * month/year scheduled-task browser. Purely presentational — `tasks.tsx`
 * owns which mode is active.
 */
interface TaskModeToggleProps {
  mode: TaskMode;
  onModeChange: (mode: TaskMode) => void;
}

const MODES: { key: TaskMode; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'browse', label: 'Browse' },
];

export function TaskModeToggle({ mode, onModeChange }: TaskModeToggleProps) {
  return (
    <View style={styles.container}>
      {MODES.map(({ key, label }) => {
        const active = mode === key;
        return (
          <Pressable
            key={key}
            testID={`task-mode-${key}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onModeChange(key)}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(120,120,128,0.12)',
    padding: 2,
  },
  option: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: '#ffffff',
  },
  text: {
    fontSize: 14,
    color: '#666',
  },
  textActive: {
    color: '#000000',
    fontWeight: '600',
  },
});
