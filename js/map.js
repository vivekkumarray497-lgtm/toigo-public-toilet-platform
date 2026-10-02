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
        this.userCoords = { lat: 28.6315, lng: 77.2167 };
        this.isLocating = false;
    }

    init(containerId = 'map-view') {
        if (this.map) {
            this.map.invalidateSize();
            return;
        }

        const mapEl = document.getElementById(containerId);
        if (!mapEl) return;

        this.map = L.map(containerId, {
            zoomControl: false,
            attributionControl: false
        }).setView([this.userCoords.lat, this.userCoords.lng], 16);

        this.setMapType('google_streets');

        this.markersLayer = L.layerGroup().addTo(this.map);
        this.routeLayer = L.layerGroup().addTo(this.map);

        this.updateUserMarker();
        this.renderApprovedMarkers();
    }

    setMapType(type) {
        this.mapType = type;
        if (this.currentTileLayer && this.map) {
            this.map.removeLayer(this.currentTileLayer);
        }

        let tileUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
        if (type === 'google_satellite') {
            tileUrl = 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}';
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

                this.updateUserMarker();
                this.renderApprovedMarkers();

                if (panToUser && this.map) {
                    this.map.flyTo([this.userCoords.lat, this.userCoords.lng], 16, { animate: true, duration: 1.2 });
                }

                window.app?.showToast('GPS Location synchronized!', 'success');
            },
            (err) => {
                this.isLocating = false;
                if (locateBtn) locateBtn.classList.remove('animate-spin');
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

    // STRICT: Only renders approved active toilets on map for users
    renderApprovedMarkers(toilets = null) {
        if (!this.map || !this.markersLayer) return;
        this.markersLayer.clearLayers();

        const list = toilets || window.db.getPublicApprovedToilets();

        list.forEach(toilet => {
            const isIndian = toilet.commodeType.includes('Indian');
            const pinColor = isIndian ? 'bg-amber-500' : 'bg-emerald-600';
            const pinIcon = isIndian ? '🇮🇳' : '🚽';

            const customIcon = L.divIcon({
                className: 'custom-toilet-marker',
                html: `
                    <div class="cursor-pointer transform hover:scale-110 transition duration-200">
                        <div class="relative flex items-center justify-center">
                            <div class="w-10 h-10 rounded-2xl ${pinColor} text-white flex items-center justify-center text-lg shadow-xl shadow-slate-900/30 border-2 border-white">
                                ${pinIcon}
                            </div>
                            <div class="absolute -bottom-1.5 w-3 h-3 ${pinColor} rotate-45 border-r-2 border-b-2 border-white"></div>
                        </div>
                    </div>
                `,
                iconSize: [40, 44],
                iconAnchor: [20, 44]
            });

            const marker = L.marker([toilet.latitude, toilet.longitude], { icon: customIcon });

            marker.on('click', () => {
                window.userFlow?.selectToilet(toilet.toiletId);
            });

            this.markersLayer.addLayer(marker);
        });
    }

    drawRoute(targetLat, targetLng) {
        if (!this.map || !this.routeLayer) return;
        this.routeLayer.clearLayers();

        const latlngs = [
            [this.userCoords.lat, this.userCoords.lng],
            [targetLat, targetLng]
        ];

        const polyline = L.polyline(latlngs, {
            color: '#10b981',
            weight: 5,
            opacity: 0.85,
            dashArray: '8, 8',
            lineCap: 'round'
        }).addTo(this.routeLayer);

        this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }

    clearRoute() {
        if (this.routeLayer) this.routeLayer.clearLayers();
    }
}

window.toigoMap = new MapController();
