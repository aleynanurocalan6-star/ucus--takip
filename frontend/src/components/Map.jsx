import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// CSS dosyanızı buraya import ettiğinizden emin olun!
// import './App.css'; 

// Yerel ikon dosyasını import et (Yolu projenizin yapısına göre kontrol edin)
import customAirplaneIconUrl from './assets/ucak (1).png'; 

// --- SABİT İKON VE RENK TANIMLAMALARI ---
const HIGHLIGHT_COLOR = "#FFD700"; // Canlı Sarı
const HIGHLIGHT_OPACITY = 0.9;

const airplaneIcon = new L.Icon({
  iconUrl: customAirplaneIconUrl, // Yerel dosya kullanıldı
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: 'aircraft-icon'
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
// ------------------------------------------

// --- Harita Bileşeni (App.jsx içine gömüldü) ---
function FlightMapSimple({ flights, onFlightClick }) {
    return (
        <MapContainer
            center={[39.0, 35.0]} 
            zoom={5}
            style={{ width: "100%", height: "100%" }} 
            tap={false} 
        >
            {/* AZ KOYU HARİTA ARKA PLANI (Stadia Maps Alidade Smooth Dark) */}
            <TileLayer
                attribution='&copy; Stadia Maps'
                url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" 
            />

            {/* Uçuş marker & rota çizimleri */}
            {flights.map((f) => (
                <React.Fragment key={f.id}>
                    
                    {/* Başlangıç Noktası */}
                    <Marker position={f.start} icon={startIcon} />
                    
                    {/* Bitiş Noktası */}
                    <Marker position={f.end} icon={endIcon} />
                    
                    {/* Uçak Konumu (Tıklanabilir Marker) */}
                    <Marker 
                        position={f.currentPosition || f.start} 
                        icon={airplaneIcon}
                        eventHandlers={{
                            click: () => onFlightClick(f),
                        }}
                    />
                    
                    {/* Rota Çizgisi */}
                    <Polyline
                        positions={[f.start, f.end]}
                        color={HIGHLIGHT_COLOR}
                        weight={3}
                        dashArray="8 10"
                        opacity={HIGHLIGHT_OPACITY}
                    />
                </React.Fragment>
            ))}
        </MapContainer>
    );
}
