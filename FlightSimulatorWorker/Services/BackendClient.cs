using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using Backend.DTO;

namespace FlightSimulatorWorker.Services
{
    public class BackendClient
    {
        private readonly HttpClient _http;
        private readonly ILogger<BackendClient> _logger;

        public BackendClient(HttpClient http, ILogger<BackendClient> logger)
        {
            _http = http;
            _logger = logger;
        }

        // Tüm uçuş planlarını al
        public async Task<List<FlightDto>> GetAllFlightsAsync()
        {
            try
            {
                var flights = await _http.GetFromJsonAsync<List<FlightDto>>("api/flights/getAllFlightPlans");
                return flights ?? new List<FlightDto>();
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "GetAllFlightsAsync hatası");
                return new List<FlightDto>();
            }
        }

        // Uçuş pozisyonlarını gönder
        public async Task<bool> SendPositionsAsync(List<FlightPositionDto> positions)
        {
            try
            {
                var response = await _http.PostAsJsonAsync("api/flights/setFlightPositions", positions);
                if (!response.IsSuccessStatusCode)
                    _logger.LogWarning("setFlightPositions başarısız: {code}", response.StatusCode);

                return response.IsSuccessStatusCode;
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "SendPositionsAsync hatası");
                return false;
            }
        }

        // Tek bir pozisyon gönderme
        public Task<bool> SendPositionAsync(FlightPositionDto pos)
        {
            return SendPositionsAsync(new List<FlightPositionDto> { pos });
        }
    }
}
