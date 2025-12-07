namespace Backend.Models
{
    public class FlightPosition
    {
        public int Id { get; set; }

        public int FlightId { get; set; }

        // DTO ile birebir aynı alanlar
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double Altitude { get; set; }
        public double Speed { get; set; }

        // Unix timestamp (milliseconds)
        public long Timestamp { get; set; }
    }
}
