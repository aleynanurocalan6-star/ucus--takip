import React, { useState, useEffect, useMemo, useRef } from "react";
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, ZoomControl } from 'react-leaflet';
import './PlanningPanel.css';
import './App.css';

// --- SABİT TANIMLAMALAR ---
const HIGHLIGHT_COLOR = "#FFD700";
const SELECTED_COLOR = "#007BFF";
const BASE_API_URL = "http://localhost:5058";
const PLANNED_API_URL = `${BASE_API_URL}/api/flights/planned`;
const LIVE_POS_API_URL = `${BASE_API_URL}/api/flights/livepositions`; // yeni endpoint
const POST_API_URL = `${BASE_API_URL}/api/flights`;
const PLANE_ICON_PATH = "/assets/ucak (1).png";
const initialFlights = [];

// --- YARDIMCI FONKSİYONLAR ---
const getRouteDisplay = (flight, type) => {
    const city = type === 'origin' ? flight.origin : flight.destination;
    const lat = type === 'origin' ? flight.startLat : flight.endLat;
    const lng = type === 'origin' ? flight.startLng : flight.endLng;

    if (city && typeof city === 'string' && city.trim() !== '') return city;
    if (isFinite(lat) && isFinite(lng)) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    return 'Bilinmiyor';
};

const calculatePosition = (start, end, progress) => {
    if (!Array.isArray(start) || start.length !== 2 || !Array.isArray(end) || end.length !== 2 || typeof progress !== 'number' || isNaN(progress)) {
        return [0, 0];
    }
    return [
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
    ];
};

function mapBackendStatusToEnglish(backendStatus) {
    if (backendStatus === 'ACTIVE') return 'InFlight';
    if (backendStatus === 'PENDING') return 'Scheduled';
    if (backendStatus === 'COMPLETED') return 'Completed';
    return 'Scheduled';
}
// --- YENİ UÇUŞ EKLEME FORMU COMPONENT'İ ---
const PlanningPanel = ({ show, onClose, onAddFlight }) => {
    const [formData, setFormData] = useState({
        flightId: '',
        origin: 'Ankara',
        destination: 'İstanbul',
        departureDate: new Date().toISOString().slice(0, 10),
        arrivalDate: new Date().toISOString().slice(0, 10),
        departureTime: '12:00',
        arrivalTime: '14:00',
        startCoords: '39.93, 32.85',
        endCoords: '41.00, 28.97',
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        const startArr = formData.startCoords.split(',').map(c => parseFloat(c.trim()));
        const endArr = formData.endCoords.split(',').map(c => parseFloat(c.trim()));

        if (!formData.flightId || startArr.length !== 2 || endArr.length !== 2 || isNaN(startArr[0]) || isNaN(endArr[0])) {
            alert("Lütfen tüm alanları geçerli koordinatlarla (Lat, Lon) doldurunuz.");
            return;
        }

        const flightData = {
            flightId: formData.flightId.toUpperCase(),
            origin: formData.origin,
            destination: formData.destination,
            departureTimestamp: `${formData.departureDate}T${formData.departureTime}:00Z`,
            arrivalTimestamp: `${formData.arrivalDate}T${formData.arrivalTime}:00Z`,
            departureDate: formData.departureDate,
            departureTime: formData.departureTime,
            arrivalDate: formData.arrivalDate,
            arrivalTime: formData.arrivalTime,
            startLat: startArr[0],
            startLng: startArr[1],
            endLat: endArr[0],
            endLng: endArr[1],
            progress: 0.01
        };

        onAddFlight(flightData);

        setFormData(prev => ({ ...prev, flightId: '', origin: 'Ankara', destination: 'İstanbul' }));
        onClose();
    };

    return (
        <div className={`planning-panel-container ${show ? 'open' : ''}`}>
            <form className="planning-panel glass-panel" onSubmit={handleSubmit}>
                <div className="panel-top-bar">
                    <h2 className="form-title">YENİ ROTA PLANLAMA</h2>
                    <button type="button" className="close-x-btn" onClick={onClose}>✕</button>
                </div>
                <p className="form-desc">Rota, şehir ve zaman bilgilerini girerek haritaya yeni bir rota ekle.</p>

                <div className="form-content">
                    <div className="form-group">
                        <label>UÇUŞ KODU (ID)</label>
                        <input type="text" name="flightId" placeholder="Örn: TK-2024" value={formData.flightId} onChange={handleChange} required />
                    </div>
                    <div className="two-col">
                        <div className="form-group">
                            <label>KALKIŞ ŞEHRİ</label>
                            <input type="text" name="origin" placeholder="Örn: Ankara" value={formData.origin} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>VARIŞ ŞEHRİ</label>
                            <input type="text" name="destination" placeholder="Örn: İstanbul" value={formData.destination} onChange={handleChange} required />
                        </div>
                    </div>

                    <hr className="divider" />

                    <div className="two-col">
                        <div className="form-group">
                            <label>KALKIŞ ZAMANI (TARİH)</label>
                            <input type="date" name="departureDate" value={formData.departureDate} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>KALKIŞ SAATİ</label>
                            <input type="time" name="departureTime" value={formData.departureTime} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="two-col">
                        <div className="form-group">
                            <label>VARIŞ ZAMANI (TARİH)</label>
                            <input type="date" name="arrivalDate" value={formData.arrivalDate} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>VARIŞ SAATİ</label>
                            <input type="time" name="arrivalTime" value={formData.arrivalTime} onChange={handleChange} required />
                        </div>
                    </div>

                    <hr className="divider" />

                    <div className="form-group">
                        <label>KALKIŞ KOORDİNATLARI (Lat, Lon)</label>
                        <input type="text" name="startCoords" placeholder="Örn: 39.93, 32.85" value={formData.startCoords} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>VARIŞ KOORDİNATLARI (Lat, Lon)</label>
                        <input type="text" name="endCoords" placeholder="Örn: 41.00, 28.97" value={formData.endCoords} onChange={handleChange} required />
                    </div>

                    <button type="submit" className="action-btn">KAYDET VE BAŞLAT</button>
                </div>
            </form>
        </div>
    );
};

// --- APP COMPONENT'İ ---
const App = () => {
    const [flights, setFlights] = useState(initialFlights);
    const [isLoading, setIsLoading] = useState(true);
    const [apiError, setApiError] = useState(null);
    const [showLeftWidget, setShowLeftWidget] = useState(true);
    const [showPlanningPanel, setShowPlanningPanel] = useState(false);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [showBottomPanel] = useState(true);
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [liveProgress, setLiveProgress] = useState(50);
    const [isLiveMode, setIsLiveMode] = useState(true);

    const mapRefs = useRef({ simulatedFlights: initialFlights });
    const liveIntervalRef = useRef(null);

    // mapIcons
    const mapIcons = useMemo(() => {
        if (!L) return null;
        const planeIcon = new L.icon({ iconUrl: PLANE_ICON_PATH, iconSize: [40, 40], iconAnchor: [20, 20], className: 'custom-plane-icon' });
        const selectedPlaneIcon = new L.icon({ iconUrl: PLANE_ICON_PATH, iconSize: [50, 50], iconAnchor: [25, 25], className: 'custom-plane-icon selected-plane' });
        const dotIconStart = new L.DivIcon({ className: 'custom-dot-icon start-dot', html: `<div style="background-color: #008000; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #008000;"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] });
        const dotIconEnd = new L.DivIcon({ className: 'custom-dot-icon end-dot', html: `<div style="background-color: #8B0000; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #8B0000;"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] });
        return { plane: planeIcon, selectedPlane: selectedPlaneIcon, start: dotIconStart, end: dotIconEnd };
    }, []);

    // --- 1. Başlangıç: planned + livepositions ilk çekim ve mapRefs set
    useEffect(() => {
        let mounted = true;
        const initFetch = async () => {
            setIsLoading(true);
            setApiError(null);
            try {
                // planned + livepositions birlikte çek
                const [plannedRes, liveRes] = await Promise.all([
                    fetch(PLANNED_API_URL),
                    fetch(LIVE_POS_API_URL)
                ]);

                if (!plannedRes.ok) throw new Error(`Planned API HTTP ${plannedRes.status}`);
                if (!liveRes.ok) throw new Error(`LivePositions API HTTP ${liveRes.status}`);

                const planned = await plannedRes.json();
                const live = await liveRes.json();

                // Birleştir
                const merged = mergeLiveWithPlanned(planned, live);

                if (!mounted) return;
                mapRefs.current.simulatedFlights = merged;
                setFlights(merged);
            } catch (err) {
                console.error("İlk veri çekme hatası:", err);
                setApiError("Veri çekilemedi. API'leri kontrol edin.");
                setFlights([]);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        initFetch();

        return () => { mounted = false; };
    }, []);

    // --- 2. Live fetch fonksiyonları ve interval yönetimi ---
    const mergeLiveWithPlanned = (planned = [], livePositions = []) => {
        const posMap = new Map((livePositions || []).map(p => [String(p.flightId), p]));
        const result = (planned || []).map((f, idx) => {
            const key = String(f.flightId || f.id || `unknown-${idx}`);
            const pos = posMap.get(key);

            const startLat = Number(f.startLat);
            const startLng = Number(f.startLng);
            const endLat = Number(f.endLat);
            const endLng = Number(f.endLng);
            if (![startLat, startLng, endLat, endLng].every(v => isFinite(v))) {
                // eğer rota koordinatları geçersizse bu uçuşu at (veya farklı davran)
                return null;
            }

            const progressFromPos = pos && isFinite(Number(pos.progress)) ? Number(pos.progress) : (isFinite(Number(f.progress)) ? Number(f.progress) : 0.01);
            const currentLat = pos && isFinite(Number(pos.latitude)) ? Number(pos.latitude) : (startLat + (endLat - startLat) * progressFromPos);
            const currentLng = pos && isFinite(Number(pos.longitude)) ? Number(pos.longitude) : (startLng + (endLng - startLng) * progressFromPos);

            return {
                id: f.id || key,
                flightId: key,
                origin: f.startCity || f.origin || '',
                destination: f.endCity || f.destination || '',
                start: [startLat, startLng],
                end: [endLat, endLng],
                startLat, startLng, endLat, endLng,
                progress: progressFromPos,
                status: (progressFromPos >= 1 ? "COMPLETED" : "InFlight"),
                speed: pos?.speed ?? f.speed ?? 0,
                altitude: pos?.altitude ?? f.altitude ?? 0,
                departureDate: f.departureDate || '',
                departureTime: f.departureTime || '',
                arrivalDate: f.arrivalDate || '',
                arrivalTime: f.arrivalTime || '',
                currentPosition: [currentLat, currentLng]
            };
        }).filter(Boolean);

        return result;
    };

    const fetchLivePositions = async () => {
        try {
            const res = await fetch(LIVE_POS_API_URL);
            if (!res.ok) {
                console.warn("livepositions fetch failed", res.status);
                return null;
            }
            const data = await res.json();
            return data;
        } catch (err) {
            console.error("fetchLivePositions hata:", err);
            return null;
        }
    };

    const fetchPlanned = async () => {
        try {
            const res = await fetch(PLANNED_API_URL);
            if (!res.ok) {
                console.warn("planned fetch failed", res.status);
                return null;
            }
            const data = await res.json();
            return data;
        } catch (err) {
            console.error("fetchPlanned hata:", err);
            return null;
        }
    };

    const fetchLiveFlights = async () => {
        // Bu fonksiyon periodic olarak sadece livePositions'ı çekip mapRefs'i günceller.
        try {
            const [planned, livePositions] = await Promise.all([fetchPlanned(), fetchLivePositions()]);
            if (!planned) return;
            // merge
            const merged = mergeLiveWithPlanned(planned, livePositions || []);
            mapRefs.current.simulatedFlights = merged;
            setFlights(merged);
        } catch (err) {
            console.error("fetchLiveFlights hata:", err);
        }
    };

    const startLiveUpdate = (intervalMs = 2000) => {
        if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
        // ilk anlık çekiş
        fetchLiveFlights();
        liveIntervalRef.current = setInterval(fetchLiveFlights, intervalMs);
    };

    useEffect(() => {
        // mount olduğunda canlı güncellemeyi başlat
        startLiveUpdate(2000);
        return () => {
            if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
        };
    }, []);

    // --- 3. POST: Yeni uçuş ekleme ---
    const handleAddFlight = async (newFlightData) => {
        setShowPlanningPanel(false);
        setShowLeftWidget(false);

        try {
            const response = await fetch(POST_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newFlightData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Uçuş kaydı başarısız: HTTP ${response.status} - ${errorText.substring(0, 200)}`);
            }

            const savedFlight = await response.json();

            const startCoords = [savedFlight.startLat ?? newFlightData.startLat, savedFlight.startLng ?? newFlightData.startLng];
            const endCoords = [savedFlight.endLat ?? newFlightData.endLat, savedFlight.endLng ?? newFlightData.endLng];

            const newFlight = {
                id: savedFlight.id || newFlightData.flightId,
                flightId: savedFlight.flightId || newFlightData.flightId,
                origin: newFlightData.origin,
                destination: newFlightData.destination,
                departureDate: newFlightData.departureDate,
                departureTime: newFlightData.departureTime,
                arrivalDate: newFlightData.arrivalDate,
                arrivalTime: newFlightData.arrivalTime,
                startLat: startCoords[0],
                startLng: startCoords[1],
                endLat: endCoords[0],
                endLng: endCoords[1],
                start: startCoords,
                end: endCoords,
                progress: isLiveMode ? (savedFlight.progress ?? 0.01) : (liveProgress / 100),
                currentPosition: calculatePosition(startCoords, endCoords, isLiveMode ? (savedFlight.progress ?? 0.01) : (liveProgress / 100)),
                speed: savedFlight.speed ?? 0,
                altitude: savedFlight.altitude ?? 0,
                status: (savedFlight.progress >= 1) ? "COMPLETED" : "InFlight"
            };

            setFlights(prev => [...prev, newFlight]);
            mapRefs.current.simulatedFlights = [...mapRefs.current.simulatedFlights, newFlight];

            setShowLeftWidget(true);
            setSelectedFlight(newFlight);
            setShowDetailPanel(true);
            alert(`Uçuş ${newFlight.flightId} başarıyla eklendi!`);
        } catch (err) {
            console.error("Uçuş ekleme hatası:", err);
            alert(`Uçuş eklenemedi: ${err.message}`);
        }
    };

    // --- 4. Simülasyon fallback (local simulated progress) ---
    useEffect(() => {
        const sim = setInterval(() => {
            if (isLiveMode) {
                mapRefs.current.simulatedFlights = mapRefs.current.simulatedFlights.map(f => {
                    const newProgress = (f.progress >= 1.0) ? 0 : (f.progress + 0.002); // çok yavaş artış, backend override edebilir
                    return { ...f, progress: newProgress, currentPosition: calculatePosition(f.start, f.end, newProgress) };
                });
                setFlights([...mapRefs.current.simulatedFlights]);
                const firstFlightProgress = mapRefs.current.simulatedFlights[0]?.progress || 0;
                setLiveProgress(Math.floor(firstFlightProgress * 100));
            }
        }, 300);
        return () => clearInterval(sim);
    }, [isLiveMode]);

    // --- 5. Playback slider ---
    const handleSliderChange = (e) => {
        const value = parseInt(e.target.value);
        setLiveProgress(value);
        if (isLiveMode) setIsLiveMode(false);
        const playbackProgress = value / 100;
        const updatedFlights = mapRefs.current.simulatedFlights.map(f => {
            const newPosition = calculatePosition(f.start, f.end, playbackProgress);
            return { ...f, progress: playbackProgress, currentPosition: newPosition };
        });
        mapRefs.current.simulatedFlights = updatedFlights;
        setFlights(updatedFlights);
    };

    // --- 6. UI handlers ---
    const handleFlightClick = (flight) => {
        setSelectedFlight(flight);
        setShowPlanningPanel(false);
        setShowDetailPanel(true);
        setShowLeftWidget(false);
    };
    const togglePlanningPanel = () => { setShowDetailPanel(false); setSelectedFlight(null); setShowPlanningPanel(!showPlanningPanel); setShowLeftWidget(false); };
    const toggleLeftPanel = () => { setShowLeftWidget(!showLeftWidget); setShowDetailPanel(false); setShowPlanningPanel(false); setSelectedFlight(null); };

    const visibleFlights = flights;

    // --- 7. Detay panel memo ---
    const DetailPanelContent = useMemo(() => {
        if (!selectedFlight) return null;
        const progressPercent = ((selectedFlight.progress || 0) * 100).toFixed(0);
        const originDisplay = getRouteDisplay(selectedFlight, 'origin');
        const destinationDisplay = getRouteDisplay(selectedFlight, 'destination');
        const depDate = selectedFlight.departureDate || 'Tarih Bilinmiyor';
        const arrDate = selectedFlight.arrivalDate || 'Tarih Bilinmiyor';
        const depTime = selectedFlight.departureTime || 'Saat Bilinmiyor';
        const arrTime = selectedFlight.arrivalTime || 'Saat Bilinmiyor';
        const startCoords = selectedFlight.startLat && selectedFlight.startLng ? `${selectedFlight.startLat.toFixed(4)}, ${selectedFlight.startLng.toFixed(4)}` : 'Koordinat Bilinmiyor';
        const endCoords = selectedFlight.endLat && selectedFlight.endLng ? `${selectedFlight.endLat.toFixed(4)}, ${selectedFlight.endLng.toFixed(4)}` : 'Koordinat Bilinmiyor';
        const currentStatus = mapBackendStatusToTurkish(selectedFlight.status);
        const simStatus = isLiveMode ? `Canlı / ${currentStatus}` : "Geri Oynatım";
        const speed = selectedFlight.speed ? `${selectedFlight.speed} km/s` : 'Bilinmiyor';
        const altitude = selectedFlight.altitude ? `${selectedFlight.altitude} ft` : 'Bilinmiyor';

        return (
            <div className="detail-panel large-glass-panel open">
                <div className="panel-top-bar">
                    <h2 className="detail-title">UÇUŞ DETAYLARI</h2>
                    <button
                        className="close-x-btn"
                        onClick={() => { setShowDetailPanel(false); setSelectedFlight(null); setShowLeftWidget(true); }}
                    >
                        ✕
                    </button>
                </div>

                <h3 className="detail-subtitle">✈ {selectedFlight.flightId}</h3>
                <h4 className="detail-status-text">{currentStatus}</h4>

                <hr className="divider" />

                <div className="route-info-detail">
                    <div className="route-detail-item start-time">
                        <span className="route-label">KALKIŞ KONUMU</span>
                        <span className="route-value big">{originDisplay}</span>
                    </div>
                    <div className="route-arrow-detail">➤</div>
                    <div className="route-detail-item end-time">
                        <span className="route-label">VARIŞ KONUMU</span>
                        <span className="route-value big">{destinationDisplay}</span>
                    </div>
                </div>

                <hr className="divider" />

                <div className="status-grid time-grid">
                    <div className="status-item">
                        <span className="status-label">KALKIŞ TARİHİ</span>
                        <span className="status-value">{depDate}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">KALKIŞ SAATİ</span>
                        <span className="status-value">{depTime}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">VARIŞ TARİHİ</span>
                        <span className="status-value">{arrDate}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">VARIŞ SAATİ</span>
                        <span className="status-value">{arrTime}</span>
                    </div>
                </div>

                <hr className="divider" />

                <div className="status-grid data-grid">
                    <div className="status-item full-width">
                        <span className="status-label">SIMÜLASYON DURUMU</span>
                        <span className="status-value big">{simStatus}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">HIZ (GS)</span>
                        <span className="status-value">{speed}</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">YÜKSEKLİK</span>
                        <span className="status-value">{altitude}</span>
                    </div>
                    <div className="status-item full-width">
                        <span className="status-label">KALKIŞ KOORDİNATLARI</span>
                        <span className="status-value small">{startCoords}</span>
                    </div>
                    <div className="status-item full-width">
                        <span className="status-label">VARIŞ KOORDİNATLARI</span>
                        <span className="status-value small">{endCoords}</span>
                    </div>
                </div>

                <hr className="divider" />

                <div className="progress-container">
                    <span className="status-label mb-2">UÇUŞ İLERLEMESİ ({progressPercent}%)</span>
                    <div className="progress-bar-bg">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>

                <button className="delete-flight-btn">UÇUŞU SİL (Kayıtlardan Kaldır)</button>
            </div>
        );
    }, [selectedFlight, isLiveMode]);

    // --- 8. JSX Çıktısı (Render) ---
    return (
        <div className="app-container">
            <MapContainer
                center={[39.93, 32.85]}
                zoom={6}
                scrollWheelZoom={true}
                zoomControl={false}
                className="map-container"
            >
                <TileLayer
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                />

                <ZoomControl position="bottomright" />

                {visibleFlights.map(flight => (
                    <React.Fragment key={flight.id}>
                        {/* Başlangıç Noktası */}
                        <Marker position={flight.start} icon={mapIcons.start}>
                            <Tooltip direction="top" offset={[-10, -5]} opacity={1}>
                                <strong>KALKIŞ:</strong> {getRouteDisplay(flight, 'origin')}
                            </Tooltip>
                        </Marker>

                        {/* Bitiş Noktası */}
                        <Marker position={flight.end} icon={mapIcons.end}>
                            <Tooltip direction="top" offset={[10, -5]} opacity={1}>
                                <strong>VARIŞ:</strong> {getRouteDisplay(flight, 'destination')}
                            </Tooltip>
                        </Marker>

                        {/* Rota */}
                        <Polyline positions={[flight.start, flight.end]} color={flight.id === selectedFlight?.id ? SELECTED_COLOR : HIGHLIGHT_COLOR} weight={3} opacity={0.5} />

                        {/* Uçak */}
                        <Marker
                            position={flight.currentPosition}
                            icon={flight.id === selectedFlight?.id ? mapIcons.selectedPlane : mapIcons.plane}
                            className={'flight-marker-animated'}
                            eventHandlers={{
                                click: () => handleFlightClick(flight)
                            }}
                        >
                            <Tooltip direction="right" offset={[10, 0]} opacity={1}>
                                <strong>{flight.flightId}</strong><br />
                                İlerleme: {(flight.progress * 100).toFixed(1)}%
                            </Tooltip>
                        </Marker>
                    </React.Fragment>
                ))}
            </MapContainer>

            {/* Sol Widget (Uçuş Listesi) */}
            <div id="left-panel" className={`glass-panel left-panel ${showLeftWidget ? 'open' : ''} hide-scrollbar`}>
                <div className="panel-top-bar">
                    <h2 className="panel-title">UÇUŞ LİSTESİ</h2>
                    <button className="close-x-btn" onClick={toggleLeftPanel}>✕</button>
                </div>

                {apiError && <p className="error-message">{apiError}</p>}
                {isLoading && <p className="loading-message">Uçuşlar yükleniyor...</p>}

                <div id="flight-list" className="flight-list hide-scrollbar">
                    {visibleFlights.length === 0 && !isLoading && !apiError &&
                        <p className="no-flights-message">Henüz uçuş eklenmedi.</p>
                    }
                    {visibleFlights.map(flight => (
                        <div
                            key={flight.id}
                            className={`flight-item ${flight.id === selectedFlight?.id ? 'selected' : ''}`}
                            onClick={() => handleFlightClick(flight)}
                        >
                            <div className="flight-info">
                                <strong>{flight.flightId}</strong>
                                <span>
                                    {getRouteDisplay(flight, 'origin')}
                                    ➔
                                    {getRouteDisplay(flight, 'destination')}
                                </span>
                            </div>
                            <div className="progress-bar-container">
                                <div className="progress-bar" style={{ width: `${(flight.progress || 0) * 100}%` }}></div>
                            </div>
                            <span className="flight-status">{mapBackendStatusToTurkish(flight.status)}</span>
                        </div>
                    ))}
                </div>

                <div className="panel-actions">
                    <button className="add-flight-btn" onClick={togglePlanningPanel}>+ YENİ ROTA PLANLA</button>
                </div>
            </div>

            {/* Sol Panel Açma Butonu */}
            <button
                className={`open-left-btn ${showLeftWidget ? 'hidden' : ''}`}
                onClick={toggleLeftPanel}
            >
                ☰
            </button>

            <PlanningPanel
                show={showPlanningPanel}
                onClose={() => setShowPlanningPanel(false)}
                onAddFlight={handleAddFlight}
            />

            {showDetailPanel && DetailPanelContent}

            {showBottomPanel && (
                <div className="bottom-panel glass-panel">
                    <div className="controls-group">
                        <button
                            className={`mode-btn ${isLiveMode ? 'active-live' : ''}`}
                            onClick={() => setIsLiveMode(true)}
                        >
                            Canlı Mod
                        </button>
                        <button
                            className={`mode-btn ${!isLiveMode ? 'active-playback' : ''}`}
                            onClick={() => setIsLiveMode(false)}
                        >
                            Geri Oynatım
                        </button>
                    </div>

                    <div className="slider-group">
                        <span className="slider-label">İlerleme: {liveProgress}%</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={liveProgress}
                            onChange={handleSliderChange}
                            className="custom-slider"
                            disabled={isLiveMode}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
