using System;
using System.ComponentModel.DataAnnotations;

namespace Backend
{
    public class FlightPosition
    {
        [Key]
        public int Id { get; set; }

        // Hangi uçuşa ait olduğunu belirler (Foreign Key)
        public int FlightId { get; set; } 
        
        // Simülatörden gelen konumun UTC zaman damgası (milisecond cinsinden long)
        public long Timestamp { get; set; } 

        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double Speed { get; set; }
        public double Altitude { get; set; }
        public double Progress { get; set; }
        
        // Navigation Property: EF Core için Flight ile ilişki
        public Flight Flight { get; set; } = null!;
    }
}