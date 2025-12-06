import React, { useState, useEffect, useMemo, useRef } from "react";
// Kütüphaneleri doğrudan import edin (npm install leaflet react-leaflet gereklidir)
import L from 'leaflet'; 
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, ZoomControl } from 'react-leaflet'; 
import './PlanningPanel.css';
// --- SABİT TANIMLAMALAR ---
const HIGHLIGHT_COLOR = "#FFD700"; // Altın Sarısı
const SELECTED_COLOR = "#007BFF"; // Mavi Vurgu
const BASE_API_URL = "http://localhost:5058"; 
// API'den gelen son çıktınıza göre URL'yi düzeltiyoruz
const LIVE_API_URL = `${BASE_API_URL}/api/flights/current`; 
const POST_API_URL = `${BASE_API_URL}/api/flights`; 

const PLANE_ICON_PATH = "/assets/ucak (1).png"; 
// Eğer bu ikon yolu çalışmazsa, projenizin public klasörüne bir uçak görseli eklediğinizden emin olun.

// Varsayılan boş uçuş listesi
const initialFlights = [];

/**
 * Uçuşun mevcut konumunu (progress) kullanarak Lat/Lng koordinatlarını hesaplar.
 * @param {Array<number>} start [Lat, Lon]
 * @param {Array<number>} end [Lat, Lon]
 * @param {number} progress 0.0 ile 1.0 arasında ilerleme
 * @returns {Array<number>} [Lat, Lon] mevcut konum
 */
const calculatePosition = (start, end, progress) => {
    // Güvenlik kontrolü
    if (!Array.isArray(start) || start.length !== 2 || !Array.isArray(end) || end.length !== 2 || typeof progress !== 'number' || isNaN(progress)) {
        return [0, 0]; 
    }
    // Basit lineer interpolasyon
    return [
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
    ];
};

// --- YENİ UÇUŞ EKLEME FORMU COMPONENT'İ ---
const PlanningPanel = ({ show, onClose, onAddFlight }) => {
    // 💡 Durum değişkenine Tarih alanları eklendi
    const [formData, setFormData] = useState({
        flightId: '',
        origin: '',
        destination: '',
        departureDate: new Date().toISOString().slice(0, 10), // Bugünün tarihi (YYYY-MM-DD)
        arrivalDate: new Date().toISOString().slice(0, 10), 
        departureTime: '12:00',
        arrivalTime: '14:00',
        startCoords: '39.93, 32.85', // Örn: Ankara Esenboğa
        endCoords: '41.00, 28.97',   // Örn: İstanbul Havalimanı
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const startArr = formData.startCoords.split(',').map(c => parseFloat(c.trim()));
        const endArr = formData.endCoords.split(',').map(c => parseFloat(c.trim()));

        if (!formData.flightId || startArr.length !== 2 || endArr.length !== 2 || isNaN(startArr[0]) || isNaN(endArr[0])) {
            alert("Lütfen tüm alanları geçerli koordinatlarla (Lat, Lon) doldurunuz. Örn: 39.93, 32.85");
            return;
        }

        // 💡 API'ye gönderilecek veri: Tarih ve saat birleştirilerek tam zaman damgası oluşturulabilir
        // Not: Backend genellikle bu zamanı alıp işler. API formatına uygun olarak ek alanlar da dahil edildi.
        const flightData = {
            flightId: formData.flightId.toUpperCase(),
            origin: formData.origin,
            destination: formData.destination,
            // 💡 Tam zaman damgası (Timestamp) oluşturma: 
            // Bu alan, backend'inize nasıl veri beklediğine bağlı olarak değişebilir.
            // Örnek olarak tarih ve saat stringlerini gönderiyoruz.
            departureTimestamp: `${formData.departureDate}T${formData.departureTime}:00Z`, 
            arrivalTimestamp: `${formData.arrivalDate}T${formData.arrivalTime}:00Z`, 
            
            // Eğer backend'iniz sadece bu alanları bekliyorsa:
            departureDate: formData.departureDate,
            departureTime: formData.departureTime,
            arrivalDate: formData.arrivalDate,
            arrivalTime: formData.arrivalTime,

            startLat: startArr[0], 
            startLng: startArr[1],
            endLat: endArr[0],
            endLng: endArr[1],
            progress: 0.01 // Yeni başlayan uçuş
        };
        
        onAddFlight(flightData);

        // Formu sıfırla
        setFormData(prev => ({
            ...prev,
            flightId: '',
            origin: '',
            destination: '',
        }));
        onClose(); // İşlem bitince paneli kapatabiliriz.
    };
    
    return (
        // Component'in görünürlüğü için dış kapsayıcı (PlanningPanel.css'te stil tanımlamaları olmalı)
        <div className={`planning-panel-container ${show ? 'open' : ''}`}> 
            <form className="planning-panel glass-panel" onSubmit={handleSubmit}>
                <div className="panel-top-bar">
                    <h2 className="form-title">YENİ UÇUŞ EKLE</h2>
                    <button type="button" className="close-x-btn" onClick={onClose}>✕</button>
                </div>
                
                <p className="form-desc">Rota, şehir ve zaman bilgilerini girerek yeni bir uçuş tanımlayınız.</p>

                <div className="form-content">
                    {/* UÇUŞ KODU */}
                    <div className="form-group">
                        <label>UÇUŞ KODU (ID)</label>
                        <input type="text" name="flightId" placeholder="Örn: TK-2024" value={formData.flightId} onChange={handleChange} required />
                    </div>
                    
                    {/* KALKIŞ / VARIŞ ŞEHRİ */}
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
                    
                    {/* KALKIŞ TARİHİ */}
                    <div className="form-group">
                        <label>KALKIŞ TARİHİ</label>
                        <input type="date" name="departureDate" value={formData.departureDate} onChange={handleChange} required />
                    </div>

                    {/* KALKIŞ SAATİ / VARIŞ SAATİ */}
                    <div className="two-col">
                        <div className="form-group">
                            <label>KALKIŞ SAATİ</label>
                            <input type="time" name="departureTime" value={formData.departureTime} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>VARIŞ SAATİ</label>
                            <input type="time" name="arrivalTime" value={formData.arrivalTime} onChange={handleChange} required />
                        </div>
                    </div>

                    {/* VARIŞ TARİHİ (Opsiyonel olarak eklendi, aynı gün olması bekleniyorsa silinebilir) */}
                    <div className="form-group">
                        <label>VARIŞ TARİHİ</label>
                        <input type="date" name="arrivalDate" value={formData.arrivalDate} onChange={handleChange} required />
                    </div>

                    <hr className="divider" /> 

                    {/* BAŞLANGIÇ KOORDİNATLARI */}
                    <div className="form-group">
                        <label>BAŞLANGIÇ KOORDİNATLARI (Lat, Lon)</label>
                        <input type="text" name="startCoords" placeholder="Örn: 39.93, 32.85" value={formData.startCoords} onChange={handleChange} required />
                    </div>
                    
                    {/* BİTİŞ KOORDİNATLARI */}
                    <div className="form-group">
                        <label>BİTİŞ KOORDİNATLARI (Lat, Lon)</label>
                        <input type="text" name="endCoords" placeholder="Örn: 41.00, 28.97" value={formData.endCoords} onChange={handleChange} required />
                    </div>
                    
                    <button type="submit" className="action-btn">ROTAYI KAYDET VE EKLE</button>
                </div>
            </form>
        </div>
    );
};
// --- APP COMPONENT'İ ---
const App = () => {
    // --- State Tanımları ---
    const [flights, setFlights] = useState(initialFlights); 
    const [isLoading, setIsLoading] = useState(true); 
    const [apiError, setApiError] = useState(null); 
    
    // Panel Görünürlükleri
    const [showLeftWidget, setShowLeftWidget] = useState(true);
    const [showPlanningPanel, setShowPlanningPanel] = useState(false); 
    const [showDetailPanel, setShowDetailPanel] = useState(false); 
    const [showBottomPanel] = useState(true); // Alt panel her zaman açık kalsın
    
    const [selectedFlight, setSelectedFlight] = useState(null);

    // Timeline/Playback State
    const [liveProgress, setLiveProgress] = useState(50); // 0-100 arası ilerleme
    const [isLiveMode, setIsLiveMode] = useState(true); // Başlangıçta Canlı Mod AÇIK

    // Simülasyon verilerini tutan Ref
    const mapRefs = useRef({ 
        simulatedFlights: initialFlights 
    });


    // --- 1. API: Uçuşları Çekme (GET) ve Format Düzeltme ---
    useEffect(() => {
        const fetchFlights = async () => {
            setIsLoading(true);
            setApiError(null);
            try {
                // 📌 Güncel API URL'si kullanılıyor
                const response = await fetch(LIVE_API_URL);
                if (!response.ok) {
                    throw new Error(`HTTP Hatası: ${response.status} - API'ye ulaşılamadı.`);
                }
                
                const rawData = await response.json();
                
                // Gelen veriyi güvenli bir şekilde harita formatına dönüştür
                const validFlights = rawData.map((item, index) => {
                    
                    // KOD DÜZELTME BÖLÜMÜ: Sizin API'nizdeki Lat/Lng alanlarını kullanıyoruz.
                    // API'den gelen verilerde Lat/Lng alanlarının sayı olduğundan emin olun
                    const startLat = parseFloat(item.startLat);
                    const startLng = parseFloat(item.startLng);
                    const endLat = parseFloat(item.endLat);
                    const endLng = parseFloat(item.endLng);
                    const progress = parseFloat(item.progress);

                    const startCoords = [startLat, startLng];
                    const endCoords = [endLat, endLng];

                    // 2. Güvenlik Kontrolü: Koordinatlar geçerli sayı mı?
                    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
                        console.error(`❌ Hatalı Veri (ID: ${item.id || index}): Koordinatlar eksik veya sayı değil. Uçuş: ${item.flightId}`);
                        return null; 
                    }

                    return {
                        id: item.id || `temp-${index}`, 
                        flightId: item.flightId || "Bilinmeyen Uçuş",
                        // API'nizde şehir isimleri yok, bu yüzden koordinatları kullanıyoruz (İsteğe bağlı)
                        origin: item.origin || `Lat: ${startLat.toFixed(2)}, Lng: ${startLng.toFixed(2)}`, 
                        destination: item.destination || `Lat: ${endLat.toFixed(2)}, Lng: ${endLng.toFixed(2)}`, 
                        
                        // 📌 Harita için ihtiyacımız olan dizi formatına çevrildi
                        start: startCoords, 
                        end: endCoords,
                        
                        // API'den gelen diğer veriler
                        progress: progress || 0.01,
                        status: item.status || "UNKNOWN",
                        speed: item.speed || 0,
                        altitude: item.altitude || 0,
                        
                        // Konumu hesapla
                        currentPosition: calculatePosition(startCoords, endCoords, progress || 0.01)
                    };
                }).filter(Boolean); // null dönen (hatalı) kayıtları temizle

                setFlights(validFlights);
                mapRefs.current.simulatedFlights = validFlights;

            } catch (error) {
                console.error("API Bağlantı Hatası:", error);
                setApiError(`Veri çekilemedi. API adresi: ${LIVE_API_URL}`);
                setFlights([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFlights();
    }, []); 


    // --- 2. API: Yeni Uçuş Ekleme (POST) ---
    const handleAddFlight = async (newFlightData) => {
        setShowPlanningPanel(false); 
        setShowLeftWidget(false);

        try {
            // 📌 API POST isteği - Uçuş ekleme endpoint'ine gönderiyoruz
            const response = await fetch(POST_API_URL, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newFlightData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Uçuş kaydı başarısız: HTTP ${response.status} - ${errorText.substring(0, 50)}...`);
            }

            // Başarılı kayıt sonrası, sunucunun döndüğü kaydı al
            const savedFlight = await response.json(); 
            
            // Front-End Güncellemesi için API'den gelen veriyi harita formatına dönüştür
            const startCoords = [savedFlight.startLat, savedFlight.startLng];
            const endCoords = [savedFlight.endLat, savedFlight.endLng];
            
            const newFlight = {
                id: savedFlight.id, 
                ...savedFlight,
                start: startCoords,
                end: endCoords,
                // Başlangıç konumu ve ilerlemeyi simülasyon moduyla senkronize et
                progress: isLiveMode ? savedFlight.progress || 0.01 : liveProgress / 100,
                currentPosition: calculatePosition(startCoords, endCoords, isLiveMode ? savedFlight.progress || 0.01 : liveProgress / 100),
            };

            setFlights(prevFlights => [...prevFlights, newFlight]);
            mapRefs.current.simulatedFlights = [...mapRefs.current.simulatedFlights, newFlight];

            setShowLeftWidget(true); 
            setSelectedFlight(newFlight); 
            alert(`Uçuş ${newFlight.flightId} başarıyla eklendi!`);

        } catch (error) {
            console.error("Uçuş eklenirken bir hata oluştu:", error);
            alert(`Uçuş eklenemedi: ${error.message}`);
        }
    };


    // --- 3. Simülasyon ve İkonlar ---
    useEffect(() => {
        // Canlı Mod: Sürekli ilerleme simülasyonu
        const liveSimulator = setInterval(() => {
            if (isLiveMode) {
                mapRefs.current.simulatedFlights = mapRefs.current.simulatedFlights.map(f => {
                    // %100'e ulaşanları %0'dan başlat
                    const newProgress = f.progress >= 1.0 ? 0 : (f.progress + 0.005); 
                    return { 
                        ...f, 
                        progress: newProgress,
                        currentPosition: calculatePosition(f.start, f.end, newProgress)
                    };
                });
                
                setFlights([...mapRefs.current.simulatedFlights]);
                
                // Slider'ı ilk uçağın ilerlemesiyle güncelle (Gösterge)
                const firstFlightProgress = mapRefs.current.simulatedFlights[0]?.progress || 0;
                setLiveProgress(Math.floor(firstFlightProgress * 100));
            }
        }, 200); 

        return () => clearInterval(liveSimulator);
    }, [isLiveMode]);
    
    const handleSliderChange = (e) => {
        const value = parseInt(e.target.value);
        setLiveProgress(value);
        
        // Slider hareket ettiğinde Live modu kapat
        if (isLiveMode) {
            setIsLiveMode(false);
        }

        const playbackProgress = value / 100;
        const updatedFlights = mapRefs.current.simulatedFlights.map(f => {
            const newPosition = calculatePosition(f.start, f.end, playbackProgress);
            return {
                ...f,
                progress: playbackProgress, 
                currentPosition: newPosition,
            };
        });
        
        mapRefs.current.simulatedFlights = updatedFlights; 
        setFlights(updatedFlights);
    };

    const handleFlightClick = (flight) => {
        setSelectedFlight(flight);
        setShowPlanningPanel(false); 
        setShowDetailPanel(true);
        setShowLeftWidget(false); 
    };

    const togglePlanningPanel = () => {
        setShowDetailPanel(false); 
        setSelectedFlight(null); 
        setShowPlanningPanel(!showPlanningPanel); 
        setShowLeftWidget(false); 
    };

    const mapIcons = useMemo(() => {
        if (!L) return null; 
        // İkonların tanımlanması (Önceki kodunuzla aynı)
        // ... (Kısa tutmak için burayı kopyalamıyorum, önceki kodunuzdan alın)

        const planeIcon = new L.icon({
            iconUrl: PLANE_ICON_PATH,
            iconSize: [40, 40],     
            iconAnchor: [20, 20],   
            className: 'custom-plane-icon'
        });

        const selectedPlaneIcon = new L.icon({
            iconUrl: PLANE_ICON_PATH,
            iconSize: [50, 50],
            iconAnchor: [25, 25],
            className: 'custom-plane-icon selected-plane'
        });

        const dotIconStart = new L.DivIcon({
            className: 'custom-dot-icon start-dot',
            html: `<div style="background-color: #008000; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #008000;"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        const dotIconEnd = new L.DivIcon({
            className: 'custom-dot-icon end-dot',
            html: `<div style="background-color: #8B0000; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #8B0000;"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        return { plane: planeIcon, selectedPlane: selectedPlaneIcon, start: dotIconStart, end: dotIconEnd };
    }, []); 
    
    const visibleFlights = flights; 

   // Seçili Uçuşun Detaylarını gösteren panel içeriği
const DetailPanelContent = useMemo(() => {
    if (!selectedFlight) return null;

    const progressPercent = ((selectedFlight.progress || 0) * 100).toFixed(0);
    
    // Uçuş verilerini hazırlama (varsayılan değerler sağlanabilir)
    const originCity = selectedFlight.origin || 'Bilinmiyor';
    const destinationCity = selectedFlight.destination || 'Bilinmiyor';
    
    // Tarih ve Saatler
    const depDate = selectedFlight.departureDate || 'Tarih Bilinmiyor';
    const arrDate = selectedFlight.arrivalDate || 'Tarih Bilinmiyor';
    const depTime = selectedFlight.departureTime || 'Saat Bilinmiyor';
    const arrTime = selectedFlight.arrivalTime || 'Saat Bilinmiyor';

    // Koordinatlar
    const startCoords = selectedFlight.startLat && selectedFlight.startLng 
        ? `${selectedFlight.startLat.toFixed(4)}, ${selectedFlight.startLng.toFixed(4)}` 
        : 'Koordinat Bilinmiyor';
    const endCoords = selectedFlight.endLat && selectedFlight.endLng 
        ? `${selectedFlight.endLat.toFixed(4)}, ${selectedFlight.endLng.toFixed(4)}` 
        : 'Koordinat Bilinmiyor';

    // Durum ve Hız Bilgileri
    const status = isLiveMode ? "Uçuşta (Canlı)" : "Geri Oynatım";
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
            
            {/* ŞEHİR VE ROTA BİLGİLERİ */}
            <div className="route-info-detail">
                <div className="route-detail-item start-time">
                    <span className="route-label">KALKIŞ ŞEHRİ</span>
                    <span className="route-value big">{originCity}</span>
                </div>
                <div className="route-arrow-detail">➤</div>
                <div className="route-detail-item end-time">
                    <span className="route-label">VARIŞ ŞEHRİ</span>
                    <span className="route-value big">{destinationCity}</span>
                </div>
            </div>

            <hr className="divider"/>

            {/* TARİH VE ZAMAN BİLGİLERİ (YENİ EKLENDİ) */}
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
            
            <hr className="divider"/>

            {/* KOORDİNAT BİLGİLERİ (YENİ EKLENDİ) */}
            <div className="status-grid coord-grid">
                <div className="status-item full-width">
                    <span className="status-label">BAŞLANGIÇ KOORDİNATLARI</span>
                    <span className="status-value coords-value">{startCoords}</span>
                </div>
                <div className="status-item full-width">
                    <span className="status-label">BİTİŞ KOORDİNATLARI</span>
                    <span className="status-value coords-value">{endCoords}</span>
                </div>
            </div>

            <hr className="divider"/>

            {/* CANLI VERİLER */}
            <div className="status-grid">
                <div className="status-item">
                    <span className="status-label">DURUM</span>
                    <span className={`status-value ${isLiveMode ? 'live' : 'playback'}`}>{status}</span>
                </div>
                <div className="status-item">
                    <span className="status-label">HIZ</span>
                    <span className="status-value">{speed}</span>
                </div>
                <div className="status-item">
                    <span className="status-label">YÜKSEKLİK</span>
                    <span className="status-value">{altitude}</span>
                </div>
                <div className="status-item">
                    <span className="status-label">İLERLEME (%)</span>
                    <span className="status-value">{progressPercent}%</span>
                </div>
                <div className="status-item full-width">
                    <span className="status-label">MEVCUT KONUM (Lat, Lng)</span>
                    <span className="status-value coords-value">
                        {selectedFlight.currentPosition ? 
                            `${selectedFlight.currentPosition[0].toFixed(4)}, ${selectedFlight.currentPosition[1].toFixed(4)}`
                            : 'Bilinmiyor'}
                    </span>
                </div>
            </div>

            <div className="action-area">
                <button className="action-btn secondary-btn">ROTAYI HARİTADA ODAKLA</button>
                <button className="action-btn primary-btn">DETAYLI RAPOR</button>
            </div>
        </div>
    );
}, [selectedFlight, isLiveMode]);

    // --- Harita Render ---
    const MapComponent = useMemo(() => {
        if (isLoading || !mapIcons) {
             return (
                 <div className="loading-overlay">
                     <div className="spinner"></div>
                     <p>HARİTA YÜKLENİYOR ve UÇUŞ VERİSİ ÇEKİLİYOR...</p>
                     {apiError && <p style={{color: 'red', fontWeight: 'bold'}}>{apiError}</p>}
                 </div>
             );
        }
        
        return (
            <MapContainer
                center={[39.0, 35.0]}
                zoom={6}
                zoomControl={false}
                style={{ width: "100%", height: "100%", background: "#f0f0f0" }} 
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap & CARTO'
                />

                <ZoomControl position="bottomright" /> 
                
                {visibleFlights.map((flight) => (
                    <React.Fragment key={flight.id}>
                        {/* Uçuş Rotası */}
                        <Polyline
                            positions={[flight.start, flight.end]}
                            pathOptions={{ 
                                color: selectedFlight?.id === flight.id ? SELECTED_COLOR : HIGHLIGHT_COLOR, 
                                weight: selectedFlight?.id === flight.id ? 4 : 2, 
                                dashArray: '8, 8', 
                                opacity: 0.8 
                            }}
                        />
                        {/* Başlangıç ve Bitiş Noktaları */}
                        <Marker position={flight.start} icon={mapIcons.start}>
                            <Tooltip direction="right" offset={[10, 0]} opacity={1} permanent={false}>
                                <span style={{fontWeight:'bold'}}>Kalkış: {flight.start[0].toFixed(2)}, {flight.start[1].toFixed(2)}</span>
                            </Tooltip>
                        </Marker>
                        <Marker position={flight.end} icon={mapIcons.end}>
                            <Tooltip direction="left" offset={[-10, 0]} opacity={1} permanent={false}>
                                <span style={{fontWeight:'bold'}}>Varış: {flight.end[0].toFixed(2)}, {flight.end[1].toFixed(2)}</span>
                            </Tooltip>
                        </Marker>
                        {/* Uçak Konumu (PNG İkonu) */}
                        <Marker 
                            position={flight.currentPosition} 
                            icon={selectedFlight?.id === flight.id ? mapIcons.selectedPlane : mapIcons.plane}
                            eventHandlers={{ click: () => handleFlightClick(flight) }}
                        >
                            <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent={false}>
                                <span style={{fontWeight:'bold', color: selectedFlight?.id === flight.id ? SELECTED_COLOR : HIGHLIGHT_COLOR}}>{flight.flightId}</span>
                            </Tooltip>
                        </Marker>
                    </React.Fragment>
                ))}
            </MapContainer>
        );
    }, [isLoading, visibleFlights, selectedFlight, mapIcons, apiError]);

    return (
        <div className="app-wrapper">
            
            {/* CSS Linki ve Stiller */}
            <link 
                rel="stylesheet" 
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
                integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
                crossOrigin=""
            />
            
            <style>{`
                /* CSS STİLLERİ (Önceki kodunuzdaki tüm stiller buraya kopyalanmıştır) */
                @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap');
                * { box-sizing: border-box; }
                body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; font-family: 'Rajdhani', sans-serif; color: #333; }
                .app-wrapper { position: relative; width: 100vw; height: 100vh; overflow: hidden; }

                /* YÜKLEME EKRANI */
                .loading-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(240, 240, 240, 0.95); z-index: 2000; color: #007BFF; font-size: 1.5rem; letter-spacing: 2px; }
                .spinner { border: 4px solid rgba(0, 123, 255, 0.3); border-top: 4px solid #007BFF; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

                /* --- ORTAK CAM EFEKTİ (GLASSMORPHISM) --- */
                .glass-panel {
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    border: 1px solid rgba(0, 123, 255, 0.15);
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
                    border-radius: 12px;
                    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                    color: #333;
                }
                .close-x-btn { background: transparent; border: none; color: #007BFF; font-size: 1.5rem; cursor: pointer; transition: 0.2s; font-weight: bold; padding: 5px; }
                .close-x-btn:hover { color: #555; transform: scale(1.1); }
                .panel-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }

                /* --- SOL ÜST WIDGET --- */
                .left-widget { position: absolute; top: 20px; left: 20px; width: 280px; max-height: 50vh; z-index: 1000; display: flex; flex-direction: column; }
                .widget-header { padding: 12px 15px; border-bottom: 1px solid rgba(0, 123, 255, 0.2); display: flex; justify-content: space-between; align-items: center; }
                .widget-title { color: #007BFF; font-weight: 700; letter-spacing: 1px; font-size: 1.1rem; }
                .flight-list { padding: 10px; overflow-y: auto; }
                .flight-list::-webkit-scrollbar { width: 4px; }
                .flight-list::-webkit-scrollbar-thumb { background: #bbb; border-radius: 2px; }
                .flight-item { background: rgba(0, 0, 0, 0.05); margin-bottom: 8px; padding: 10px 15px; border-radius: 6px; cursor: pointer; display: flex; flex-direction: column; border-left: 4px solid transparent; transition: 0.2s; color: #333; }
                .flight-item:hover, .flight-item.active { background: rgba(0, 123, 255, 0.1); border-left-color: #007BFF; }
                .f-id { color: #000; font-weight: 700; font-size: 1.1rem; }
                .f-route { color: #555; font-size: 0.9rem; }
                .open-widget-btn { position: absolute; top: 20px; left: 20px; z-index: 999; background: rgba(255, 255, 255, 0.9); border: 2px solid #007BFF; color: #007BFF; width: 45px; height: 45px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; transition: 0.3s; }
                .open-widget-btn:hover { background: #007BFF; color: #fff; }

                /* --- ÜST BUTON (YENİ UÇUŞ EKLE) --- */
                .add-flight-trigger { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; background: #007BFF; color: #fff; border: none; padding: 12px 30px; font-size: 1.1rem; font-weight: 800; letter-spacing: 1px; border-radius: 8px; cursor: pointer; box-shadow: 0 0 15px rgba(0, 123, 255, 0.4); transition: 0.3s; }
                .add-flight-trigger:hover { background: #0056b3; box-shadow: 0 0 25px rgba(0, 123, 255, 0.6); transform: translateX(-50%) scale(1.05); }

                /* --- SAĞ PANEL (PLANLAMA FORMU) --- */
                .planning-panel { position: absolute; top: 20px; right: 20px; width: 400px; z-index: 1000; padding: 25px; transform: translateX(120%); }
                .planning-panel.open { transform: translateX(0); }
                .form-title { font-size: 2.2rem; color: #007BFF; margin: 0 0 5px 0; text-shadow: 0 0 10px rgba(0, 123, 255, 0.2); }
                .form-desc { color: #555; font-size: 0.95rem; margin-bottom: 30px; }
                .form-content { display: flex; flex-direction: column; gap: 18px; }
                .form-group label { display: block; color: #333; font-size: 1rem; margin-bottom: 5px; font-weight: 600; }
                .form-group input { width: 100%; background: rgba(0,0,0,0.05); border: 1px solid #ccc; padding: 12px; font-size: 1rem; color: #333; border-radius: 6px; font-family: inherit; transition: 0.3s; }
                .form-group input:focus { outline: none; border-color: #007BFF; box-shadow: 0 0 5px rgba(0, 123, 255, 0.4); }
                .action-btn { margin-top: 20px; padding: 15px; background: #007BFF; border: none; color: #fff; font-size: 1.2rem; font-weight: bold; cursor: pointer; border-radius: 6px; transition: 0.3s; text-transform: uppercase; }
                .action-btn:hover { background: #0056b3; box-shadow: 0 0 20px rgba(0, 123, 255, 0.5); }
                .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
                .action-area { display: flex; justify-content: space-between; gap: 15px; margin-top: 30px; }

                /* --- SAĞ PANEL (DETAYLAR) --- */
                .detail-panel { position: absolute; top: 20px; right: 20px; width: 500px; z-index: 1000; padding: 30px; transform: translateX(120%); }
                .detail-panel.open { transform: translateX(0); }
                .detail-title { font-size: 1.6rem; color: #007BFF; margin: 0; text-align: left; font-weight: 700; letter-spacing: 1px; }
                .detail-subtitle { font-size: 2.5rem; color: #333; margin: 0 0 20px 0; text-align: center; font-weight: 900; }
                
                .route-info-detail { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; padding: 20px; border: 2px solid rgba(0, 123, 255, 0.2); border-radius: 10px; background: rgba(0, 123, 255, 0.03); }
                .route-detail-item { display: flex; flex-direction: column; align-items: center; text-align: center; }
                .route-label { color: #555; font-size: 0.9rem; font-weight: 600; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 5px; width: 100%; }
                .route-value.big { color: #000; font-size: 1.8rem; font-weight: 800; margin: 5px 0; }
                .coords { font-size: 0.85rem; color: #888; }
                .route-arrow-detail { color: #007BFF; font-size: 2.5rem; display: flex; align-items: center; margin: 0 10px; }
                
                .divider { border: 0; height: 1px; background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 123, 255, 0.3), rgba(0, 0, 0, 0)); margin: 30px 0; }
                
                .status-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 25px; }
                .status-item { background: rgba(0, 0, 0, 0.05); padding: 18px; border-radius: 8px; border: 1px solid #eee; }
                .status-item.full-width { grid-column: span 2; } 
                .status-label { color: #555; font-size: 0.95rem; display: block; margin-bottom: 5px; font-weight: 600; }
                .status-value { font-size: 1.5rem; font-weight: 900; color: #000; }
                .status-value.live { color: #008000; }
                .status-value.playback { color: #FF8C00; }
                .coords-value { font-size: 1.1rem; }
                .secondary-btn { background: #fff; border: 2px solid #007BFF; color: #007BFF; margin-top: 0; }
                .secondary-btn:hover { background: #e0f7ff; color: #0056b3; }
                .primary-btn { margin-top: 0; }


                /* --- ALT PANEL (YÜZEN KONTROL ÇUBUĞU) --- */
                .bottom-control-bar { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); width: 600px; max-width: 90%; z-index: 1000; padding: 15px 30px; display: flex; align-items: center; justify-content: space-between; }
                .bottom-control-bar:not(.open) { transform: translate(-50%, 150%); }

                .control-title { color: #555; font-size: 0.9rem; font-weight: 600; margin-right: 20px; white-space: nowrap; }
                .progress-slider { flex-grow: 1; margin: 0 15px; }
                .progress-slider input[type="range"] { -webkit-appearance: none; width: 100%; height: 8px; background: #ddd; border-radius: 4px; outline: none; transition: opacity .2s; }
                .progress-slider input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #007BFF; cursor: pointer; border: 3px solid #fff; box-shadow: 0 0 5px rgba(0, 0, 0, 0.3); }
                .progress-value { font-size: 1.2rem; font-weight: 700; color: #007BFF; width: 50px; text-align: right; }
                .live-mode-toggle { background: #fff; border: 2px solid #007BFF; color: #007BFF; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-left: 20px; transition: 0.3s; }
                .live-mode-toggle.active { background: #007BFF; color: #fff; }
                .live-mode-toggle:hover { opacity: 0.8; }
                .toggle-bottom-btn { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 999; background: rgba(0, 123, 255, 0.9); border: 1px solid #fff; color: #fff; padding: 12px 30px; border-radius: 30px; font-weight: bold; cursor: pointer; backdrop-filter: blur(4px); transition: 0.3s; }
                .toggle-bottom-btn:hover { background: #0056b3; }
                
                /* Leaflet İkon Stilleri */
                .leaflet-tooltip { border: none !important; box-shadow: 0 2px 10px rgba(0,0,0,0.2); background: rgba(255, 255, 255, 0.9) !important; padding: 5px 10px !important; }
                .custom-plane-icon { filter: drop-shadow(0 0 5px rgba(0, 123, 255, 0.5)); transition: transform 0.2s; }
                .selected-plane { filter: drop-shadow(0 0 10px #007BFF); transform: scale(1.1); } 
            `}</style>

            {/* HARİTA COMPONENT'İ */}
            {MapComponent}

            {/* SAĞ PANEL - UÇUŞ DETAYLARI */}
            {showDetailPanel && DetailPanelContent}

            {/* SAĞ PANEL - PLANLAMA FORMU */}
            <PlanningPanel 
                show={showPlanningPanel} 
                onClose={() => setShowPlanningPanel(false)} 
                onAddFlight={handleAddFlight}
            />

            {/* ORTA ÜST BUTON */}
            <button className="add-flight-trigger" onClick={togglePlanningPanel}>
                + YENİ UÇUŞ PLANLA
            </button>
            
            {/* SOL ÜST WIDGET - UÇUŞ LİSTESİ */}
            {!showPlanningPanel && !showDetailPanel && (
                <div className={`left-widget glass-panel ${showLeftWidget ? 'open' : ''}`}>
                    <div className="widget-header">
                        <span className="widget-title">AKTİF UÇUŞLAR ({visibleFlights.length})</span>
                        <button className="close-x-btn" onClick={() => setShowLeftWidget(false)}>✕</button>
                    </div>
                    <div className="flight-list">
                        {visibleFlights.map(f => (
                            <div 
                                key={f.id} 
                                className={`flight-item ${selectedFlight?.id === f.id ? 'active' : ''}`} 
                                onClick={() => handleFlightClick(f)}
                            >
                                <span className="f-id">✈ {f.flightId}</span>
                                <span className="f-route">{f.origin} &rarr; {f.destination}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {!showLeftWidget && !showPlanningPanel && !showDetailPanel && (
                <button className="open-widget-btn" onClick={() => setShowLeftWidget(true)}>☰</button>
            )}

            {/* ALT PANEL - ZAMAN KONTROLÜ */}
            <div className={`bottom-control-bar glass-panel ${showBottomPanel ? 'open' : ''}`}>
                <span className="control-title">{isLiveMode ? "CANLI TAKİP" : "GERİ OYNATIM"}</span>
                <div className="progress-slider">
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={liveProgress} 
                        onChange={handleSliderChange}
                    />
                </div>
                <span className="progress-value">{liveProgress}%</span>
                <button 
                    className={`live-mode-toggle ${isLiveMode ? 'active' : ''}`}
                    onClick={() => setIsLiveMode(!isLiveMode)}
                >
                    {isLiveMode ? "▶️ CANLI" : "⏸️ DURAKLAT"}
                </button>
            </div>
        </div>
    );
};

export default App;