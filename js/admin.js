// Use centralized Firebase initialization (js/firebase-init.js)
const db = window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
const auth = window.firebaseAuth || (window.firebase && window.firebase.auth ? window.firebase.auth() : null);

// Auth state
let isAuthenticated = false;

// Global State
let allBookings = [];
let map = null;
let markers = [];
let currentFilter = "all";
let routingControl = null; // Leaflet Routing control

console.log("✓ Admin dashboard loaded");

// Initialize
document.addEventListener("DOMContentLoaded", function() {
  console.log("✓ DOM Ready");
  
  // Auth listener - show login modal if not signed in
  auth.onAuthStateChanged(user => {
    if (user) {
      console.log("✓ Authenticated:", user.email);
      isAuthenticated = true;
      const authStatus = document.getElementById("authStatus");
      if (authStatus) authStatus.innerText = `Signed in as ${user.email}`;
      const loginModal = document.getElementById("loginModal");
      if (loginModal) loginModal.style.display = "none";
    } else {
      console.log("✗ Not signed in");
      isAuthenticated = false;
      const authStatus = document.getElementById("authStatus");
      if (authStatus) authStatus.innerText = `Not signed in`;
    }
    // Ensure action buttons respect auth state
    try { setActionButtonsState(); } catch (e) {}
  });
  
  // Initialize map
  initMap();
  
  // Real-time listener for all bookings
  setupRealtimeListener();
  
  // Event listeners
  setupEventListeners();
  
  console.log("✓ Admin dashboard initialized");
});

// Initialize Leaflet Map
function initMap() {
  try {
    map = L.map("map").setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap'
    }).addTo(map);
    console.log("✓ Map initialized");
  } catch (err) {
    console.error("✗ Map error:", err);
  }
}

// Real-time Firestore Listener
function setupRealtimeListener() {
  db.collection("bookings")
    .orderBy("createdAt", "desc")
    .limit(100)
    .onSnapshot(snapshot => {
      console.log("→ Firestore update received");
      allBookings = [];
      
      snapshot.forEach(doc => {
        allBookings.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`✓ Loaded ${allBookings.length} bookings`);
      
      // Update UI
      updateStats();
      updateMap();
      filterAndDisplay();
    }, error => {
      console.error("✗ Firestore error:", error);
      alert("Failed to load bookings: " + error.message);
    });
}

// Setup Event Listeners
function setupEventListeners() {
  // Status filter buttons
  document.querySelectorAll(".status-filter").forEach(btn => {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".status-filter").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      currentFilter = this.dataset.status;
      filterAndDisplay();
    });
  });
  
  // Search boxes
  document.getElementById("searchBox").addEventListener("input", filterAndDisplay);
  document.getElementById("searchBox2").addEventListener("input", filterAndDisplay);
  
  // Refresh button
  document.getElementById("refreshBtn").addEventListener("click", () => {
    console.log("→ Manual refresh triggered");
    filterAndDisplay();
    alert("Data refreshed!");
  });
  
  // Export CSV button
  document.getElementById("exportBtn").addEventListener("click", exportToCSV);
  
  // Modal close
  document.querySelector(".close").addEventListener("click", () => {
    document.getElementById("detailModal").style.display = "none";
  });
  
  window.addEventListener("click", (e) => {
    const detailModal = document.getElementById("detailModal");
    const editModal = document.getElementById("editModal");
    if (e.target === detailModal) detailModal.style.display = "none";
    if (e.target === editModal) editModal.style.display = "none";
  });

  // Auth UI buttons
  const signInBtn = document.getElementById("signInBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const loginSubmit = document.getElementById("loginSubmit");
  const loginCancel = document.getElementById("loginCancel");

  if (signInBtn) signInBtn.addEventListener("click", () => {
    const loginModal = document.getElementById("loginModal");
    if (loginModal) loginModal.style.display = "block";
  });
  if (signOutBtn) signOutBtn.addEventListener("click", async () => { await signOut(); });
  if (loginSubmit) loginSubmit.addEventListener("click", async () => {
    const email = document.getElementById("adminEmail").value;
    const pw = document.getElementById("adminPassword").value;
    await signIn(email, pw);
  });
  if (loginCancel) loginCancel.addEventListener("click", () => {
    const loginModal = document.getElementById("loginModal");
    if (loginModal) loginModal.style.display = "none";
  });
}

// Update Statistics
function updateStats() {
  const stats = {
    total: allBookings.length,
    new: allBookings.filter(b => b.status === "new").length,
    confirmed: allBookings.filter(b => b.status === "confirmed").length,
    completed: allBookings.filter(b => b.status === "completed").length,
    cancelled: allBookings.filter(b => b.status === "cancelled").length,
    revenue: allBookings
      .filter(b => b.status !== "cancelled")
      .reduce((sum, b) => sum + (b.estimatedPrice || 0), 0)
  };
  
  document.getElementById("statsContainer").innerHTML = `
    <div class="stat-card">
      <h3>Total Bookings</h3>
      <p class="value">${stats.total}</p>
    </div>
    <div class="stat-card">
      <h3>New Orders</h3>
      <p class="value" style="color: #ff9800;">${stats.new}</p>
    </div>
    <div class="stat-card">
      <h3>Confirmed</h3>
      <p class="value" style="color: #9c27b0;">${stats.confirmed}</p>
    </div>
    <div class="stat-card">
      <h3>Completed</h3>
      <p class="value" style="color: #4caf50;">${stats.completed}</p>
    </div>
    <div class="stat-card">
      <h3>Total Revenue</h3>
      <p class="value" style="color: #2196f3;">₹${stats.revenue.toLocaleString()}</p>
    </div>
  `;
  
  console.log("✓ Stats updated:", stats);
}

// Update Map with Markers
function updateMap() {
  if (!map) return;
  
  // Clear existing markers
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  
  // Add markers for latest bookings (limit to 20 for performance)
  const recentBookings = allBookings.slice(0, 20);
  
  recentBookings.forEach(booking => {
    if (booking.pickupLat && booking.pickupLon) {
      // Pickup marker (blue)
      const pickupMarker = L.circleMarker(
        [booking.pickupLat, booking.pickupLon],
        { radius: 8, fillColor: "#2196f3", color: "#1565c0", weight: 2, opacity: 1, fillOpacity: 0.8 }
      ).bindPopup(`<b>Pickup</b><br>${booking.pickup}<br>📞 ${booking.phone}`);
      pickupMarker.addTo(map);
      markers.push(pickupMarker);
    }
    
    if (booking.dropLat && booking.dropLon) {
      // Drop marker (red)
      const dropMarker = L.circleMarker(
        [booking.dropLat, booking.dropLon],
        { radius: 8, fillColor: "#f44336", color: "#c62828", weight: 2, opacity: 1, fillOpacity: 0.8 }
      ).bindPopup(`<b>Drop</b><br>${booking.drop}<br>📞 ${booking.phone}`);
      dropMarker.addTo(map);
      markers.push(dropMarker);
    }
    
    // Draw line between pickup and drop
    if (booking.pickupLat && booking.pickupLon && booking.dropLat && booking.dropLon) {
      L.polyline(
        [[booking.pickupLat, booking.pickupLon], [booking.dropLat, booking.dropLon]],
        { color: "#999", weight: 2, opacity: 0.5, dashArray: "5, 5" }
      ).addTo(map);
    }
  });
  
  // Fit map to markers
  if (markers.length > 0) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1), { maxZoom: 12 });
  }
  
  console.log(`✓ Map updated with ${markers.length} markers`);
}

// Filter and Display Bookings
function filterAndDisplay() {
  const searchTerm = (document.getElementById("searchBox").value + 
                     document.getElementById("searchBox2").value).toLowerCase();
  
  let filtered = allBookings.filter(b => {
    const matchesFilter = currentFilter === "all" || b.status === currentFilter;
    const matchesSearch = !searchTerm || 
      b.name.toLowerCase().includes(searchTerm) ||
      b.phone.includes(searchTerm) ||
      b.pickup.toLowerCase().includes(searchTerm) ||
      b.drop.toLowerCase().includes(searchTerm);
    
    return matchesFilter && matchesSearch;
  });
  
  console.log(`→ Filtered to ${filtered.length} bookings (filter: ${currentFilter}, search: "${searchTerm}")`);
  
  // Update recent bookings table
  const recentBookings = filtered.slice(0, 5);
  document.getElementById("bookingsList").innerHTML = recentBookings.map(b => 
    createBookingRow(b)
  ).join("");
  
  // Update all bookings table
  document.getElementById("list").innerHTML = filtered.map(b => 
    createFullBookingRow(b)
  ).join("");
  
  // Add event listeners to action buttons
  document.querySelectorAll(".btn-confirm").forEach(btn => {
    btn.addEventListener("click", () => updateStatus(btn.dataset.id, "confirmed"));
  });
  document.querySelectorAll(".btn-complete").forEach(btn => {
    btn.addEventListener("click", () => updateStatus(btn.dataset.id, "completed"));
  });
  document.querySelectorAll(".btn-cancel").forEach(btn => {
    btn.addEventListener("click", () => updateStatus(btn.dataset.id, "cancelled"));
  });
  
  // Add event listeners to detail buttons
  document.querySelectorAll(".btn-details").forEach(btn => {
    btn.addEventListener("click", () => showDetails(btn.dataset.id));
  });
  
  // Add event listeners to edit buttons
  document.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", () => openEditModal(btn.dataset.id));
  });
  
  // Route buttons
  document.querySelectorAll(".btn-route").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const booking = allBookings.find(b => b.id === id);
      if (booking) showRoute(booking);
    });
  });

  // Customer orders buttons
  document.querySelectorAll(".btn-customer-orders").forEach(btn => {
    btn.addEventListener("click", () => {
      const phone = btn.dataset.phone;
      if (phone) viewCustomerOrders(phone);
    });
  });

  // Phone links - clicking filters to that customer's orders
  document.querySelectorAll("a[data-phone]").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const phone = a.dataset.phone;
      viewCustomerOrders(phone);
    });
  });
  
  // Ensure action buttons reflect auth state
  try { setActionButtonsState(); } catch (e) {}
}

// Create Booking Row (Recent)
function createBookingRow(b) {
  const createdDate = b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "N/A";
  
  return `<tr>
    <td>${b.name}</td>
    <td><a href="https://wa.me/91${b.phone}" target="_blank">${b.phone}</a></td>
    <td>${b.pickup}</td>
    <td>${b.drop}</td>
    <td>${(b.distance || 0).toFixed(1)} km</td>
    <td>₹${b.estimatedPrice || 0}</td>
    <td>${b.vehicle}</td>
    <td><span class="status-badge status-${b.status}">${b.status}</span></td>
    <td>
      <div class="action-buttons">
        <button class="action-buttons btn-edit" data-id="${b.id}" style="background: #ff9800; color: white; font-size:12px;">✏️ Edit</button>
        ${b.status === "new" ? `<button class="action-buttons btn-confirm" data-id="${b.id}">✓ Confirm</button>` : ""}
        ${b.status === "confirmed" ? `<button class="action-buttons btn-complete" data-id="${b.id}">✓ Complete</button>` : ""}
        ${b.status !== "cancelled" ? `<button class="action-buttons btn-cancel" data-id="${b.id}">✗ Cancel</button>` : ""}
      </div>
    </td>
  </tr>`;
}

// Create Full Booking Row (All Bookings)
function createFullBookingRow(b) {
  const createdDate = b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "N/A";
  
  return `<tr>
    <td>${createdDate}</td>
    <td>${b.name}</td>
    <td><a href="https://wa.me/91${b.phone}" target="_blank">${b.phone}</a></td>
    <td>${b.pickup}</td>
    <td>${b.drop}</td>
    <td>${(b.distance || 0).toFixed(1)}</td>
    <td>₹${b.estimatedPrice || 0}</td>
    <td>${b.vehicle}</td>
    <td>${b.loadingRequired ? "Yes" : "No"}</td>
    <td>${b.notes || "-"}</td>
    <td><span class="status-badge status-${b.status}">${b.status}</span></td>
    <td>
      <div class="action-buttons">
        <button class="action-buttons btn-details" data-id="${b.id}" style="background: #1e88e5; color: white;">ℹ️</button>
        <button class="action-buttons btn-edit" data-id="${b.id}" style="background: #ff9800; color: white;">✏️</button>
        ${b.status === "new" ? `<button class="action-buttons btn-confirm" data-id="${b.id}">✓</button>` : ""}
        ${b.status === "confirmed" ? `<button class="action-buttons btn-complete" data-id="${b.id}">✓</button>` : ""}
        ${b.status !== "cancelled" ? `<button class="action-buttons btn-cancel" data-id="${b.id}">✗</button>` : ""}
      </div>
    </td>
  </tr>`;
}

// Update Booking Status
async function updateStatus(bookingId, newStatus) {
  try {
    console.log(`→ Updating booking ${bookingId} to ${newStatus}`);
    // Require authentication for updating status
    if (!auth.currentUser) {
      alert("❌ Please sign in as admin to update booking status.");
      const loginModal = document.getElementById("loginModal");
      if (loginModal) loginModal.style.display = "block";
      return;
    }

    await db.collection("bookings").doc(bookingId).update({
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✓ Booking ${bookingId} updated to ${newStatus}`);
  } catch (error) {
    console.error("✗ Error updating status:", error);
    alert("Error updating booking: " + error.message);
  }
}

// Sign in with email/password
async function signIn(email, password) {
  try {
    if (!email || !password) { alert('Enter email and password'); return; }
    await auth.signInWithEmailAndPassword(email, password);
    const loginModal = document.getElementById("loginModal");
    if (loginModal) loginModal.style.display = "none";
    alert('Signed in successfully');
  } catch (err) {
    console.error('✗ Sign-in error:', err);
    alert('Sign-in failed: ' + err.message);
  }
}

// Sign out
async function signOut() {
  try {
    await auth.signOut();
    alert('Signed out');
  } catch (err) {
    console.error('✗ Sign-out error:', err);
    alert('Sign-out failed: ' + err.message);
  }
}

// Enable/disable action buttons based on auth state
function setActionButtonsState() {
  const disabled = !auth.currentUser;
  document.querySelectorAll('.action-buttons button').forEach(b => {
    b.disabled = disabled;
    b.style.opacity = disabled ? '0.5' : '1';
    b.style.cursor = disabled ? 'not-allowed' : 'pointer';
  });
}

// Show Booking Details in Modal
function showDetails(bookingId) {
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) return;
  
  const createdDate = booking.createdAt ? new Date(booking.createdAt).toLocaleString() : "N/A";
  
  const detailsHTML = `
    <div class="detail-row">
      <strong>Booking ID:</strong>
      <span>${bookingId}</span>
    </div>
    <div class="detail-row">
      <strong>Name:</strong>
      <span>${booking.name}</span>
    </div>
    <div class="detail-row">
      <strong>Phone:</strong>
      <span><a href="https://wa.me/91${booking.phone}" target="_blank">📱 ${booking.phone}</a></span>
    </div>
    <div class="detail-row">
      <strong>Pickup:</strong>
      <span>${booking.pickup} (${booking.pickupLat}, ${booking.pickupLon})</span>
    </div>
    <div class="detail-row">
      <strong>Drop:</strong>
      <span>${booking.drop} (${booking.dropLat}, ${booking.dropLon})</span>
    </div>
    <div class="detail-row">
      <strong>Distance:</strong>
      <span>${(booking.distance || 0).toFixed(2)} km</span>
    </div>
    <div class="detail-row">
      <strong>Vehicle:</strong>
      <span>${booking.vehicle}</span>
    </div>
    <div class="detail-row">
      <strong>Estimated Price:</strong>
      <span style="color: #2196f3; font-weight: bold;">₹${booking.estimatedPrice}</span>
    </div>
    <div class="detail-row">
      <strong>Loading Help:</strong>
      <span>${booking.loadingRequired ? "✓ Yes" : "✗ No"}</span>
    </div>
    <div class="detail-row">
      <strong>Notes:</strong>
      <span>${booking.notes || "None"}</span>
    </div>
    <div class="detail-row">
      <strong>Status:</strong>
      <span><span class="status-badge status-${booking.status}">${booking.status}</span></span>
    </div>
    <div class="detail-row">
      <strong>Created:</strong>
      <span>${createdDate}</span>
    </div>
  `;
  
  document.getElementById("modalBody").innerHTML = detailsHTML;
  document.getElementById("detailModal").style.display = "block";
}

// Export to CSV
function exportToCSV() {
  let csv = "Name,Phone,Pickup,Drop,Distance,Price,Vehicle,Loading,Notes,Status,Created\n";
  
  allBookings.forEach(b => {
    const createdDate = b.createdAt ? new Date(b.createdAt).toLocaleString() : "";
    csv += `"${b.name}","${b.phone}","${b.pickup}","${b.drop}","${(b.distance || 0).toFixed(2)}","₹${b.estimatedPrice || 0}","${b.vehicle}","${b.loadingRequired ? "Yes" : "No"}","${b.notes || ""}","${b.status}","${createdDate}"\n`;
  });
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  console.log("✓ CSV exported");
}

// ===== EDIT BOOKING FUNCTIONS =====

// Open Edit Modal
let editingBookingId = null;
function openEditModal(bookingId) {
  // Require authentication
  if (!auth.currentUser) {
    alert("❌ Please sign in as admin to edit bookings.");
    const loginModal = document.getElementById("loginModal");
    if (loginModal) loginModal.style.display = "block";
    return;
  }
  
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) {
    console.error("✗ Booking not found:", bookingId);
    alert("Booking not found");
    return;
  }
  
  editingBookingId = bookingId;
  
  // Populate modal fields
  document.getElementById("editName").value = booking.name || "";
  document.getElementById("editPhone").value = booking.phone || "";
  document.getElementById("editPickup").value = booking.pickup || "";
  document.getElementById("editDrop").value = booking.drop || "";
  document.getElementById("editPickupDate").value = booking.pickupDate || "";
  document.getElementById("editPickupTime").value = booking.pickupTime || "";
  document.getElementById("editVehicle").value = booking.vehicle || "Mini Truck";
  document.getElementById("editNotes").value = booking.notes || "";
  
  document.getElementById("editModal").style.display = "block";
  console.log("→ Edit modal opened for booking:", bookingId);
}

// Close Edit Modal
function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
  editingBookingId = null;
}

// Save Booking Edit
async function saveBookingEdit() {
  if (!editingBookingId) {
    alert("No booking selected");
    return;
  }
  
  const name = document.getElementById("editName").value.trim();
  const phone = document.getElementById("editPhone").value.trim();
  const pickup = document.getElementById("editPickup").value.trim();
  const drop = document.getElementById("editDrop").value.trim();
  const pickupDate = document.getElementById("editPickupDate").value;
  const pickupTime = document.getElementById("editPickupTime").value;
  const vehicle = document.getElementById("editVehicle").value;
  const notes = document.getElementById("editNotes").value.trim();
  
  // Validate
  if (!name || !phone || !pickup || !drop || !pickupDate || !pickupTime) {
    alert("❌ Please fill in all required fields");
    return;
  }
  
  try {
    console.log(`→ Saving edit for booking ${editingBookingId}`);
    
    await db.collection("bookings").doc(editingBookingId).update({
      name: name,
      phone: phone,
      pickup: pickup,
      drop: drop,
      pickupDate: pickupDate,
      pickupTime: pickupTime,
      vehicle: vehicle,
      notes: notes,
      updatedAt: new Date().toISOString()
    });
    
    console.log("✓ Booking updated successfully");
    alert("✅ Booking updated successfully");
    closeEditModal();
  } catch (error) {
    console.error("✗ Error saving booking:", error);
    alert("❌ Error updating booking: " + error.message);
  }
}console.log("✓ Admin.js loaded successfully");
