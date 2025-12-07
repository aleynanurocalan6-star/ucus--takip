using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services;
using  Backend.DTO;

namespace FlightBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FlightsController : ControllerBase
    {
        private readonly IFlightService _flightService;

        public FlightsController(IFlightService flightService)
        {
            _flightService = flightService;
        }

        [HttpGet("getAllFlightPlans")]
        public async Task<IActionResult> GetAllFlightPlans()
        {
            var plans = await _flightService.GetAllFlightPlansAsync();
            return Ok(plans);
        }

        [HttpGet("getCurrent")]
        public async Task<IActionResult> GetCurrentPositions()
        {
            var positions = await _flightService.GetCurrentPositionsAsync();
            return Ok(positions);
        }

        // GET: api/flights/getAtTime?timestamp=1733600000000
        [HttpGet("getAtTime")]
        public async Task<IActionResult> GetAtTime([FromQuery] long timestamp)
        {
            var positions = await _flightService.GetPositionsAtTimeAsync(timestamp);
            return Ok(positions);
        }

        [HttpPost("addFlightPlan")]
        public async Task<IActionResult> AddFlightPlan([FromBody] Flight flight)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            await _flightService.AddFlightPlanAsync(flight);
            return Ok(new { message = "Flight plan added successfully." });
        }

        [HttpPost("setFlightPositions")]
        public async Task<IActionResult> SetFlightPositions([FromBody] List<FlightPosition> positions)
        {
            if (positions == null || positions.Count == 0)
                return BadRequest("Position list cannot be empty.");

            await _flightService.SetFlightPositionsAsync(positions);
            return Ok(new { message = "Flight positions updated." });
        }
    }
}
