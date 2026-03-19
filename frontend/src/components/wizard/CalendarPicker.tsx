// Pure JS calendar picker — replaces native @react-native-community/datetimepicker
// which caused native crashes (UICalendarView) on second search session.
import { useState, useMemo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { fonts } from "../../theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalendarPickerProps {
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  accentColor?: string;
  onChange: (date: Date) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date): boolean {
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return aDay < bDay;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarPicker({
  value,
  minimumDate,
  maximumDate,
  accentColor = "#3B82F6",
  onChange,
}: CalendarPickerProps) {
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  const today = useMemo(() => new Date(), []);

  const goToPrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  // Can we navigate to previous month?
  const canGoPrev = useMemo(() => {
    if (!minimumDate) return true;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const lastDayOfPrev = getDaysInMonth(prevYear, prevMonth);
    const lastDateOfPrev = new Date(prevYear, prevMonth, lastDayOfPrev);
    return lastDateOfPrev >= minimumDate;
  }, [minimumDate, viewMonth, viewYear]);

  // Build the grid of days
  const weeks = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const rows: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    // Leading blanks
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        rows.push(currentWeek);
        currentWeek = [];
      }
    }

    // Trailing blanks
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      rows.push(currentWeek);
    }

    return rows;
  }, [viewYear, viewMonth]);

  const handleDayPress = useCallback(
    (day: number) => {
      const date = new Date(viewYear, viewMonth, day);
      onChange(date);
    },
    [viewYear, viewMonth, onChange]
  );

  return (
    <View style={styles.container}>
      {/* Month/year header with arrows */}
      <View style={styles.header}>
        <Pressable
          onPress={goToPrevMonth}
          disabled={!canGoPrev}
          hitSlop={12}
          style={({ pressed }) => [
            styles.navBtn,
            pressed && styles.navBtnPressed,
            !canGoPrev && styles.navBtnDisabled,
          ]}
        >
          <ChevronLeft size={20} color={canGoPrev ? "#0F172A" : "#CBD5E1"} strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <Pressable
          onPress={goToNextMonth}
          hitSlop={12}
          style={({ pressed }) => [
            styles.navBtn,
            pressed && styles.navBtnPressed,
          ]}
        >
          <ChevronRight size={20} color="#0F172A" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Day-of-week labels */}
      <View style={styles.weekRow}>
        {DAYS.map((d) => (
          <View key={d} style={styles.dayCell}>
            <Text style={styles.dayLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={`blank-${di}`} style={styles.dayCell} />;
            }

            const date = new Date(viewYear, viewMonth, day);
            const isSelected = isSameDay(date, value);
            const isToday = isSameDay(date, today);
            const isDisabled =
              (minimumDate && isBeforeDay(date, minimumDate)) ||
              (maximumDate && date > maximumDate);

            return (
              <Pressable
                key={day}
                onPress={() => !isDisabled && handleDayPress(day)}
                disabled={!!isDisabled}
                style={[
                  styles.dayCell,
                  styles.dayCellTouchable,
                ]}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && { backgroundColor: accentColor },
                    isToday && !isSelected && styles.todayCircle,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && !isSelected && { color: accentColor },
                      isDisabled && styles.dayTextDisabled,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnPressed: {
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  monthLabel: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  dayLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellTouchable: {
    // Pressable hitbox
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCircle: {
    borderWidth: 1.5,
    borderColor: "#3B82F6",
  },
  dayText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: "#0F172A",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
  },
  dayTextDisabled: {
    color: "#CBD5E1",
  },
});
