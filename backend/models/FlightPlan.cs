namespace Backend.Models
{
    public class FlightPlan
    {
        public int Id { get; set; }
        public string FlightCode { get; set; } = string.Empty;

        public double StartLat { get; set; }
        public double StartLng { get; set; }

        public double EndLat { get; set; }
        public double EndLng { get; set; }

        public int Speed { get; set; } // km/h
    }
}
