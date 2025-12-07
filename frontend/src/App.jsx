import React, { useState, useEffect, useMemo, useRef } from "react";
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, ZoomControl } from 'react-leaflet';
import './PlanningPanel.css';
import './App.css';

// --- SABİTLER ---
const BASE_API_URL = "http://localhost:5058/api/flights";
const PLANNED_API_URL = `${BASE_API_URL}/planned`;
const LIVE_POS_API_URL = `${BASE_API_URL}/livepositions`;
const POST_API_URL = `${BASE_API_URL}/create`;
const TIMETRAVEL_API_URL = `${BASE_API_URL}/timeline`;
const PLANE_ICON_PATH = "/assets/ucak.png";

// --- PLANNING PANEL ---
const PlanningPanel = ({ show, onClose, onAddFlight }) => {
    const [formData, setFormData] = useState({
        flightId:'', origin:'', destination:'',
        departureDate:'', departureTime:'', arrivalDate:'', arrivalTime:'',
        startCoords:'', endCoords:''
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        const startArr = formData.startCoords.split(',').map(c=>parseFloat(c.trim()));
        const endArr = formData.endCoords.split(',').map(c=>parseFloat(c.trim()));
        if(!formData.flightId || startArr.length!==2 || endArr.length!==2) return alert("Tüm alanları doldurun.");

        const flightData = {
            flightId: formData.flightId,
            origin: formData.origin,
            destination: formData.destination,
            departureTimestamp: `${formData.departureDate}T${formData.departureTime}:00Z`,
            arrivalTimestamp: `${formData.arrivalDate}T${formData.arrivalTime}:00Z`,
            startLat: startArr[0],
            startLng: startArr[1],
            endLat: endArr[0],
            endLng: endArr[1],
            progress: 0.01
        };

        onAddFlight(flightData);
        onClose();
        setFormData({ flightId:'', origin:'', destination:'', departureDate:'', departureTime:'', arrivalDate:'', arrivalTime:'', startCoords:'', endCoords:'' });
    };

    return show ? (
        <div className="planning-panel-container">
            <form className="planning-panel glass-panel" onSubmit={handleSubmit}>
                <div className="panel-top-bar">
                    <h2>Yeni Uçuş Ekle</h2>
                    <button type="button" onClick={onClose}>✕</button>
                </div>
                <input name="flightId" placeholder="Uçuş Kodu" value={formData.flightId} onChange={handleChange} required />
                <input name="origin" placeholder="Kalkış Şehri" value={formData.origin} onChange={handleChange} required />
                <input name="destination" placeholder="Varış Şehri" value={formData.destination} onChange={handleChange} required />
                <input type="date" name="departureDate" value={formData.departureDate} onChange={handleChange} required />
                <input type="time" name="departureTime" value={formData.departureTime} onChange={handleChange} required />
                <input type="date" name="arrivalDate" value={formData.arrivalDate} onChange={handleChange} required />
                <input type="time" name="arrivalTime" value={formData.arrivalTime} onChange={handleChange} required />
                <input name="startCoords" placeholder="Lat, Lon" value={formData.startCoords} onChange={handleChange} required />
                <input name="endCoords" placeholder="Lat, Lon" value={formData.endCoords} onChange={handleChange} required />
                <button type="submit">Kaydet</button>
            </form>
        </div>
    ) : null;
};

// --- MAIN APP ---
const App = () => {
    const [flights, setFlights] = useState([]);
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [showPlanningPanel, setShowPlanningPanel] = useState(false);
    const [showLeftPanel, setShowLeftPanel] = useState(true);

    const [mode, setMode] = useState('live'); // 'live' veya 'timetravel'
    const [timeTravelValue, setTimeTravelValue] = useState(0); // 0-100

    const mapIcons = useMemo(() => {
        const planeIcon = new L.icon({ iconUrl: PLANE_ICON_PATH, iconSize:[40,40], iconAnchor:[20,20] });
        const dotStart = new L.DivIcon({ className:'dot-start', html:'<div style="background:green;width:12px;height:12px;border-radius:50%"></div>', iconSize:[12,12], iconAnchor:[6,6] });
        const dotEnd = new L.DivIcon({ className:'dot-end', html:'<div style="background:red;width:12px;height:12px;border-radius:50%"></div>', iconSize:[12,12], iconAnchor:[6,6] });
        return { plane: planeIcon, start: dotStart, end: dotEnd };
    }, []);

    // --- Fetch initial flights ---
    useEffect(()=>{
        const fetchFlights = async ()=>{
            try {
                const [plannedRes, liveRes] = await Promise.all([fetch(PLANNED_API_URL), fetch(LIVE_POS_API_URL)]);
                const planned = plannedRes.ok ? await plannedRes.json() : [];
                const live = liveRes.ok ? await liveRes.json() : [];
                const merged = mergeFlights(planned, live);
                setFlights(merged);
            } catch(err){ console.error(err); }
        };
        fetchFlights();
    }, []);

    const mergeFlights = (planned=[], live=[]) => {
        const liveMap = new Map((live||[]).map(f=>[String(f.flightId), f]));
        return (planned||[]).map(f=>{
            const pos = liveMap.get(String(f.flightId));
            return {
                ...f,
                progress: pos?.progress ?? 0.01,
                currentPosition: pos ? [pos.currentLat, pos.currentLng] : [f.startLat, f.startLng]
            };
        });
    };

    // --- Add new flight ---
    const handleAddFlight = async (newFlight) => {
        try {
            const res = await fetch(POST_API_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(newFlight) });
            if(!res.ok) throw new Error("Uçuş kaydedilemedi");
            const saved = await res.json();
            setFlights(prev=>[...prev,{ ...saved, progress:0.01, currentPosition:[saved.startLat, saved.startLng] }]);
        } catch(err){ console.error(err); alert(err.message); }
    };

    // --- Time Travel Effect ---
    useEffect(()=>{
        if(mode !== 'timetravel') return;
        const fetchTimeTravelPositions = async ()=>{
            try {
                const res = await fetch(`${TIMETRAVEL_API_URL}?progress=${timeTravelValue}`);
                if(!res.ok) throw new Error("Veriler alınamadı");
                const data = await res.json();
                const updatedFlights = flights.map(f=>{
                    const bf = data.find(d=>d.flightId===f.flightId);
                    return bf ? { ...f, currentPosition:[bf.currentLat, bf.currentLng], progress: bf.progress, altitude: bf.altitude, speed: bf.speed } : f;
                });
                setFlights(updatedFlights);
            } catch(err){ console.error(err); }
        };
        fetchTimeTravelPositions();
    }, [timeTravelValue, mode]);

    const mapBackendStatusToTurkish = (status)=>{
        if(status==='InFlight'||status==='ACTIVE') return 'Uçuşta';
        if(status==='Scheduled'||status==='PENDING') return 'Planlandı';
        if(status==='Completed'||status==='COMPLETED') return 'Tamamlandı';
        return 'Bilinmiyor';
    };

    const getRouteDisplay = (flight,type)=>{
        const city = type==='origin'?flight.origin:flight.destination;
        const lat = type==='origin'?flight.startLat:flight.endLat;
        const lng = type==='origin'?flight.startLng:flight.endLng;
        if(city && city.trim()!=='') return city;
        if(isFinite(lat)&&isFinite(lng)) return `${lat.toFixed(4)},${lng.toFixed(4)}`;
        return 'Bilinmiyor';
    };

    return (
        <div className="app-container">
            {/* MAP */}
            <MapContainer center={[39.93,32.85]} zoom={6} className="map-container" zoomControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    subdomains='abcd' maxZoom={19} />
                <ZoomControl position="bottomright"/>
                {flights.map(f=>(
                    <React.Fragment key={f.flightId}>
                        <Marker position={[f.startLat,f.startLng]} icon={mapIcons.start}><Tooltip>{getRouteDisplay(f,'origin')}</Tooltip></Marker>
                        <Marker position={[f.endLat,f.endLng]} icon={mapIcons.end}><Tooltip>{getRouteDisplay(f,'destination')}</Tooltip></Marker>
                        <Polyline positions={[[f.startLat,f.startLng],[f.endLat,f.endLng]]} color="gold" weight={3} />
                        <Marker position={f.currentPosition} icon={mapIcons.plane} eventHandlers={{click:()=>setSelectedFlight(f)}}>
                            <Tooltip>{f.flightId} - {Math.round(f.progress*100)}%</Tooltip>
                        </Marker>
                    </React.Fragment>
                ))}
            </MapContainer>

            {/* LEFT PANEL */}
            {showLeftPanel && (
                <div className="glass-panel left-panel">
                    <h3>Uçuş Listesi</h3>
                    <button onClick={()=>setShowPlanningPanel(true)}>Yeni Rota</button>
                    <div className="flight-list">
                        {flights.map(f=>(
                            <div key={f.flightId} onClick={()=>setSelectedFlight(f)}>
                                {f.flightId}: {getRouteDisplay(f,'origin')} ➔ {getRouteDisplay(f,'destination')}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PLANNING PANEL */}
            <PlanningPanel show={showPlanningPanel} onClose={()=>setShowPlanningPanel(false)} onAddFlight={handleAddFlight}/>

            {/* DETAIL PANEL */}
            {selectedFlight && (
                <div className="glass-panel detail-panel">
                    <button onClick={()=>setSelectedFlight(null)}>✕</button>
                    <h3>{selectedFlight.flightId}</h3>
                    <p>{getRouteDisplay(selectedFlight,'origin')} ➔ {getRouteDisplay(selectedFlight,'destination')}</p>
                    <p>İlerleme: {Math.round(selectedFlight.progress*100)}%</p>
                    <p>Durum: {mapBackendStatusToTurkish(selectedFlight.status)}</p>
                </div>
            )}

            {/* TIME TRAVEL CONTROLS */}
            <div className="glass-panel time-travel-panel">
                <button onClick={()=>setMode(mode==='live'?'timetravel':'live')}>
                    {mode==='live'?'⏳ Geri Oynat':'🟢 Canlı Akış'}
                </button>
                {mode==='timetravel' && (
                    <div>
                        <input type="range" min="0" max="100" value={timeTravelValue} onChange={e=>setTimeTravelValue(Number(e.target.value))}/>
                        <span>{timeTravelValue}%</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
