import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { TaskModeToggle } from '../TaskModeToggle';

describe('TaskModeToggle', () => {
  it('renders both Open and Browse options', () => {
    const { getByText } = render(<TaskModeToggle mode="open" onModeChange={jest.fn()} />);
    expect(getByText('Open')).toBeTruthy();
    expect(getByText('Browse')).toBeTruthy();
  });

  it('marks the active mode as selected', () => {
    const { getByTestId } = render(<TaskModeToggle mode="browse" onModeChange={jest.fn()} />);
    expect(getByTestId('task-mode-browse').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('task-mode-open').props.accessibilityState.selected).toBe(false);
  });

  it('calls onModeChange with the tapped mode', () => {
    const onModeChange = jest.fn();
    const { getByTestId } = render(<TaskModeToggle mode="open" onModeChange={onModeChange} />);

    fireEvent.press(getByTestId('task-mode-browse'));

    expect(onModeChange).toHaveBeenCalledWith('browse');
  });
});
