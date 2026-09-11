import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { formatDayHeading } from '@/lib/formatDay';
import { formatMonthHeading } from '@/lib/formatMonth';
import { formatWeekHeading } from '@/lib/formatWeek';
import { formatYearHeading } from '@/lib/formatYear';

import { TaskBrowseHeader } from '../TaskBrowseHeader';

const now = new Date(2026, 8, 9, 12, 0, 0);
const anchorDate = new Date(2026, 8, 9, 12, 0, 0);

function noop() {}

describe('TaskBrowseHeader', () => {
  it('shows the day heading label when granularity is "day"', () => {
    const { getByText } = render(
      <TaskBrowseHeader
        granularity="day"
        anchorDate={anchorDate}
        now={now}
        onPrev={noop}
        onNext={noop}
        onJumpToToday={noop}
        onGranularityChange={noop}
      />,
    );
    expect(getByText(formatDayHeading(anchorDate, now))).toBeTruthy();
  });

  it('shows the week heading label when granularity is "week"', () => {
    const { getByText } = render(
      <TaskBrowseHeader
        granularity="week"
        anchorDate={anchorDate}
        now={now}
        onPrev={noop}
        onNext={noop}
        onJumpToToday={noop}
        onGranularityChange={noop}
      />,
    );
    expect(getByText(formatWeekHeading(anchorDate, now))).toBeTruthy();
  });

  it('shows the month heading label when granularity is "month"', () => {
    const { getByText } = render(
      <TaskBrowseHeader
        granularity="month"
        anchorDate={anchorDate}
        now={now}
        onPrev={noop}
        onNext={noop}
        onJumpToToday={noop}
        onGranularityChange={noop}
      />,
    );
    expect(getByText(formatMonthHeading(anchorDate, now))).toBeTruthy();
  });

  it('shows the year heading label when granularity is "year"', () => {
    const { getByText } = render(
      <TaskBrowseHeader
        granularity="year"
        anchorDate={anchorDate}
        now={now}
        onPrev={noop}
        onNext={noop}
        onJumpToToday={noop}
        onGranularityChange={noop}
      />,
    );
    expect(getByText(formatYearHeading(anchorDate, now))).toBeTruthy();
  });

  it('invokes onPrev/onNext when the arrows are pressed', () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    const { getByTestId } = render(
      <TaskBrowseHeader
        granularity="day"
        anchorDate={anchorDate}
        now={now}
        onPrev={onPrev}
        onNext={onNext}
        onJumpToToday={noop}
        onGranularityChange={noop}
      />,
    );

    fireEvent.press(getByTestId('browse-prev'));
    fireEvent.press(getByTestId('browse-next'));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('invokes onJumpToToday when the heading label is pressed', () => {
    const onJumpToToday = jest.fn();
    const { getByTestId } = render(
      <TaskBrowseHeader
        granularity="day"
        anchorDate={anchorDate}
        now={now}
        onPrev={noop}
        onNext={noop}
        onJumpToToday={onJumpToToday}
        onGranularityChange={noop}
      />,
    );

    fireEvent.press(getByTestId('browse-heading'));

    expect(onJumpToToday).toHaveBeenCalledTimes(1);
  });

  it('invokes onGranularityChange with the pressed option, including "year"', () => {
    const onGranularityChange = jest.fn();
    const { getByTestId } = render(
      <TaskBrowseHeader
        granularity="day"
        anchorDate={anchorDate}
        now={now}
        onPrev={noop}
        onNext={noop}
        onJumpToToday={noop}
        onGranularityChange={onGranularityChange}
      />,
    );

    fireEvent.press(getByTestId('browse-granularity-week'));
    expect(onGranularityChange).toHaveBeenCalledWith('week');

    fireEvent.press(getByTestId('browse-granularity-month'));
    expect(onGranularityChange).toHaveBeenCalledWith('month');

    fireEvent.press(getByTestId('browse-granularity-year'));
    expect(onGranularityChange).toHaveBeenCalledWith('year');
  });
});
