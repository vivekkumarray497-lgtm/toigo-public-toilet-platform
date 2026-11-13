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
        this.mapType = 'osm'; // 'osm' | 'satellite'
        this.userCoords = { lat: 28.6315, lng: 77.2167 };
        this.isLocating = false;
    }

    init(containerId = 'map-view') {
        const mapEl = document.getElementById(containerId);
        if (!mapEl) return;

        if (this.map) {
            setTimeout(() => this.map.invalidateSize(), 100);
            return;
        }

        try {
            this.map = L.map(containerId, {
                zoomControl: false,
                attributionControl: false
            }).setView([this.userCoords.lat, this.userCoords.lng], 15);

            this.setMapType('osm');

            this.markersLayer = L.layerGroup().addTo(this.map);
            this.routeLayer = L.layerGroup().addTo(this.map);

            this.updateUserMarker();
            this.renderApprovedMarkers();

            setTimeout(() => {
                if (this.map) this.map.invalidateSize();
            }, 200);
        } catch (e) {
            console.warn('Map initialization note:', e);
        }
    }

    setMapType(type) {
        this.mapType = type;
        if (this.currentTileLayer && this.map) {
            this.map.removeLayer(this.currentTileLayer);
        }

        // Google Maps HD Street Map (m = standard roads, landmarks, POIs)
        let tileUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
        let options = {
            maxZoom: 21,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        };

        if (type === 'satellite' || type === 'google_satellite') {
            // Google Maps Hybrid Satellite (y = high-res satellite + road overlays & city names)
            tileUrl = 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
            options = {
                maxZoom: 21,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            };
        } else if (type === 'terrain') {
            tileUrl = 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
            options = {
                maxZoom: 21,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            };
        }

        if (this.map) {
            this.currentTileLayer = L.tileLayer(tileUrl, options).addTo(this.map);
        }
    }

    toggleSatellite() {
        if (this.mapType === 'satellite' || this.mapType === 'google_satellite') {
            this.setMapType('google_streets');
            window.app?.showToast('Switched to Google Maps Street View 🗺️', 'info');
        } else {
            this.setMapType('satellite');
            window.app?.showToast('Switched to Google Satellite View 🛰️', 'info');
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
            window.app?.showToast('Geolocation is not supported by your browser.', 'error');
            return;
        }

        this.isLocating = true;
        const locateBtns = document.querySelectorAll('#locate-me-btn, #map-locate-btn');
        locateBtns.forEach(btn => btn.classList.add('animate-spin'));

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.userCoords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
                this.isLocating = false;
                locateBtns.forEach(btn => btn.classList.remove('animate-spin'));

                if (window.userFlow) {
                    window.userFlow.userLocation = { ...this.userCoords };
                    window.userFlow.locationPermissionGranted = true;
                    window.userFlow.hideLocationNotice();
                    window.userFlow.loadAndRenderApprovedToilets();
                }

                this.updateUserMarker();
                this.renderApprovedMarkers();

                if (panToUser && this.map) {
                    this.map.flyTo([this.userCoords.lat, this.userCoords.lng], 16, { animate: true, duration: 1.2 });
                }

                window.app?.showToast('GPS Location synchronized! 📍', 'success');
            },
            (err) => {
                this.isLocating = false;
                locateBtns.forEach(btn => btn.classList.remove('animate-spin'));
                console.warn('Geolocation warning:', err);
                if (window.userFlow) {
                    window.userFlow.loadAndRenderApprovedToilets();
                }
                window.app?.showToast('Using standard area coordinates. Washrooms ready!', 'info');
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
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

        const list = toilets || (window.db && window.db.getPublicApprovedToilets ? window.db.getPublicApprovedToilets() : []) || [];

        list.forEach(toilet => {
            const isIndian = toilet.commodeType && toilet.commodeType.includes('Indian');
            const pinColor = isIndian ? 'bg-amber-500' : 'bg-emerald-600';
            const pinIcon = isIndian ? '🇮🇳' : '🚽';

            const customIcon = L.divIcon({
                className: 'custom-toilet-marker',
                html: `
                    <div class="cursor-pointer transform hover:scale-110 transition duration-200" title="${toilet.name}">
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

            const lat = parseFloat(toilet.latitude);
            const lng = parseFloat(toilet.longitude);
            if (isNaN(lat) || isNaN(lng)) return;

            const marker = L.marker([lat, lng], { icon: customIcon });

            marker.on('click', () => {
                if (window.userFlow) {
                    window.userFlow.selectToilet(toilet.toiletId);
                }
            });

            this.markersLayer.addLayer(marker);
        });
    }

    drawRoute(targetLat, targetLng) {
        if (!this.map || !this.routeLayer) return;
        this.routeLayer.clearLayers();

        const lat = parseFloat(targetLat);
        const lng = parseFloat(targetLng);
        if (isNaN(lat) || isNaN(lng)) return;

        const latlngs = [
            [parseFloat(this.userCoords.lat), parseFloat(this.userCoords.lng)],
            [lat, lng]
        ];

        const polyline = L.polyline(latlngs, {
            color: '#10b981',
            weight: 5,
            opacity: 0.85,
            dashArray: '8, 8',
            lineCap: 'round'
        }).addTo(this.routeLayer);

        try {
            this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        } catch (e) {
            console.warn('fitBounds note:', e);
        }
    }

    clearRoute() {
        if (this.routeLayer) this.routeLayer.clearLayers();
    }
}

window.toigoMap = new MapController();
