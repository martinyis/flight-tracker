import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import api from "../src/api/client";

// ── helpers ──

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── types ──

interface FlightLeg {
  date: string;
  price: number;
  airline: string;
  departure_time: string;
  arrival_time: string;
  duration: number;
  stops: number;
}

interface Combo {
  outbound: FlightLeg;
  return: FlightLeg;
  totalPrice: number;
  nights: number;
}

type PickerTarget = "from" | "to" | null;

// ── component ──

export default function AddSearchScreen() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [dateFrom, setDateFrom] = useState(addDays(new Date(), 7));
  const [dateTo, setDateTo] = useState(addDays(new Date(), 21));
  const [minNights, setMinNights] = useState("3");
  const [maxNights, setMaxNights] = useState("7");

  const [activePicker, setActivePicker] = useState<PickerTarget>(null);

  const [results, setResults] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── date picker handler ──

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setActivePicker(null);
    if (!selected) return;

    if (activePicker === "from") {
      setDateFrom(selected);
      if (selected >= dateTo) setDateTo(addDays(selected, 7));
    } else {
      setDateTo(selected);
    }
  };

  // ── search ──

  const handleSearch = async () => {
    setError("");
    setResults([]);
    setLoading(true);
    try {
      const res = await api.post("/search", {
        origin: origin.trim(),
        destination: destination.trim(),
        dateFrom: toYMD(dateFrom),
        dateTo: toYMD(dateTo),
        minNights: Number(minNights),
        maxNights: Number(maxNights),
      });
      setResults(res.data.results);
      if (res.data.results.length === 0) setError("No flights found");
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}m`;
  };

  const isValid = origin.length >= 3 && destination.length >= 3;

  return (
    <View style={styles.container}>
      {/* airports */}
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.half]}
          placeholder="From (LAX)"
          placeholderTextColor="#555"
          value={origin}
          onChangeText={setOrigin}
          autoCapitalize="characters"
          maxLength={3}
        />
        <TextInput
          style={[styles.input, styles.half]}
          placeholder="To (NRT)"
          placeholderTextColor="#555"
          value={destination}
          onChangeText={setDestination}
          autoCapitalize="characters"
          maxLength={3}
        />
      </View>

      {/* date pickers */}
      <Text style={styles.label}>Date range</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.dateBtn, styles.half]}
          onPress={() => setActivePicker(activePicker === "from" ? null : "from")}
        >
          <Text style={styles.dateBtnLabel}>From</Text>
          <Text style={styles.dateBtnValue}>{toLabel(dateFrom)}</Text>
        </Pressable>

        <Pressable
          style={[styles.dateBtn, styles.half]}
          onPress={() => setActivePicker(activePicker === "to" ? null : "to")}
        >
          <Text style={styles.dateBtnLabel}>To</Text>
          <Text style={styles.dateBtnValue}>{toLabel(dateTo)}</Text>
        </Pressable>
      </View>

      {activePicker !== null && (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={activePicker === "from" ? dateFrom : dateTo}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            minimumDate={activePicker === "to" ? addDays(dateFrom, 1) : new Date()}
            onChange={onDateChange}
            themeVariant="dark"
          />
          {Platform.OS === "ios" && (
            <Pressable style={styles.doneBtn} onPress={() => setActivePicker(null)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* nights */}
      <Text style={styles.label}>Trip length (nights)</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.half]}
          placeholder="Min"
          placeholderTextColor="#555"
          value={minNights}
          onChangeText={setMinNights}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, styles.half]}
          placeholder="Max"
          placeholderTextColor="#555"
          value={maxNights}
          onChangeText={setMaxNights}
          keyboardType="numeric"
        />
      </View>

      {/* search button */}
      <Pressable
        style={[styles.button, !isValid && styles.disabled]}
        onPress={handleSearch}
        disabled={!isValid || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Searching..." : "Find Cheapest Flights"}
        </Text>
      </Pressable>

      {loading && (
        <ActivityIndicator size="large" color="#4fc3f7" style={{ marginTop: 20 }} />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* results */}
      <FlatList
        data={results}
        keyExtractor={(_, i) => String(i)}
        style={{ marginTop: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.price}>${item.totalPrice}</Text>
            <Text style={styles.nights}>{item.nights} nights</Text>

            <View style={styles.leg}>
              <Text style={styles.legLabel}>OUT</Text>
              <Text style={styles.legInfo}>
                {item.outbound.date} · {item.outbound.airline}
              </Text>
              <Text style={styles.legDetail}>
                {item.outbound.departure_time} → {item.outbound.arrival_time} ·{" "}
                {formatDuration(item.outbound.duration)} ·{" "}
                {item.outbound.stops === 0
                  ? "Nonstop"
                  : `${item.outbound.stops} stop(s)`}
              </Text>
              <Text style={styles.legPrice}>${item.outbound.price}</Text>
            </View>

            <View style={styles.leg}>
              <Text style={styles.legLabel}>RET</Text>
              <Text style={styles.legInfo}>
                {item.return.date} · {item.return.airline}
              </Text>
              <Text style={styles.legDetail}>
                {item.return.departure_time} → {item.return.arrival_time} ·{" "}
                {formatDuration(item.return.duration)} ·{" "}
                {item.return.stops === 0
                  ? "Nonstop"
                  : `${item.return.stops} stop(s)`}
              </Text>
              <Text style={styles.legPrice}>${item.return.price}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0f0f23" },
  row: { flexDirection: "row", gap: 8, marginBottom: 10 },
  half: { flex: 1 },
  label: { color: "#888", fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: "#1a1a2e",
    color: "#fff",
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
  },
  dateBtn: {
    backgroundColor: "#1a1a2e",
    padding: 14,
    borderRadius: 10,
  },
  dateBtnLabel: { color: "#888", fontSize: 12, marginBottom: 2 },
  dateBtnValue: { color: "#fff", fontSize: 16, fontWeight: "600" },
  pickerWrap: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
  },
  doneBtn: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  doneBtnText: { color: "#4fc3f7", fontSize: 16, fontWeight: "600" },
  button: {
    backgroundColor: "#4fc3f7",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  disabled: { opacity: 0.4 },
  buttonText: { color: "#0f0f23", fontSize: 16, fontWeight: "bold" },
  error: { color: "#ef5350", marginTop: 12, textAlign: "center" },
  card: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  price: { color: "#4fc3f7", fontSize: 28, fontWeight: "bold" },
  nights: { color: "#888", fontSize: 14, marginBottom: 12 },
  leg: { marginBottom: 10 },
  legLabel: {
    color: "#4fc3f7",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  legInfo: { color: "#fff", fontSize: 15 },
  legDetail: { color: "#aaa", fontSize: 13, marginTop: 2 },
  legPrice: { color: "#8bc34a", fontSize: 14, marginTop: 2 },
});
