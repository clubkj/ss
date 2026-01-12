// Firebase Configuration & Initialization
const firebaseConfig = {
  apiKey: "AIzaSyAI4QSMoukoQR8xivZr-0eUUc8kKARkOd4",
  authDomain: "goods-5097f.firebaseapp.com",
  projectId: "goods-5097f"
};

let db = null;
let auth = null;
let currentUser = null;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();
  console.log("✓ Firebase initialized successfully");
} catch (err) {
  console.error("✗ Firebase initialization failed:", err);
  alert("Database connection failed. Please try again.");
}

// Set default vehicle on page load
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("vehicle").value = "Mini Truck";
  console.log("✓ Default vehicle set to Mini Truck");
});

// Map Initialization
let map = null;
let pickupCoords = null;
let dropCoords = null;
let pickupMarker = null;
let dropMarker = null;
let mapMode = null; // 'pickup' or 'drop' - which location we're selecting

function initMap() {
  try {
    // Center map on India (28.6139° N, 77.2090° E - New Delhi as center)
    map = L.map("map").setView([20.5937, 78.9629], 5);
    
    // Use Leaflet default tiles but with India focus
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 4 // Prevent zooming out too much
    }).addTo(map);
    
    // Restrict map bounds to India (with slight padding)
    const indiaBounds = L.latLngBounds(
      [8.4, 68.7],   // Southwest corner (Kanyakumari)
      [35.5, 97.4]   // Northeast corner (Arunachal Pradesh)
    );
    map.setMaxBounds(indiaBounds);
    
    // Add click handler to map for location selection
    map.on("click", function(e) {
      if (mapMode) {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        
        if (mapMode === "pickup") {
          pickupCoords = { lat, lon };
          if (pickupMarker) map.removeLayer(pickupMarker);
          pickupMarker = L.marker([lat, lon], { 
            draggable: true,
            title: "Pickup Location",
            icon: L.icon({
              iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%234CAF50"/><text x="20" y="28" font-size="20" text-anchor="middle" fill="white">📍</text></svg>',
              iconSize: [40, 40],
              iconAnchor: [20, 40]
            })
          })
            .bindPopup("<strong>📍 Pickup Location</strong><br><small>Drag to adjust</small>")
            .addTo(map)
            .openPopup();
          
          pickupMarker.on("dragend", function() {
            const pos = pickupMarker.getLatLng();
            pickupCoords = { lat: pos.lat, lon: pos.lng };
            console.log("✓ Pickup moved to:", pickupCoords);
            calc();
          });
          
          document.getElementById("pickup").value = `📍 (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
          console.log("✓ Pickup pin placed at:", pickupCoords);
          calc();
        } else if (mapMode === "drop") {
          dropCoords = { lat, lon };
          if (dropMarker) map.removeLayer(dropMarker);
          dropMarker = L.marker([lat, lon], { 
            draggable: true,
            title: "Drop Location",
            icon: L.icon({
              iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%23FF6B35"/><text x="20" y="28" font-size="20" text-anchor="middle" fill="white">📍</text></svg>',
              iconSize: [40, 40],
              iconAnchor: [20, 40]
            })
          })
            .bindPopup("<strong>🎯 Drop Location</strong><br><small>Drag to adjust</small>")
            .addTo(map)
            .openPopup();
          
          dropMarker.on("dragend", function() {
            const pos = dropMarker.getLatLng();
            dropCoords = { lat: pos.lat, lon: pos.lng };
            console.log("✓ Drop moved to:", dropCoords);
            calc();
          });
          
          document.getElementById("drop").value = `📍 (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
          console.log("✓ Drop pin placed at:", dropCoords);
          calc();
        }
        
        mapMode = null; // Disable mode after one click
      }
    });
    
    console.log("✓ Map initialized successfully with location picker");
  } catch (err) {
    console.error("✗ Map initialization failed:", err);
  }
}

// Geocoding Function
async function geo(q) {
  if (!q || q.trim().length === 0) return null;
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`
    );
    const data = await response.json();
    
    if (!data || data.length === 0) {
      console.warn(`⚠ No coordinates found for: ${q}`);
      return null;
    }
    
    const coords = { lat: +data[0].lat, lon: +data[0].lon };
    console.log(`✓ Geocoded "${q}":`, coords);
    return coords;
  } catch (err) {
    console.error("✗ Geocoding error for", q, ":", err);
    return null;
  }
}

// Get Route Distance Using OSRM (Open Source Routing Machine)
// This calculates actual road distance with turn-by-turn directions
async function getRouteDistance(start, end) {
  try {
    // OSRM expects coordinates as lon,lat (reverse of usual lat,lon)
    // steps=true includes turn-by-turn directions
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&steps=true&geometries=geojson`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = route.distance / 1000;
      const durationMin = Math.round(route.duration / 60);
      
      // Extract turn-by-turn directions
      const directions = [];
      if (route.legs && route.legs.length > 0) {
        route.legs.forEach(leg => {
          if (leg.steps) {
            leg.steps.forEach((step, idx) => {
              const direction = getCompassDirection(step.maneuver.bearing_after);
              const instruction = step.maneuver.instruction || `Turn ${direction}`;
              directions.push({
                instruction: instruction,
                distance: step.distance,
                distanceKm: (step.distance / 1000).toFixed(2),
                duration: Math.round(step.duration),
                name: step.name || "Unnamed Road",
                direction: direction,
                bearing: step.maneuver.bearing_after,
                type: step.maneuver.type
              });
            });
          }
        });
      }
      
      console.log(`✓ Route calculated: ${distanceKm.toFixed(1)} km, ${durationMin} min (${directions.length} steps)`);
      
      return {
        distance: distanceKm,
        duration: durationMin,
        geometry: route.geometry,
        directions: directions
      };
    } else {
      console.warn("⚠ No route found, falling back to straight line distance");
      return null;
    }
  } catch (err) {
    console.error("✗ OSRM error:", err.message || err);
    return null;
  }
}

// Convert bearing (0-360) to compass direction
function getCompassDirection(bearing) {
  const directions = ['↑ North', '↗ NE', '→ East', '↘ SE', '↓ South', '↙ SW', '← West', '↖ NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

// Haversine Distance Formula (Fallback)
function hav(a, b) {
  const R = 6371; // Earth's radius in km
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + 
            Math.cos(a.lat * Math.PI / 180) * 
            Math.cos(b.lat * Math.PI / 180) * 
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Price Calculation
let distKM = 0;
let estPrice = 0;

// Generate unique booking code (like Rapido)
function generateBookingCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Activate map location picker mode
function selectLocationOnMap(mode) {
  console.log(`→ Activating map mode for: ${mode}`);
  
  if (!map) {
    alert("Map not initialized. Please wait a moment and try again.");
    return;
  }
  
  mapMode = mode;
  alert(`📍 Click on the map to select ${mode} location.\nYou can drag the marker to adjust it.`);
  
  // Center map on India and zoom in
  map.setView([20.5937, 78.9629], 5);
}

// Use current device location
function useCurrentLocation(mode) {
  console.log(`→ Getting current location for: ${mode}`);
  
  if (!navigator.geolocation) {
    alert("❌ Geolocation is not supported by your browser.");
    return;
  }
  
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = "🔄 Detecting...";
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      
      console.log(`✓ Current location detected: ${lat}, ${lon}`);
      
      if (mode === "pickup") {
        pickupCoords = { lat, lon };
        if (pickupMarker) map.removeLayer(pickupMarker);
        pickupMarker = L.marker([lat, lon], { draggable: true })
          .bindPopup("📍 Your Pickup Location<br><small>Drag to adjust</small>")
          .addTo(map)
          .openPopup();
        
        pickupMarker.on("dragend", function() {
          const pos = pickupMarker.getLatLng();
          pickupCoords = { lat: pos.lat, lon: pos.lng };
          console.log("✓ Pickup moved to:", pickupCoords);
          calc();
        });
        
        document.getElementById("pickup").value = `📍 Current Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        map.setView([lat, lon], 15);
      } else if (mode === "drop") {
        dropCoords = { lat, lon };
        if (dropMarker) map.removeLayer(dropMarker);
        dropMarker = L.marker([lat, lon], { draggable: true })
          .bindPopup("📍 Your Drop Location<br><small>Drag to adjust</small>")
          .addTo(map)
          .openPopup();
        
        dropMarker.on("dragend", function() {
          const pos = dropMarker.getLatLng();
          dropCoords = { lat: pos.lat, lon: pos.lng };
          console.log("✓ Drop moved to:", dropCoords);
          calc();
        });
        
        document.getElementById("drop").value = `📍 Current Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        map.setView([lat, lon], 15);
      }
      
      console.log(`✓ ${mode} location set to current position`);
      calc();
      
      btn.disabled = false;
      btn.textContent = "📍 Use My Location";
    },
    (error) => {
      console.error("✗ Geolocation error:", error);
      let msg = "Location access denied.";
      if (error.code === 1) msg = "❌ Please allow location access in your browser settings.";
      if (error.code === 2) msg = "⚠️ Location service unavailable. Try again or click on map.";
      if (error.code === 3) msg = "⏱️ Location request timed out. Try again.";
      
      alert(msg);
      btn.disabled = false;
      btn.textContent = "📍 Use My Location";
    }
  );
}

async function calc() {
  if (!pickupCoords || !dropCoords) return;
  
  const distInfo = document.getElementById("distanceInfo");
  const priceInfo = document.getElementById("priceInfo");
  
  // Calculate straight-line distance immediately
  distKM = hav(pickupCoords, dropCoords);
  
  // Show immediate results
  distInfo.innerText = `📍 Distance: ${distKM.toFixed(1)} km`;
  distInfo.style.display = "block";
  
  let base = 250, rate = 25, minKm = 5;
  
  const vehicleEl = document.getElementById("vehicle");
  if (vehicleEl && vehicleEl.value === "Mini Truck") { base = 250; rate = 25; }
  if (vehicleEl && vehicleEl.value === "Pickup") { base = 250; rate = 28; }
  if (vehicleEl && vehicleEl.value === "Tempo") { base = 300; rate = 35; }
  
  estPrice = Math.round(base + Math.max(distKM - minKm, 0) * rate);
  
  priceInfo.innerText = `💰 Price: ₹${estPrice}`;
  priceInfo.style.display = "block";
  
  console.log(`✓ Calculated: ${distKM.toFixed(1)} km, ₹${estPrice}`);
}

// Display turn-by-turn navigation steps
function displayNavigationSteps(directions) {
  const navSteps = document.getElementById("navigationSteps");
  
  let html = '<div style="font-size: 13px;">';
  html += `<div style="background: #4CAF50; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-weight: bold; text-align: center;">
    ▶️ ${directions.length} Steps to Destination
  </div>`;
  
  directions.slice(0, 15).forEach((step, idx) => {
    const nextStep = idx + 1;
    const stepColor = idx === 0 ? '#4CAF50' : '#2196F3';
    const stepBg = idx === 0 ? 'rgba(76, 175, 80, 0.2)' : 'rgba(33, 150, 243, 0.1)';
    
    html += `
      <div style="background: ${stepBg}; padding: 10px; margin-bottom: 8px; border-radius: 4px; border-left: 3px solid ${stepColor};">
        <div style="font-weight: bold; color: #fff; margin-bottom: 5px;">
          ${nextStep}. ${step.instruction}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; color: #ddd;">
          <div>🛣️ ${step.name || 'Unnamed Road'}</div>
          <div>📏 ${step.distanceKm} km</div>
        </div>
        <div style="font-size: 11px; color: #bbb; margin-top: 5px;">
          ⏱️ ${step.duration < 60 ? step.duration + 's' : Math.ceil(step.duration / 60) + ' min'}
        </div>
      </div>
    `;
  });
  
  if (directions.length > 15) {
    html += `<p style="text-align: center; color: #999; font-size: 12px;">... and ${directions.length - 15} more steps</p>`;
  }
  
  html += '</div>';
  navSteps.innerHTML = html;
}

// Toggle navigation panel
function toggleNavigationPanel() {
  const navPanel = document.getElementById("navigationPanel");
  const btn = event.target;
  if (navPanel.style.display === "none") {
    navPanel.style.display = "block";
    btn.textContent = "▼ Hide";
  } else {
    navPanel.style.display = "none";
    btn.textContent = "▶ Show";
  }
}

// DOM Ready Handler
document.addEventListener("DOMContentLoaded", function() {
  console.log("✓ DOMContentLoaded fired");
  
  // Check if user is logged in
  auth.onAuthStateChanged(user => {
    if (!user) {
      console.log("✗ User not logged in, redirecting to login...");
      document.body.innerHTML = `
        <div style="text-align:center; padding:60px 20px; max-width:500px; margin:0 auto;">
          <h1>🔐 Login Required</h1>
          <p style="font-size:16px; color:#666; margin:20px 0;">You need to sign in first to book a vehicle.</p>
          <a href="user.html" style="background:#667eea; color:white; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block; margin:10px 5px;">Sign In / Sign Up</a>
          <a href="index.html" style="background:#999; color:white; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block; margin:10px 5px;">Back to Home</a>
        </div>
      `;
      return;
    }
    
    console.log("✓ User logged in:", user.email);
    currentUser = user;
    
    // Pre-fill name and phone if available
    db.collection("customers").doc(user.uid).get().then(doc => {
      let customerData = {};
      if (doc.exists) {
        customerData = doc.data();
        if (customerData.name) document.getElementById("name").value = customerData.name;
        if (customerData.phone) document.getElementById("phone").value = customerData.phone;
        console.log("✓ Pre-filled customer info");
      }
      
      // Show user info
      const userInfo = document.getElementById("userInfo");
      if (userInfo) {
        document.getElementById("userName").textContent = customerData?.name || user.email;
        document.getElementById("userPhone").textContent = customerData?.phone || "-";
        userInfo.style.display = "flex";
      }
    });
    
    // Continue with form setup
    initializeForm();
  });
});

function logout() {
  auth.signOut().then(() => {
    window.location.href = "user.html";
  });
}

function initializeForm() {
  
  // Get all DOM elements
  const pickupEl = document.getElementById("pickup");
  const dropEl = document.getElementById("drop");
  const vehicleEl = document.getElementById("vehicle");
  const confirmBtn = document.getElementById("confirmBtn");
  const nameEl = document.getElementById("name");
  const phoneEl = document.getElementById("phone");
  const loadingEl = document.getElementById("loadingRequired");
  const notesEl = document.getElementById("notes");
  const pickupDateEl = document.getElementById("pickupDate");
  const pickupTimeEl = document.getElementById("pickupTime");
  const statusEl = document.getElementById("bookingStatus");
  
  // Validate all elements exist
  if (!pickupEl || !dropEl || !vehicleEl || !confirmBtn || !nameEl || !phoneEl) {
    console.error("✗ CRITICAL: Missing required DOM elements");
    console.error("  - pickupEl:", !!pickupEl);
    console.error("  - dropEl:", !!dropEl);
    console.error("  - vehicleEl:", !!vehicleEl);
    console.error("  - confirmBtn:", !!confirmBtn);
    console.error("  - nameEl:", !!nameEl);
    console.error("  - phoneEl:", !!phoneEl);
    alert("❌ Page failed to load. Refresh browser and try again.");
    return;
  }
  
  console.log("✓ All DOM elements found");
  
  // Check Firebase status
  if (!db) {
    console.error("✗ CRITICAL: Firebase Firestore not initialized");
    statusEl.innerText = "❌ Database not connected. Check console for details.";
    statusEl.style.color = "red";
    alert("❌ Firebase connection failed.\n\nCheck:\n1. Internet connection\n2. Firebase config in code\n3. Browser console (F12) for errors");
    return;
  }
  
  // Initialize map
  initMap();
  
  // Pickup location handler
  pickupEl.addEventListener("blur", async function() {
    console.log("→ Pickup blur event triggered");
    const location = pickupEl.value.trim();
    
    if (location.length === 0) {
      console.log("⚠ Empty pickup location");
      return;
    }
    
    pickupCoords = await geo(location);
    
    if (pickupCoords && map) {
      try {
        L.marker([pickupCoords.lat, pickupCoords.lon]).addTo(map);
        map.setView([pickupCoords.lat, pickupCoords.lon], 13);
        calc();
      } catch (err) {
        console.error("✗ Error updating map for pickup:", err);
      }
    } else {
      console.warn("⚠ Could not geocode pickup location");
      alert("Pickup location not found. Try a different name.");
    }
  });
  
  // Drop location handler
  dropEl.addEventListener("blur", async function() {
    console.log("→ Drop blur event triggered");
    const location = dropEl.value.trim();
    
    if (location.length === 0) {
      console.log("⚠ Empty drop location");
      return;
    }
    
    dropCoords = await geo(location);
    
    if (dropCoords && map) {
      try {
        L.marker([dropCoords.lat, dropCoords.lon]).addTo(map);
        map.setView([dropCoords.lat, dropCoords.lon], 13);
        calc();
      } catch (err) {
        console.error("✗ Error updating map for drop:", err);
      }
    } else {
      console.warn("⚠ Could not geocode drop location");
      alert("Drop location not found. Try a different name.");
    }
  });
  
  // Vehicle change handler
  vehicleEl.addEventListener("change", function() {
    console.log("→ Vehicle changed to:", vehicleEl.value);
    calc();
  });
  
  // CONFIRM BOOKING BUTTON - EXPLICIT HANDLER
  confirmBtn.addEventListener("click", async function(e) {
    e.preventDefault();
    console.log("→ CONFIRM BOOKING clicked");
    console.log("→ Starting validation...");
    
    // Validation
    if (!nameEl.value || !nameEl.value.trim()) {
      alert("❌ Please enter your name");
      console.warn("⚠ Name is empty");
      return;
    }
    console.log("✓ Name valid:", nameEl.value);
    
    if (!phoneEl.value || !phoneEl.value.trim()) {
      alert("❌ Please enter your phone number");
      console.warn("⚠ Phone is empty");
      return;
    }
    console.log("✓ Phone valid:", phoneEl.value);
    
    if (!pickupEl.value || !pickupEl.value.trim()) {
      alert("❌ Please enter pickup location");
      console.warn("⚠ Pickup is empty");
      return;
    }
    console.log("✓ Pickup entered:", pickupEl.value);
    
    if (!dropEl.value || !dropEl.value.trim()) {
      alert("❌ Please enter drop location");
      console.warn("⚠ Drop is empty");
      return;
    }
    console.log("✓ Drop entered:", dropEl.value);
    
    if (!pickupCoords) {
      alert("❌ Pickup location not detected.\n\nPlease click outside the Pickup field after typing to detect the location.");
      console.warn("⚠ Pickup coordinates missing");
      return;
    }
    console.log("✓ Pickup coords found:", pickupCoords);
    
    if (!dropCoords) {
      alert("❌ Drop location not detected.\n\nPlease click outside the Drop field after typing to detect the location.");
      console.warn("⚠ Drop coordinates missing");
      return;
    }
    console.log("✓ Drop coords found:", dropCoords);
    
    if (!pickupDateEl.value) {
      alert("❌ Please select pickup date");
      console.warn("⚠ Pickup date missing");
      return;
    }
    console.log("✓ Pickup date valid:", pickupDateEl.value);
    
    if (!pickupTimeEl.value) {
      alert("❌ Please select pickup time");
      console.warn("⚠ Pickup time missing");
      return;
    }
    console.log("✓ Pickup time valid:", pickupTimeEl.value);
    
    if (!db) {
      console.error("✗ Firebase not initialized");
      alert("❌ Database connection failed.\n\nTry refreshing the page.");
      return;
    }
    console.log("✓ Firebase database ready");
    
    // Show processing state
    statusEl.innerText = "⏳ Processing your booking...";
    statusEl.style.color = "#1e88e5";
    statusEl.style.display = "block";
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = "0.6";
    confirmBtn.style.cursor = "not-allowed";
    
    console.log("→ All validations passed. Preparing booking data...");
    
    try {
      const bookingData = {
        bookingCode: generateBookingCode(),
        customerId: currentUser.uid,
        name: nameEl.value.trim(),
        phone: phoneEl.value.trim(),
        pickup: pickupEl.value.trim(),
        drop: dropEl.value.trim(),
        pickupLat: parseFloat(pickupCoords.lat),
        pickupLon: parseFloat(pickupCoords.lon),
        dropLat: parseFloat(dropCoords.lat),
        dropLon: parseFloat(dropCoords.lon),
        pickupDate: pickupDateEl.value,
        pickupTime: pickupTimeEl.value,
        vehicle: vehicleEl.value,
        distance: parseFloat((Math.round(distKM * 100) / 100).toFixed(2)),
        estimatedPrice: parseInt(estPrice),
        loadingRequired: loadingEl.checked,
        notes: notesEl.value.trim(),
        status: "new",
        createdAt: new Date().toISOString()
      };
      
      console.log("📦 Booking data prepared:", bookingData);
      console.log("→ Connecting to Firestore...");
      
      const docRef = await db.collection("bookings").add(bookingData);
      
      console.log("✓✓✓ BOOKING SAVED SUCCESSFULLY ✓✓✓");
      console.log("✓ Document ID:", docRef.id);
      console.log("✓ Booking Code:", bookingData.bookingCode);
      console.log("✓ Firestore URL: https://console.firebase.google.com/project/goods-5097f/firestore/data");
      
      statusEl.innerText = "✅ Booking confirmed! Your data has been saved. Redirecting...";
      statusEl.style.color = "green";
      
      // Store booking code in session for success page
      sessionStorage.setItem("lastBookingCode", bookingData.bookingCode);
      
      // Redirect after 2 seconds for user feedback
      setTimeout(() => {
        console.log("→ Redirecting to my-orders.html");
        window.location.href = "my-orders.html";
      }, 2000);
      
    } catch (error) {
      console.error("✗✗✗ BOOKING FAILED ✗✗✗");
      console.error("Error name:", error.name);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Full error object:", error);
      
      statusEl.innerText = "❌ Booking failed: " + error.message;
      statusEl.style.color = "red";
      statusEl.style.display = "block";
      
      alert("❌ Booking failed!\n\nError: " + error.message + "\n\nCheck browser console (F12) for details.");
      
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = "1";
      confirmBtn.style.cursor = "pointer";
    }
  });
  
  console.log("✓ All event handlers attached");
  
  // TEST FUNCTION - Test Firebase connection
  window.testFirebase = async function() {
    console.log("→ Testing Firebase connection...");
    if (!db) {
      alert("❌ Firebase NOT connected");
      return;
    }
    try {
      const result = await db.collection("test").add({ test: true, timestamp: new Date().toISOString() });
      alert("✅ Firebase is working!\nTest document ID: " + result.id);
      console.log("✓ Firebase test successful, doc ID:", result.id);
    } catch (err) {
      alert("❌ Firebase test failed: " + err.message);
      console.error("✗ Firebase test error:", err);
    }
  };
  
  console.log("✓ Type in console: testFirebase() to verify Firebase works");
}
