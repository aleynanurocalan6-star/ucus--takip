
namespace Backend.DTO
{
    public class FlightPositionDto
    {
        public int FlightId { get; set; }

        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double Altitude { get; set; }
        public double Speed { get; set; }

        public long Timestamp { get; set; }
    }
}
