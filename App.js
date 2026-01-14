import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function App() {
  const [sneakers, setSneakers] = useState([]);
  const [activeTab, setActiveTab] = useState("collection"); // collection | add | stats
  const [selectedBrand, setSelectedBrand] = useState(null); // null = cabinet list

  // Form fields
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [colorway, setColorway] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [photoUri, setPhotoUri] = useState(null);

  // Date picker state
  const [purchaseDateObj, setPurchaseDateObj] = useState(null); // Date | null
  const [showDatePicker, setShowDatePicker] = useState(false);

  const pad2 = (n) => String(n).padStart(2, "0");
  const formatMMDDYYYY = (date) => {
    if (!date) return "";
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const yyyy = date.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  };

  const resetForm = () => {
    setBrand("");
    setModel("");
    setColorway("");
    setSize("");
    setCondition("");
    setPurchasePrice("");
    setPhotoUri(null);
    setPurchaseDateObj(null);
    setShowDatePicker(false);
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow photo access to add pictures.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Error", "Could not open photo library.");
    }
  };

  const addSneaker = () => {
    const b = (brand || "").trim();
    const m = (model || "").trim();

    if (!b || !m) {
      Alert.alert("Missing info", "Please enter at least Brand and Model.");
      return;
    }

    const cleanedPrice = (purchasePrice || "").trim();
    const priceNum = cleanedPrice ? Number(cleanedPrice) : 0;
    if (cleanedPrice && Number.isNaN(priceNum)) {
      Alert.alert("Price format", "Please enter a valid number (example: 120 or 120.50).");
      return;
    }

    setSneakers((prev) => [
      {
        id: Date.now().toString(),
        brand: b,
        model: m,
        colorway: (colorway || "").trim(),
        size: (size || "").trim(),
        condition: (condition || "").trim(),
        purchaseDate: formatMMDDYYYY(purchaseDateObj), // MM-DD-YYYY
        purchasePrice: priceNum,
        wearCount: 0,
        photoUri: photoUri || null,
        createdAt: Date.now(),
      },
      ...prev,
    ]);

    resetForm();
    setActiveTab("collection");
    setSelectedBrand(null);
  };

  const wearSneaker = (id) => {
    setSneakers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, wearCount: s.wearCount + 1 } : s))
    );
  };

  const deleteSneaker = (id) => {
    Alert.alert("Delete sneaker?", "This will remove it from your vault.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => setSneakers((prev) => prev.filter((s) => s.id !== id)),
      },
    ]);
  };

  // Cabinets from brands
  const cabinets = useMemo(() => {
    const map = new Map();
    for (const s of sneakers) {
      const br = (s.brand || "").trim() || "Unknown";
      map.set(br, (map.get(br) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([br, count]) => ({ brand: br, count }))
      .sort((a, b) => a.brand.localeCompare(b.brand));
  }, [sneakers]);

  const sneakersInSelectedCabinet = useMemo(() => {
    if (!selectedBrand) return [];
    return sneakers.filter(
      (s) => (s.brand || "").trim().toLowerCase() === selectedBrand.toLowerCase()
    );
  }, [sneakers, selectedBrand]);

  // Stats
  const totalPairs = sneakers.length;
  const totalWears = sneakers.reduce((sum, s) => sum + (s.wearCount || 0), 0);
  const totalSpent = sneakers.reduce((sum, s) => sum + (s.purchasePrice || 0), 0);

  // FIX: only treat "most worn" as valid if someone has wearCount > 0
  const mostWorn = useMemo(() => {
    if (sneakers.length === 0) return null;
    const best = sneakers.reduce((a, b) => (b.wearCount > a.wearCount ? b : a), sneakers[0]);
    return best && best.wearCount > 0 ? best : null;
  }, [sneakers]);

  const TabButton = ({ tabKey, label }) => {
    const isActive = activeTab === tabKey;
    return (
      <TouchableOpacity
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => {
          setActiveTab(tabKey);
          if (tabKey !== "collection") setSelectedBrand(null);
        }}
      >
        <Text style={[styles.tabText, !isActive && styles.tabTextInactive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const onDateChange = (event, selectedDate) => {
    // Android: event.type can be "dismissed" or "set"
    if (Platform.OS === "android") setShowDatePicker(false);

    if (event?.type === "dismissed") return;
    if (selectedDate) setPurchaseDateObj(selectedDate);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>SoleVault</Text>

      <View style={styles.tabs}>
        <TabButton tabKey="collection" label="COLLECTION" />
        <TabButton tabKey="add" label="ADD" />
        <TabButton tabKey="stats" label="STATS" />
      </View>

      {/* COLLECTION */}
      {activeTab === "collection" && (
        <View style={{ flex: 1 }}>
          {!selectedBrand && (
            <>
              <Text style={styles.sectionTitle}>My Cabinets</Text>

              <FlatList
                data={cabinets}
                keyExtractor={(item) => item.brand}
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    No sneakers yet. Add your first pair in the ADD tab.
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.cabinetCard}
                    onPress={() => setSelectedBrand(item.brand)}
                  >
                    <View>
                      <Text style={styles.cabinetTitle}>{item.brand}</Text>
                      <Text style={styles.cabinetSub}>{item.count} pair(s)</Text>
                    </View>
                    <Text style={styles.cabinetArrow}>›</Text>
                  </TouchableOpacity>
                )}
              />

              {sneakers.length > 0 && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setSelectedBrand("__ALL__")}
                >
                  <Text style={styles.secondaryButtonText}>View All Sneakers</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {selectedBrand && (
            <>
              <View style={styles.rowTop}>
                <Text style={styles.sectionTitle}>
                  {selectedBrand === "__ALL__" ? "All Sneakers" : `${selectedBrand} Cabinet`}
                </Text>

                <TouchableOpacity style={styles.backButton} onPress={() => setSelectedBrand(null)}>
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={selectedBrand === "__ALL__" ? sneakers : sneakersInSelectedCabinet}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<Text style={styles.empty}>No sneakers in this cabinet yet.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <View style={styles.cardRow}>
                      {item.photoUri ? (
                        <Image source={{ uri: item.photoUri }} style={styles.thumb} />
                      ) : (
                        <View style={styles.thumbPlaceholder}>
                          <Text style={styles.thumbPlaceholderText}>No Photo</Text>
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                          {item.brand} {item.model}
                        </Text>

                        {!!item.colorway && (
                          <Text style={styles.cardSub}>Colorway: {item.colorway}</Text>
                        )}

                        <Text style={styles.cardSub}>
                          Size: {item.size || "—"} • Condition: {item.condition || "—"}
                        </Text>

                        <Text style={styles.cardSub}>
                          Bought: {item.purchaseDate || "—"} • Price: $
                          {Number(item.purchasePrice || 0).toFixed(2)}
                        </Text>

                        <Text style={styles.cardSub}>Worn: {item.wearCount} times</Text>
                      </View>
                    </View>

                    <View style={styles.rowButtons}>
                      <TouchableOpacity style={styles.wearButton} onPress={() => wearSneaker(item.id)}>
                        <Text style={styles.wearText}>Worn Today</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteSneaker(item.id)}>
                        <Text style={styles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            </>
          )}
        </View>
      )}

      {/* ADD */}
      {activeTab === "add" && (
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.sectionTitle}>Add a Sneaker</Text>

          <Text style={styles.fieldLabel}>Brand (this becomes the Cabinet)</Text>
          <TextInput
            style={styles.input}
            placeholder="Jordan, Nike, Adidas"
            value={brand}
            onChangeText={setBrand}
          />

          <Text style={styles.fieldLabel}>Model</Text>
          <TextInput
            style={styles.input}
            placeholder="AJ1, Dunk, Yeezy"
            value={model}
            onChangeText={setModel}
          />

          <Text style={styles.fieldLabel}>Colorway (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Bred, Chicago, Panda"
            value={colorway}
            onChangeText={setColorway}
          />

          <Text style={styles.fieldLabel}>Size</Text>
          <TextInput
            style={styles.input}
            placeholder="10 or 10.5"
            value={size}
            onChangeText={setSize}
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>Condition</Text>
          <TextInput
            style={styles.input}
            placeholder="DS, VNDS, Used, Beaters"
            value={condition}
            onChangeText={setCondition}
          />

          <Text style={styles.fieldLabel}>Date Bought (optional)</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {purchaseDateObj ? formatMMDDYYYY(purchaseDateObj) : "Pick a date"}
            </Text>
          </TouchableOpacity>

          {/* iOS shows inline if you want; this keeps it simple */}
          {showDatePicker && (
            <DateTimePicker
              value={purchaseDateObj || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange}
            />
          )}

          <Text style={styles.fieldLabel}>Price Paid (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: 120 or 120.50"
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>Picture (optional)</Text>
          <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
            <Text style={styles.photoButtonText}>{photoUri ? "Change Photo" : "Choose Photo"}</Text>
          </TouchableOpacity>

          {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}

          <TouchableOpacity style={styles.addButton} onPress={addSneaker}>
            <Text style={styles.addText}>Save to Vault</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryClear} onPress={resetForm}>
            <Text style={styles.secondaryClearText}>Clear Form</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STATS */}
      {activeTab === "stats" && (
        <View style={styles.stats}>
          <Text style={styles.sectionTitle}>Stats</Text>

          <View style={styles.statCard}>
            <Text style={styles.statText}>Total Pairs: {totalPairs}</Text>
            <Text style={styles.statText}>Cabinets: {cabinets.length}</Text>
            <Text style={styles.statText}>Total Wears Logged: {totalWears}</Text>
            <Text style={styles.statText}>Total Spent: ${totalSpent.toFixed(2)}</Text>

            {/* FIXED: show only if someone has been worn */}
            {mostWorn ? (
              <Text style={styles.statText}>
                Most Worn: {mostWorn.brand} {mostWorn.model} ({mostWorn.wearCount})
              </Text>
            ) : (
              <Text style={styles.statText}>Most Worn: —</Text>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16 },
  title: { fontSize: 28, fontWeight: "900", color: "#111111", marginBottom: 10 },
  tabs: { flexDirection: "row", marginBottom: 12 },
  tab: { flex: 1, padding: 10, marginHorizontal: 4, backgroundColor: "#E0E0E0", borderRadius: 10 },
  activeTab: { backgroundColor: "#111111" },
  tabText: { color: "#FFFFFF", textAlign: "center", fontWeight: "800" },
  tabTextInactive: { color: "#111111" },

  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#111111", marginBottom: 10 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  backButton: { backgroundColor: "#111111", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  backButtonText: { color: "#FFFFFF", fontWeight: "800" },

  cabinetCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cabinetTitle: { fontSize: 18, fontWeight: "900", color: "#111111" },
  cabinetSub: { marginTop: 4, color: "#555555", fontWeight: "700" },
  cabinetArrow: { fontSize: 26, color: "#111111", fontWeight: "900" },

  card: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  cardRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  thumb: { width: 74, height: 74, borderRadius: 12, backgroundColor: "#EEE" },
  thumbPlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 12,
    backgroundColor: "#EFEFEF",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbPlaceholderText: { color: "#777", fontWeight: "800", fontSize: 11 },
  cardTitle: { fontSize: 18, fontWeight: "900", color: "#111111" },
  cardSub: { color: "#555555", marginTop: 4, fontWeight: "700" },

  rowButtons: { flexDirection: "row", gap: 10, marginTop: 12 },
  wearButton: { flex: 1, backgroundColor: "#111111", padding: 10, borderRadius: 10 },
  wearText: { color: "#FFFFFF", textAlign: "center", fontWeight: "900" },
  deleteButton: { paddingHorizontal: 14, justifyContent: "center", borderRadius: 10, backgroundColor: "#EFEFEF" },
  deleteText: { color: "#111111", fontWeight: "900" },

  empty: { textAlign: "center", marginTop: 30, color: "#777777", fontWeight: "700" },
  secondaryButton: { marginTop: 6, backgroundColor: "#111111", padding: 14, borderRadius: 12 },
  secondaryButtonText: { color: "#FFFFFF", fontWeight: "900", textAlign: "center" },

  form: { paddingBottom: 30 },
  fieldLabel: { fontWeight: "900", color: "#111111", marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  dateButton: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dateButtonText: { color: "#111111", fontWeight: "800" },

  photoButton: { backgroundColor: "#EFEFEF", padding: 14, borderRadius: 10, alignItems: "center", marginBottom: 10 },
  photoButtonText: { color: "#111111", fontWeight: "900" },
  preview: { width: "100%", height: 220, borderRadius: 14, marginBottom: 12, backgroundColor: "#EEE" },

  addButton: { backgroundColor: "#111111", padding: 16, borderRadius: 12, marginTop: 6 },
  addText: { color: "#FFFFFF", textAlign: "center", fontWeight: "900" },
  secondaryClear: { marginTop: 10, backgroundColor: "#EFEFEF", padding: 14, borderRadius: 12 },
  secondaryClearText: { color: "#111111", fontWeight: "900", textAlign: "center" },

  stats: { marginTop: 10 },
  statCard: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12, elevation: 2 },
  statText: { fontSize: 16, marginBottom: 10, color: "#111111", fontWeight: "800" },
});
