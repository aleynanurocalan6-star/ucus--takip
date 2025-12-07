namespace Backend.DTO
{
    public class Flight
    {
        public int Id { get; set; }
        public string FlightCode { get; set; } = string.Empty;

        public double StartLat { get; set; }
        public double StartLng { get; set; }

        public double EndLat { get; set; }
        public double EndLng { get; set; }

        // 🚀 Uçuşun anlık dinamik alanları
        public double CurrentLat { get; set; }
        public double CurrentLng { get; set; }

        public double Progress { get; set; }

        public double Speed { get; set; }
        public double Altitude { get; set; }

        public string Status { get; set; } = string.Empty;

        // Uçuş başlangıç zamanı (unix ms)
        public long StartTimestamp { get; set; }
    }
}
