using System.ComponentModel.DataAnnotations; // KRİTİK: Bu olmalı!

namespace Backend
{
    public class Flight
    {
        // Entity Framework Core için birincil anahtar (Primary Key)
        [Key]
        public int Id { get; set; } 
        
        // Uçuş Numarası (Harici ID)
        public string FlightId { get; set; } = string.Empty;

        // Başlangıç ve Bitiş Koordinatları
        public double StartLat { get; set; }
        public double StartLng { get; set; }
        public double EndLat { get; set; }
        public double EndLng { get; set; }

        // Mevcut Konum
        public double CurrentLat { get; set; }
        public double CurrentLng { get; set; }

        // Durum Verileri
        public double Progress { get; set; } // 0.0 - 1.0 arasında ilerleme
        public double Speed { get; set; }    // km/saat
        public double Altitude { get; set; } // metre
        public string Status { get; set; } = "PENDING"; // PENDING, ACTIVE, COMPLETED

        // Planlama Verileri
        public long StartTimestamp { get; set; } // Uçuşun başlaması gereken Unix zaman damgası
        public string Origin { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        
        // Ek veriler (isteğe bağlı)
        public string DepartureDate { get; set; } = string.Empty;
        public string DepartureTime { get; set; } = string.Empty;
    }
}