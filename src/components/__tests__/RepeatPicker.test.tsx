import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { RepeatPicker } from '../RepeatPicker';

describe('RepeatPicker', () => {
  it('selecting a type and confirming calls onConfirm with that type and null days', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <RepeatPicker
        visible
        recurrence={null}
        recurrenceDays={null}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('repeat-option-daily'));
    fireEvent.press(getByTestId('repeat-confirm'));

    expect(onConfirm).toHaveBeenCalledWith('daily', null);
  });

  it('selecting "Specific days of the week" reveals a weekday multi-select', () => {
    const { getByTestId, queryByTestId } = render(
      <RepeatPicker
        visible
        recurrence={null}
        recurrenceDays={null}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(queryByTestId('repeat-weekday-row')).toBeNull();

    fireEvent.press(getByTestId('repeat-option-specific-days'));

    expect(getByTestId('repeat-weekday-row')).toBeTruthy();
  });

  it('confirm is disabled for specific-days with zero days checked', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <RepeatPicker
        visible
        recurrence={null}
        recurrenceDays={null}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('repeat-option-specific-days'));
    const confirm = getByTestId('repeat-confirm');
    expect(confirm.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirm becomes enabled once a weekday is selected, and reports it', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <RepeatPicker
        visible
        recurrence={null}
        recurrenceDays={null}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('repeat-option-specific-days'));
    fireEvent.press(getByTestId('repeat-weekday-1')); // Mon
    fireEvent.press(getByTestId('repeat-weekday-3')); // Wed

    const confirm = getByTestId('repeat-confirm');
    expect(confirm.props.accessibilityState.disabled).toBe(false);

    fireEvent.press(confirm);
    expect(onConfirm).toHaveBeenCalledWith('specific-days', [1, 3]);
  });

  it('toggling a selected weekday off removes it', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <RepeatPicker
        visible
        recurrence="specific-days"
        recurrenceDays={[1, 3]}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('repeat-weekday-1')); // untoggle Mon
    fireEvent.press(getByTestId('repeat-confirm'));

    expect(onConfirm).toHaveBeenCalledWith('specific-days', [3]);
  });

  it('cancel calls onCancel and never onConfirm', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const { getByTestId } = render(
      <RepeatPicker
        visible
        recurrence={null}
        recurrenceDays={null}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.press(getByTestId('repeat-option-monthly'));
    fireEvent.press(getByTestId('repeat-cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('reopening reseeds the draft from the current props, discarding any prior unconfirmed selection', () => {
    const onConfirm = jest.fn();
    const { getByTestId, rerender } = render(
      <RepeatPicker
        visible
        recurrence="daily"
        recurrenceDays={null}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    // Change the draft without confirming, then close.
    fireEvent.press(getByTestId('repeat-option-monthly'));
    rerender(
      <RepeatPicker
        visible={false}
        recurrence="daily"
        recurrenceDays={null}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    // Reopen: should reseed from the still-"daily" props, not the discarded "monthly" draft.
    rerender(
      <RepeatPicker
        visible
        recurrence="daily"
        recurrenceDays={null}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.press(getByTestId('repeat-confirm'));

    expect(onConfirm).toHaveBeenCalledWith('daily', null);
  });

  it('pre-selects the existing recurrence when opened on an already-recurring task', () => {
    const { getByTestId } = render(
      <RepeatPicker
        visible
        recurrence="weekends"
        recurrenceDays={null}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(getByTestId('repeat-option-weekends').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('repeat-option-none').props.accessibilityState.checked).toBe(false);
  });
});
