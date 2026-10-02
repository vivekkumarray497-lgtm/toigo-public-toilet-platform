/**
 * TOIGO: Map Controller (Google Maps HD Engine + Geolocation + Navigation Routing)
 */

class MapController {
    constructor() {
        this.map = null;
        this.markersLayer = null;
        this.userMarker = null;
        this.routeLayer = null;
        this.currentTileLayer = null;
        this.mapType = 'google_streets'; // 'google_streets' | 'google_satellite' | 'osm'
        this.userCoords = { lat: 28.6315, lng: 77.2167 }; // Default Central Delhi
        this.isLocating = false;
        this.hasSeededLive = false;
    }

    init(containerId = 'map-view') {
        if (this.map) {
            this.map.invalidateSize();
            return;
        }

        const mapEl = document.getElementById(containerId);
        if (!mapEl) return;

        // Create Leaflet map container
        this.map = L.map(containerId, {
            zoomControl: false,
            attributionControl: false
        }).setView([this.userCoords.lat, this.userCoords.lng], 16);

        // Add Google Maps HD Street Layer (No watermarks, clean authentic Google Maps UI!)
        this.setMapType('google_streets');

        // Markers and Route groups
        this.markersLayer = L.layerGroup().addTo(this.map);
        this.routeLayer = L.layerGroup().addTo(this.map);

        // Add User Location indicator
        this.updateUserMarker();

        // Auto-detect GPS location
        this.locateUser(false);
    }

    // Switch between Google Street and Google Satellite
    setMapType(type) {
        this.mapType = type;
        if (this.currentTileLayer && this.map) {
            this.map.removeLayer(this.currentTileLayer);
        }

        let tileUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'; // Google Street Maps
        if (type === 'google_satellite') {
            tileUrl = 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}'; // Google Hybrid Satellite
        } else if (type === 'osm') {
            tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        }

        this.currentTileLayer = L.tileLayer(tileUrl, {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(this.map);
    }

    toggleSatellite() {
        if (this.mapType === 'google_streets') {
            this.setMapType('google_satellite');
            window.app.showToast('Switched to Google Satellite View 🛰️', 'info');
        } else {
            this.setMapType('google_streets');
            window.app.showToast('Switched to Google Street Map 🗺️', 'info');
        }
    }

    zoomIn() {
        if (this.map) this.map.zoomIn();
    }

    zoomOut() {
        if (this.map) this.map.zoomOut();
    }

    locateUser(panToUser = true) {
        if (!navigator.geolocation) {
            console.log('Geolocation not supported, using default coordinates.');
            this.renderToiletMarkers();
            return;
        }

        this.isLocating = true;
        const locateBtn = document.getElementById('locate-me-btn');
        if (locateBtn) locateBtn.classList.add('animate-spin');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.userCoords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
                this.isLocating = false;
                if (locateBtn) locateBtn.classList.remove('animate-spin');

                if (!this.hasSeededLive) {
                    window.db.seedAroundUserLocation(this.userCoords.lat, this.userCoords.lng);
                    this.hasSeededLive = true;
                }

                this.updateUserMarker();
                this.renderToiletMarkers();

                if (panToUser && this.map) {
                    this.map.flyTo([this.userCoords.lat, this.userCoords.lng], 16, { animate: true, duration: 1.2 });
                }

                window.app?.showToast('GPS Location updated! Showing nearest washrooms.', 'success');
                window.userFlow?.renderToiletList();
            },
            (err) => {
                console.warn('Geolocation failed or denied:', err.message);
                this.isLocating = false;
                if (locateBtn) locateBtn.classList.remove('animate-spin');
                this.renderToiletMarkers();
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }

    updateUserMarker() {
        if (!this.map) return;

        if (this.userMarker) {
            this.userMarker.setLatLng([this.userCoords.lat, this.userCoords.lng]);
        } else {
            // Google Maps authentic blue pulsing GPS location dot
            const userIcon = L.divIcon({
                className: 'custom-user-pin',
                html: `
                    <div class="relative flex items-center justify-center">
                        <span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-blue-400 opacity-70"></span>
                        <span class="relative inline-flex rounded-full h-5 w-5 bg-blue-600 border-2 border-white shadow-xl shadow-blue-500/50"></span>
                    </div>
                `,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });

            this.userMarker = L.marker([this.userCoords.lat, this.userCoords.lng], { icon: userIcon })
                .bindPopup('<div class="p-1 font-bold text-xs text-slate-800">📍 You are here</div>')
                .addTo(this.map);
        }
    }

    renderToiletMarkers(filteredToilets = null) {
        if (!this.map || !this.markersLayer) return;

        this.markersLayer.clearLayers();
        const toilets = filteredToilets || window.db.getAllToilets();

        toilets.forEach((toilet) => {
            if (!toilet.lat || !toilet.lng) return;

            const isFree = toilet.price === 0 || toilet.isFree;
            const priceBadge = isFree ? 'FREE' : `₹${toilet.price}`;
            
            // Clean Google Maps style color badges
            let badgeBg = 'bg-emerald-600';
            let glyph = '🚻';
            if (toilet.type === 'Indian') {
                badgeBg = 'bg-amber-600';
                glyph = '🇮🇳';
            } else if (toilet.type.includes('Both')) {
                badgeBg = 'bg-indigo-600';
                glyph = '✨';
            }

            const customMarkerHtml = `
                <div class="toilet-marker-pill cursor-pointer flex flex-col items-center group">
                    <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full ${badgeBg} text-white text-xs font-black shadow-xl border-2 border-white">
                        <span>${glyph}</span>
                        <span>${priceBadge}</span>
                        <span class="text-[9px] bg-black/20 px-1 py-0.2 rounded font-bold">★${toilet.rating}</span>
                    </div>
                    <div class="w-2.5 h-2.5 ${badgeBg} rotate-45 -mt-1.5 border-r border-b border-white shadow-sm"></div>
                </div>
            `;

            const icon = L.divIcon({
                className: 'custom-toilet-icon',
                html: customMarkerHtml,
                iconSize: [95, 38],
                iconAnchor: [47, 36]
            });

            const marker = L.marker([toilet.lat, toilet.lng], { icon: icon });

            marker.on('click', () => {
                window.userFlow?.selectToilet(toilet.id);
            });

            this.markersLayer.addLayer(marker);
        });
    }

    drawRouteToToilet(toilet) {
        if (!this.map || !this.routeLayer) return;

        this.routeLayer.clearLayers();

        const start = [this.userCoords.lat, this.userCoords.lng];
        const end = [toilet.lat, toilet.lng];

        // Google Maps style walking route polyline (Royal Blue)
        const polyline = L.polyline([start, end], {
            color: '#2563eb', // Google Blue
            weight: 6,
            opacity: 0.9,
            dashArray: '8, 8',
            lineCap: 'round'
        }).addTo(this.routeLayer);

        this.map.fitBounds([start, end], { padding: [80, 80] });
    }

    clearRoute() {
        if (this.routeLayer) {
            this.routeLayer.clearLayers();
        }
    }

    // Google Maps picker for Host washroom registration
    initPickerMap(containerId = 'picker-map', initialCoords = null, onSelect = null) {
        const coords = initialCoords || this.userCoords;
        const pickerMap = L.map(containerId, {
            zoomControl: true,
            attributionControl: false
        }).setView([coords.lat, coords.lng], 16);

        L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(pickerMap);

        const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(pickerMap);

        marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            if (onSelect) onSelect(pos.lat, pos.lng);
        });

        pickerMap.on('click', (e) => {
            marker.setLatLng(e.latlng);
            if (onSelect) onSelect(e.latlng.lat, e.latlng.lng);
        });

        setTimeout(() => pickerMap.invalidateSize(), 300);
        return pickerMap;
    }
}

window.toigoMap = new MapController();
