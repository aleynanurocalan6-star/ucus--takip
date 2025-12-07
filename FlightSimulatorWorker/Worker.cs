using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Backend.DTO; // FlightDto, FlightPositionDto
using FlightSimulatorWorker.Services; // FlightSimulatorService, BackendClient
using Backend; // Flight modeli
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System;

namespace FlightSimulatorWorker
{
    public class Worker : BackgroundService
    {
        private readonly ILogger<Worker> _logger;
        private readonly BackendClient _client;
        private readonly FlightSimulatorService _simulatorService;

        private List<Flight> _simulatedFlights = new List<Flight>();

        public Worker(ILogger<Worker> logger, BackendClient client, FlightSimulatorService simulatorService)
        {
            _logger = logger;
            _client = client;
            _simulatorService = simulatorService;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Flight Worker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Backend'den DTO olarak uçuşları al
                    var flightDtos = await _client.GetAllFlightsAsync();

                    // DTO'ları Flight modeline çevir ve simülasyon listesini güncelle
                    _simulatedFlights = _simulatorService.UpdateFlightsFromDtos(_simulatedFlights, flightDtos);

                    long timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

                    // Simülasyonu çalıştır
                    _simulatedFlights = _simulatorService.SimulateMovement(_simulatedFlights, timestamp);

                    // Güncellenen pozisyonları DTO'ya dönüştür ve Backend'e gönder
                    var positions = _simulatedFlights
                        .Where(f => f.Status == "ACTIVE")
                        .Select(f => new FlightPositionDto
                        {
                            FlightId = f.Id, // FlightId yoksa modeldeki Id kullan
                            Latitude = f.CurrentLat,
                            Longitude = f.CurrentLng,
                            Altitude = f.Altitude,
                            Speed = f.Speed,
                            Timestamp = timestamp
                        })
                        .ToList();

                    if (positions.Any())
                        await _client.SendPositionsAsync(positions);

                    // Log
                    foreach (var f in _simulatedFlights)
                    {
                        _logger.LogInformation(
                            $"Flight {f.Id} → Status: {f.Status}, Progress: {f.Progress:P0}, Lat: {f.CurrentLat:F4}, Lng: {f.CurrentLng:F4}");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Worker execution error.");
                }

                await Task.Delay(1000, stoppingToken); // 1 saniye bekle
            }

            _logger.LogInformation("Flight Worker stopped.");
        }
    }
}
