using Backend;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FlightsController : ControllerBase
    {
        private readonly FlightDbContext _context;
        private readonly FlightSimulatorService _sim;

        public FlightsController(FlightDbContext context, FlightSimulatorService sim)
        {
            _context = context;
            _sim = sim;
        }

        // 1) PLANNED: Henüz tamamlanmamış (PENDING veya ACTIVE) uçuşları getirir.
        // GET: api/Flights/planned
        [HttpGet("planned")]
        public async Task<ActionResult<IEnumerable<Flight>>> GetPlannedFlights()
        {
            return Ok(await _context.Flights
                .Where(f => f.Status != "COMPLETED")
                .ToListAsync());
        }

        // 2) POSITION UPDATE: Çoklu uçuşun konumunu günceller ve konum geçmişine kaydeder.
        // POST: api/Flights/updateposition
        [HttpPost("updateposition")]
        public async Task<IActionResult> UpdateFlightPosition([FromBody] List<FlightPosition> positions)
        {
            if (positions == null || positions.Count == 0)
                return BadRequest("Konum verisi yok");

            _context.Positions.AddRange(positions);

            foreach (var p in positions)
            {
                var flight = await _context.Flights.FindAsync(p.FlightId);
                if (flight == null) continue;

                // Uçuşun anlık konum bilgilerini güncelle
                flight.CurrentLat = p.Latitude;
                flight.CurrentLng = p.Longitude;
                flight.Altitude = p.Altitude;
                flight.Speed = p.Speed;
                flight.Progress = p.Progress;

                // Durum güncellemeleri
                if (p.Progress >= 1) flight.Status = "COMPLETED";
                else if (flight.Status == "PENDING" && p.Progress > 0) flight.Status = "ACTIVE";
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        // 3) CREATE FLIGHT: Yeni bir uçuş kaydı oluşturur.
        // POST: api/Flights/create
        [HttpPost("create")]
        public async Task<ActionResult<Flight>> PostFlight(Flight flight)
        {
            if (string.IsNullOrEmpty(flight.Status))
                flight.Status = "PENDING";

            // Başlangıç konumu ayarlanmadıysa kalkış noktasına eşitlenir
            if (flight.CurrentLat == 0 && flight.CurrentLng == 0)
            {
                flight.CurrentLat = flight.StartLat;
                flight.CurrentLng = flight.StartLng;
            }

            long ts = 0;
            if (DateTimeOffset.TryParse(flight.DepartureTime, out var dto))
                ts = dto.ToUnixTimeMilliseconds();

            // Kalkış zamanını Unix timestamp olarak ayarlar
            flight.StartTimestamp = (ts == 0)
                ? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                : ts;

            flight.Progress = 0;

            _context.Flights.Add(flight);
            await _context.SaveChangesAsync();

            return Ok(flight);
        }

        // 4) CURRENT: Simülatörden veya veritabanından anlık uçuş verilerini getirir.
        // GET: api/Flights/current?timestamp={millis}
        [HttpGet("current")]
        public async Task<ActionResult<IEnumerable<Flight>>> GetCurrentFlightData([FromQuery] long timestamp = 0)
        {
            bool live = (timestamp == 0);

            if (live)
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            var flights = await _context.Flights.ToListAsync();

            // Simüle edilmiş hareket – FlightSimulatorService kullanılıyor
            var simulated = _sim.SimulateMovement(flights, timestamp);

            return Ok(simulated);
        }

        // 5) DELETE: Belirtilen uçuşu siler.
        // DELETE: api/Flights/{flightId}
        [HttpDelete("{flightId}")]
        public async Task<IActionResult> DeleteFlight(string flightId)
        {
            var f = await _context.Flights.FindAsync(flightId);
            if (f == null) return NotFound();

            _context.Flights.Remove(f);
            await _context.SaveChangesAsync();

            return NoContent(); // Başarıyla silindi (içerik yok)
        }

        // 6) LIVE POSITIONS: Her bir uçuşun veritabanına kaydedilmiş en son konumunu getirir.
        // GET: api/Flights/livepositions
        [HttpGet("livepositions")]
        public async Task<ActionResult<IEnumerable<FlightPosition>>> GetLivePositions()
        {
            var latest = await _context.Positions
                .GroupBy(p => p.FlightId)
                .Select(g => g.OrderByDescending(p => p.Timestamp).First()) // Her uçuş için en son kaydı seç
                .ToListAsync();

            return Ok(latest);
        }
    }
}