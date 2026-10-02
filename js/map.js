/**
 * TOIGO: Map Controller (Leaflet.js + Live Geolocation + Custom Toilet Markers + Routing)
 */

class MapController {
    constructor() {
        this.map = null;
        this.markersLayer = null;
        this.userMarker = null;
        this.routeLayer = null;
        this.radiusCircle = null;
        this.userCoords = { lat: 28.6315, lng: 77.2167 }; // Default Central Delhi
        this.isLocating = false;
        this.hasSeededLive = false;
        this.pickerMarker = null;
    }

    init(containerId = 'map-view') {
        if (this.map) {
            this.map.invalidateSize();
            return;
        }

        const mapEl = document.getElementById(containerId);
        if (!mapEl) return;

        // Create Leaflet map
        this.map = L.map(containerId, {
            zoomControl: false,
            attributionControl: false
        }).setView([this.userCoords.lat, this.userCoords.lng], 15);

        // Tile layer (Clean modern style)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(this.map);

        // Zoom control in bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Markers group
        this.markersLayer = L.layerGroup().addTo(this.map);
        this.routeLayer = L.layerGroup().addTo(this.map);

        // Add user marker
        this.updateUserMarker();

        // Request real GPS
        this.locateUser(false);
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

                window.app?.showToast('Location updated! Showing nearest toilets.', 'success');
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
            const userIcon = L.divIcon({
                className: 'custom-user-pin',
                html: `
                    <div class="relative flex items-center justify-center">
                        <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-5 w-5 bg-emerald-600 border-2 border-white shadow-lg shadow-emerald-500/50"></span>
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            this.userMarker = L.marker([this.userCoords.lat, this.userCoords.lng], { icon: userIcon })
                .bindPopup('<div class="p-1 font-semibold text-xs text-gray-800">📍 You are here</div>')
                .addTo(this.map);
        }
    }

    renderToiletMarkers(filteredToilets = null) {
        if (!this.map || !this.markersLayer) return;

        this.markersLayer.clearLayers();
        const toilets = filteredToilets || window.db.getAllToilets();

        toilets.forEach((toilet) => {
            if (!toilet.lat || !toilet.lng) return;

            const isWestern = toilet.type.includes('English') || toilet.type.includes('Western');
            const isFree = toilet.price === 0 || toilet.isFree;
            const priceBadge = isFree ? 'FREE' : `₹${toilet.price}`;
            
            // Icon color scheme based on toilet type
            let bgGradient = 'from-emerald-500 to-teal-600';
            let iconGlyph = '🚻';
            if (toilet.type === 'Indian') {
                bgGradient = 'from-amber-500 to-orange-600';
                iconGlyph = '🇮🇳';
            } else if (toilet.type.includes('Both')) {
                bgGradient = 'from-indigo-500 to-purple-600';
                iconGlyph = '✨';
            } else if (isFree) {
                bgGradient = 'from-blue-500 to-cyan-600';
                iconGlyph = '💧';
            }

            const customMarkerHtml = `
                <div class="toilet-map-badge group cursor-pointer transform hover:scale-110 transition-all duration-200">
                    <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r ${bgGradient} text-white text-xs font-bold shadow-xl border-2 border-white">
                        <span>${iconGlyph}</span>
                        <span>${priceBadge}</span>
                        <span class="text-[10px] bg-white/20 px-1 rounded">★${toilet.rating}</span>
                    </div>
                    <div class="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1 shadow-sm"></div>
                </div>
            `;

            const icon = L.divIcon({
                className: 'custom-toilet-icon',
                html: customMarkerHtml,
                iconSize: [90, 36],
                iconAnchor: [45, 34]
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

        // Draw curved direct walking path
        const midLat = (start[0] + end[0]) / 2 + 0.0003;
        const midLng = (start[1] + end[1]) / 2 - 0.0003;

        const polyline = L.polyline([start, [midLat, midLng], end], {
            color: '#059669', // Emerald 600
            weight: 5,
            opacity: 0.85,
            dashArray: '8, 8',
            lineCap: 'round'
        }).addTo(this.routeLayer);

        // Fit bounds to show user and destination
        this.map.fitBounds([start, end], { padding: [80, 80] });
    }

    clearRoute() {
        if (this.routeLayer) {
            this.routeLayer.clearLayers();
        }
    }

    // Interactive picker for Provider when adding new toilet
    initPickerMap(containerId = 'picker-map', initialCoords = null, onSelect = null) {
        const coords = initialCoords || this.userCoords;
        const pickerMap = L.map(containerId, {
            zoomControl: true,
            attributionControl: false
        }).setView([coords.lat, coords.lng], 16);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
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
