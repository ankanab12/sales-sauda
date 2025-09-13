// App.js
import React, { useState, useEffect, createContext, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🔥 Firebase
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { app } from "./firebaseConfig";

const db = getFirestore(app);

//////////////////// CONTEXT ////////////////////
const AppContext = createContext();
export const useApp = () => useContext(AppContext);

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [deals, setDeals] = useState([]);

  // 👇 Real-time listener to all deals
  useEffect(() => {
    const q = query(collection(db, "deals"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allDeals = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDeals(allDeals);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser, deals }}>
      {children}
    </AppContext.Provider>
  );
}

//////////////////// LOGIN ////////////////////
function LoginScreen() {
  const { setUser } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!username) return alert("Enter name");

    if (username.toLowerCase() === "admin") {
      if (password === "1234") {
        setUser({ userId: "admin", name: "Admin", role: "Admin" });
      } else {
        alert("Invalid Admin password");
      }
      return;
    }

    // Trader login: persistent ID
    try {
      const savedId = await AsyncStorage.getItem(`traderId_${username}`);
      let traderId;
      if (savedId) {
        traderId = savedId; // reuse old ID
      } else {
        traderId = Date.now().toString(); // new ID
        await AsyncStorage.setItem(`traderId_${username}`, traderId);
      }

      setUser({
        userId: traderId,
        name: username,
        role: "Trader",
      });
    } catch (err) {
      console.error("AsyncStorage error:", err);
      alert("Login failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Login</Text>
      <TextInput
        placeholder="Enter Name"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />

      {username.toLowerCase() === "admin" && (
        <TextInput
          placeholder="Enter Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
      )}

      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

//////////////////// TRADER DASHBOARD ////////////////////
function UserDashboard({ navigation }) {
  const { user, deals, setUser } = useApp();

  const handleLogout = () => setUser(null);

  // Show all deals of this trader
  const myDeals = deals.filter((d) => d.traderId === user.userId);

  return (
    <View style={[styles.container, { backgroundColor: "#eafbea" }]}>
      <View style={{ alignItems: "flex-end", marginBottom: 10 }}>
        <Button title="Logout" onPress={handleLogout} color="red" />
      </View>

      <Text style={[styles.heading, { color: "#2d6a4f" }]}>
        Trader Dashboard
      </Text>
      <Text style={{ marginBottom: 10 }}>Welcome, {user.name}</Text>

      <Button
        title="Create New Deal"
        color="#2d6a4f"
        onPress={() => navigation.navigate("NewDeal")}
      />

      <FlatList
        data={myDeals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: "#caffbf" }]}>
            <Text style={{ fontWeight: "bold" }}>
              {item.rice} - {item.quantity} tons
            </Text>
            <Text>Price: ₹{item.price}</Text>
            <Text>Date: {item.date}</Text>
            <Text>Sauda ID: {item.saudaId}</Text>
            <Text>Status: {item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}

//////////////////// NEW DEAL ////////////////////
function NewDealScreen({ navigation }) {
  const { user } = useApp();
  const [rice, setRice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleSave = async () => {
    if (!rice || !quantity || !price) return alert("Fill all fields");

    try {
      await addDoc(collection(db, "deals"), {
        saudaId: "SAUDA-" + Date.now(),
        traderName: user.name,
        traderId: user.userId,
        rice,
        quantity,
        price,
        date: date.toISOString().split("T")[0],
        status: "Pending",
      });
      navigation.goBack();
    } catch (err) {
      console.error("Error saving deal:", err);
      alert("Failed to save deal");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>New Deal</Text>
      <TextInput
        placeholder="Rice Variety"
        value={rice}
        onChangeText={setRice}
        style={styles.input}
      />
      <TextInput
        placeholder="Quantity (tons)"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.dateBtn}
        onPress={() => setShowPicker(true)}
      >
        <Text>Select Date: {date.toDateString()}</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowPicker(false);
            if (d) setDate(d);
          }}
        />
      )}

      <Button title="Save Deal" onPress={handleSave} />
    </View>
  );
}

//////////////////// ADMIN DASHBOARD ////////////////////
function AdminDashboard({ navigation }) {
  const { deals, setUser } = useApp();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleLogout = () => setUser(null);

  const filteredDeals = deals.filter((d) => {
    const matchStatus = filter === "All" || d.status === filter;
    const matchSearch =
      d.traderName.toLowerCase().includes(search.toLowerCase()) ||
      d.rice.toLowerCase().includes(search.toLowerCase());

    let matchDate = true;
    if (selectedDate) {
      const dealDate = new Date(d.date).toDateString();
      const filterDate = selectedDate.toDateString();
      matchDate = dealDate === filterDate;
    }

    return matchStatus && matchSearch && matchDate;
  });

  return (
    <View style={[styles.container, { backgroundColor: "#fff5f5" }]}>
      <View style={{ alignItems: "flex-end", marginBottom: 10 }}>
        <Button title="Logout" onPress={handleLogout} color="red" />
      </View>

      <Text style={[styles.heading, { color: "#6a040f" }]}>
        Admin Dashboard
      </Text>

      <TextInput
        placeholder="Search by trader or rice..."
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />

      {/* 📅 Date Filter */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <TouchableOpacity
          style={[styles.dateBtn, { flex: 1, marginRight: 5 }]}
          onPress={() => setShowPicker(true)}
        >
          <Text>
            {selectedDate
              ? `Filter Date: ${selectedDate.toDateString()}`
              : "Select a Date"}
          </Text>
        </TouchableOpacity>

        {selectedDate && (
          <TouchableOpacity
            style={[styles.dateBtn, { backgroundColor: "#f94144" }]}
            onPress={() => setSelectedDate(null)}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {showPicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowPicker(false);
            if (d) setSelectedDate(d);
          }}
        />
      )}

      {/* ✅ Status Filter */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginBottom: 10,
        }}
      >
        {["All", "Pending", "Accepted", "Rejected"].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterBtn,
              filter === status && { backgroundColor: "#6a040f" },
            ]}
            onPress={() => setFilter(status)}
          >
            <Text
              style={{
                color: filter === status ? "#fff" : "#6a040f",
                fontWeight: "bold",
              }}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 📋 Deal List */}
      <FlatList
        data={filteredDeals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: "#ffb3c1" }]}
            onPress={() => navigation.navigate("DealDetails", { deal: item })}
          >
            <Text style={{ fontWeight: "bold" }}>
              {item.traderName} - {item.rice}
            </Text>
            <Text>
              {item.quantity} tons @ ₹{item.price}
            </Text>
            <Text>Date: {item.date}</Text>
            <Text>Sauda ID: {item.saudaId}</Text>
            <Text>Status: {item.status}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

//////////////////// DEAL DETAILS ////////////////////
function DealDetails({ route, navigation }) {
  const { deal } = route.params;

  const updateStatus = async (newStatus) => {
    try {
      await updateDoc(doc(db, "deals", deal.id), { status: newStatus });
      navigation.goBack();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Deal Details</Text>
      <Text>Trader: {deal.traderName}</Text>
      <Text>Rice: {deal.rice}</Text>
      <Text>Quantity: {deal.quantity}</Text>
      <Text>Price: ₹{deal.price}</Text>
      <Text>Date: {deal.date}</Text>
      <Text>Sauda ID: {deal.saudaId}</Text>
      <Text>Status: {deal.status}</Text>

      {deal.status === "Pending" && (
        <View style={{ marginTop: 20, flexDirection: "row", gap: 10 }}>
          <Button
            title="Accept"
            color="green"
            onPress={() => updateStatus("Accepted")}
          />
          <Button
            title="Reject"
            color="red"
            onPress={() => updateStatus("Rejected")}
          />
        </View>
      )}
    </View>
  );
}

//////////////////// ROOT NAVIGATOR ////////////////////
const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user } = useApp();

  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : user.role === "Admin" ? (
        <>
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          <Stack.Screen name="DealDetails" component={DealDetails} />
        </>
      ) : (
        <>
          <Stack.Screen name="UserDashboard" component={UserDashboard} />
          <Stack.Screen name="NewDeal" component={NewDealScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

//////////////////// APP ////////////////////
export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AppProvider>
  );
}

//////////////////// STYLES ////////////////////
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  dateBtn: {
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 5,
  },
  card: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#6a040f",
    borderRadius: 6,
  },
});
