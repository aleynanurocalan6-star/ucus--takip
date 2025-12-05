using Backend;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System; 

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FlightsController : ControllerBase
    {
        private readonly FlightDbContext _context;
        private readonly FlightSimulatorService _simulatorService; 

        // Constructor: Bağımlılıkları enjekte eder
        public FlightsController(FlightDbContext context, FlightSimulatorService simulatorService)
        {
            _context = context;
            _simulatorService = simulatorService;
        }

        // --- 1. HARİCİ SİMÜLATÖR UÇ NOKTALARI (Örn: UpdatePosition) ---

        // GET: api/flights/planned
        [HttpGet("planned")]
        public async Task<ActionResult<IEnumerable<Flight>>> GetPlannedFlights()
        {
            var plannedFlights = await _context.Flights
                .Where(f => f.Status != "COMPLETED")
                .ToListAsync();

            return Ok(plannedFlights);
        }

        // POST: api/flights/updateposition
        [HttpPost("updateposition")]
        public async Task<IActionResult> UpdateFlightPosition([FromBody] List<FlightPosition> positions)
        {
            if (positions == null || positions.Count == 0)
            {
                return BadRequest("Konum bilgileri eksik.");
            }

            _context.Positions.AddRange(positions);

            foreach (var position in positions)
            {
                var flight = await _context.Flights.FindAsync(position.FlightId);

                if (flight != null)
                {
                    flight.CurrentLat = position.Latitude;
                    flight.CurrentLng = position.Longitude;
                    flight.Speed = position.Speed;
                    flight.Altitude = position.Altitude;
                    flight.Progress = position.Progress;
                    
                    if (flight.Progress >= 1.0)
                    {
                         flight.Status = "COMPLETED";
                    }
                    else if (flight.Status == "PENDING" && position.Progress > 0)
                    {
                         flight.Status = "ACTIVE";
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        // --- 2. ÖN YÜZ UÇ NOKTALARI (API) ---

        // POST: api/flights
        [HttpPost]
        public async Task<ActionResult<Flight>> PostFlight(Flight flight)
        {
            if (string.IsNullOrEmpty(flight.Status))
            {
                flight.Status = "PENDING";
            }
            
            // Başlangıç konumunu ayarla
            if (flight.CurrentLat == 0.0 && flight.CurrentLng == 0.0) 
            {
                flight.CurrentLat = flight.StartLat;
                flight.CurrentLng = flight.StartLng;
            }

            flight.Progress = 0.0;
            
            // 🔥 KRİTİK DÜZELTME: StartTimestamp'ı güvenli bir şekilde hesapla.
            long calculatedTimestamp = 0;
            
            // 1. DepartureTime stringini Unix zaman damgasına çevirir.
            if (!string.IsNullOrEmpty(flight.DepartureTime))
            {
                if (DateTimeOffset.TryParse(flight.DepartureTime, out DateTimeOffset departureTimeOffset))
                {
                    // Milisaniye cinsinden kaydet
                    calculatedTimestamp = departureTimeOffset.ToUnixTimeMilliseconds();
                }
            }
            
            // 2. StartTimestamp'ı ayarla: Eğer hesaplama başarısızsa (0 dönerse), anlık zamanı kullan.
            if (calculatedTimestamp == 0)
            {
                // Eğer zaman damgası hesaplanamadıysa, şimdiki anı kullan (Anında Kalkış)
                flight.StartTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            }
            else
            {
                flight.StartTimestamp = calculatedTimestamp;
            }

            _context.Flights.Add(flight);
            await _context.SaveChangesAsync();

            // Dönüş URI'ı
            return CreatedAtAction(nameof(GetCurrentFlightData), new { timestamp = flight.StartTimestamp }, flight);
        }
        
        // GET: api/flights/current?timestamp=...
        [HttpGet("current")]
        public async Task<ActionResult<IEnumerable<Flight>>> GetCurrentFlightData([FromQuery] long timestamp = 0)
        {
            // İstenen zaman damgası 0 ise, Canlı Mod (Live Mode) olduğunu varsayıyoruz.
            bool isLiveMode = (timestamp == 0);
            
            if (isLiveMode)
            {
                // Canlı Modda, anlık milisaniye zaman damgasını kullan
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); 
            }
            
            // 1. Veritabanından İlgili Uçuşları Çekme
            // PENDING durumundaki veya kalkış zamanı şimdiki/istenilen zamandan önce olan uçuşları getir.
            // Uçuş COMPLETED olsa bile, eğer EndTimestamp'ı sorgulanan zamandan önceyse bile
            // *SimulateMovement* metodunun çalışması için çekilmesi GEREKİR.
            var relevantFlights = await _context.Flights
                // StartTimestamp < timestamp olan T M uçuşları (tamamlanmış da olsa) ve PENDING uçuşları çek
                .Where(f => f.StartTimestamp < timestamp || f.Status == "PENDING") 
                .ToListAsync();

            // 2. Simülasyonu Çalıştırma
            // Bu adım, her uçuş için Progress ve Status'ü sorgulanan 'timestamp' anına göre günceller.
            var simulatedFlights = _simulatorService.SimulateMovement(relevantFlights, timestamp);
            
            // 3. KRİTİK FİLTRELEME MANTIĞI (Canlı/Geri Oynat):
            var filteredFlights = simulatedFlights.Where(f => 
                {
                    // Eğer uçuş hala PENDING veya ACTIVE ise her zaman göster.
                    if (f.Status != "COMPLETED")
                    {
                        return true;
                    }

                    // Uçuş COMPLETED ise:
                    // -----------------------------------------------------
                    // a) Canlı Mod: COMPLETED uçuşları gizle.
                    if (isLiveMode)
                    {
                        return false; 
                    }
                    
                    // b) Geri Oynat Modu (timestamp != 0): COMPLETED uçuşları göster.
                    // (Çünkü uçuş o geçmiş zamanda tamamlanmış olsa bile, o andaki son konumunu göstermeliyiz.)
                    return true;
                })
                .ToList();

            return Ok(filteredFlights);
        }
        
        // DELETE: api/flights/{flightId}
        [HttpDelete("{flightId}")]
        public async Task<IActionResult> DeleteFlight(string flightId)
        {
            var flight = await _context.Flights.FindAsync(flightId);
            if (flight == null)
            {
                return NotFound();
            }

            _context.Flights.Remove(flight);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}