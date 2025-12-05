using System;
using System.Collections.Generic;
using System.Linq;
// Flight modelinin bulunduğu namespace'i ekledik

namespace Backend 
{
    public class FlightSimulatorService
    {
        private const double R = 6371; // Dünya'nın yarıçapı (km)
        
        // --- 1. SİMÜLASYON ANA METODU ---

        /// <summary>
        /// Uçuş listesini ve anlık zaman damgasını alır.
        /// Her uçuşun konumunu, başlangıç zamanı ve verilen zamana (timestamp) göre günceller.
        /// </summary>
        /// <param name="relevantFlights">Veritabanından çekilen Flight nesneleri listesi.</param>
        /// <param name="timestamp">O anki simülasyon zaman damgası (milisaniye cinsinden Unix Time).</param>
        /// <returns>Güncel konumu hesaplanmış Flight nesneleri listesi.</returns>
        public List<Flight> SimulateMovement(List<Flight> relevantFlights, long timestamp)
        {
            foreach (var flight in relevantFlights)
            {
                var flightIdentifier = flight.FlightId;
                
                // 🚨 KRİTİK KONTROL: Eğer StartTimestamp hatalı bir şekilde sıfırsa (eski kayıt hatası),
                // ve uçuş durumu PENDING veya COMPLETED değilse, anlık zamanı başlangıç anı olarak kabul et.
                // Bu, zaman damgası 0 olan eski kayıtların anında COMPLETED olmasını önler.
                if (flight.StartTimestamp == 0 && flight.Status != "PENDING" && flight.Status != "COMPLETED")
                {
                    flight.StartTimestamp = timestamp; 
                }
                
                // Eğer uçuş zaten tamamlandıysa VEYA (StartTimestamp=0 ve PENDING ise) atla.
                if (flight.Status == "COMPLETED" || flight.StartTimestamp == 0)
                {
                    continue;
                }

                // Kalkış zamanından varış zamanına kadar geçen süreyi hesapla (Milisaniye)
                var totalDistanceKm = CalculateDistance(flight.StartLat, flight.StartLng, flight.EndLat, flight.EndLng);
                
                // Hız (km/saat) > 0 olduğundan emin ol
                if (flight.Speed <= 0) flight.Speed = 850; // Varsayılan Hız (km/saat)
                
                // Tahmini Toplam Uçuş Süresi (Milisaniye)
                // (Mesafe / Hız) * 3600 sn/saat * 1000 ms/sn
                long totalDurationMs = (long)((totalDistanceKm / flight.Speed) * 3600 * 1000);
                
                if (totalDurationMs <= 0)
                {
                    // Uçuş mesafesi sıfır veya çok kısaysa hemen tamamla
                    flight.Progress = 1.0;
                    flight.Status = "COMPLETED";
                    continue;
                }
                
                // Başlangıç zamanından (StartTimestamp) bu yana geçen zaman (Milisaniye)
                long elapsedMs = timestamp - flight.StartTimestamp;
                
                // İlerleme yüzdesi (0.0 ile 1.0 arasında)
                double progress = elapsedMs <= 0 
                    ? 0.0 
                    : Math.Min(1.0, (double)elapsedMs / totalDurationMs);

                // 2. Durum ve Konum Güncellemesi
                flight.Progress = Math.Round(progress, 4);

                if (flight.Progress >= 1.0)
                {
                    // Uçuş Tamamlandı
                    flight.Status = "COMPLETED";
                    flight.CurrentLat = flight.EndLat;
                    flight.CurrentLng = flight.EndLng;
                    flight.Speed = 0;
                    flight.Altitude = 0;
                }
                else if (flight.Progress > 0.0)
                {
                    // Uçuş Aktif
                    flight.Status = "ACTIVE";
                    
                    // İki nokta arasındaki doğrusal interpolasyon (Lerp)
                    flight.CurrentLat = Lerp(flight.StartLat, flight.EndLat, flight.Progress);
                    flight.CurrentLng = Lerp(flight.StartLng, flight.EndLng, flight.Progress);
                    
                    // Uçuş aktifse irtifasını ayarla
                    if (flight.Altitude <= 0) flight.Altitude = 35000;
                }
                else // progress <= 0.0
                {
                    // Uçuş Beklemede
                    flight.Status = "PENDING";
                    flight.CurrentLat = flight.StartLat;
                    flight.CurrentLng = flight.StartLng;
                    // Hızı sıfırla, uçak kalkış noktasında bekliyor
                    flight.Speed = 0; 
                }
            }

            return relevantFlights;
        }

        // --- 2. YARDIMCI FONKSİYONLAR ---

        /// <summary>Doğrusal interpolasyon: İki değer arasında bir t oranına göre ara değer bulur.</summary>
        private double Lerp(double start, double end, double t)
        {
            // Lerp formülü: start + (end - start) * t
            return start + (end - start) * t;
        }

        private double ToRadians(double degrees) => degrees * (Math.PI / 180);

        /// <summary>Haversine formülünü kullanarak iki enlem/boylam arasındaki mesafeyi (km) hesaplar.</summary>
        private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);

            lat1 = ToRadians(lat1);
            lat2 = ToRadians(lat2);

            var a = Math.Pow(Math.Sin(dLat / 2), 2) + 
                    Math.Pow(Math.Sin(dLon / 2), 2) * Math.Cos(lat1) * Math.Cos(lat2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            
            // Dünya yarıçapı R ile çarpılır (6371 km)
            return R * c; 
        }
    }
}