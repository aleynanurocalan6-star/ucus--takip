
namespace Backend.DTO

{
    public class FlightDto
    {
        public int FlightId { get; set; }          // Backend ve Worker simülasyonu için
        public string FlightCode { get; set; } = string.Empty;

        public double StartLat { get; set; }
        public double StartLng { get; set; }

        public double EndLat { get; set; }
        public double EndLng { get; set; }

        public double CurrentLat { get; set; }     // Simülasyon için
        public double CurrentLng { get; set; }     // Simülasyon için
        public double Progress { get; set; }       // 0-1 arası ilerleme
        public double Altitude { get; set; }       // feet

        public double Speed { get; set; }
        public string Status { get; set; } = string.Empty;

        public long StartTimestamp { get; set; }  
    }
}
