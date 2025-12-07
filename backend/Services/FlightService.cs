using Backend.Models;
using Microsoft.EntityFrameworkCore;
using  Backend.DTO;

namespace Backend.Services
{
    public class FlightService : IFlightService
    {
        private readonly FlightDbContext _db;

        public FlightService(FlightDbContext db)
        {
            _db = db;
        }

        public async Task<List<Flight>> GetAllFlightPlansAsync()
        {
            return await _db.Flights.ToListAsync();
        }

        public async Task<List<FlightPosition>> GetCurrentPositionsAsync()
        {
            return await _db.FlightPositions
                .GroupBy(p => p.FlightId)
                .Select(g => g.OrderByDescending(x => x.Timestamp).First())
                .ToListAsync();
        }

        // Belirli zamandaki konum (toleranslı)
      public async Task<List<FlightPosition>> GetPositionsAtTimeAsync(long timestamp)
{
    long tolerance = 500; // 0.5 saniye tolerans

    return await _db.FlightPositions
        .Where(p => Math.Abs(p.Timestamp - timestamp) <= tolerance)
        .ToListAsync();
}


        public async Task AddFlightPlanAsync(Flight flight)
        {
            _db.Flights.Add(flight);
            await _db.SaveChangesAsync();
        }

        public async Task SetFlightPositionsAsync(List<FlightPosition> positions)
        {
            _db.FlightPositions.AddRange(positions);
            await _db.SaveChangesAsync();
        }
    }
}
