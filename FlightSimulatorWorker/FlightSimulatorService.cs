using System;
using System.Collections.Generic;
using System.Linq;
using Backend;          // Flight modeli
using Backend.DTO;      // FlightDto ve FlightPositionDto
namespace FlightSimulatorWorker.Services
{
    public class FlightSimulatorService
    {
        private const double R = 6371; // Dünya yarıçapı (km)
        private const double CRUISE_ALTITUDE = 10668; // feet cinsinden

        /// <summary>
        /// Backend'den gelen yeni DTO'ları mevcut simülasyon model listesiyle karşılaştırır ve günceller.
        /// </summary>
        public List<Flight> UpdateFlightsFromDtos(List<Flight> currentFlights, List<FlightDto> newDtos)
        {
            var flightDict = currentFlights.ToDictionary(f => f.Id, f => f);

            foreach (var dto in newDtos)
            {
                // DTO'da FlightId yerine Id varsa onu kullan
                int dtoId = dto.FlightId; // DTO'da FlightId alanı olduğundan emin olun
                if (flightDict.TryGetValue(dtoId, out Flight existingFlight))
                {
                    existingFlight.Status = dto.Status;
                    existingFlight.StartTimestamp = dto.StartTimestamp;

                    if (dto.Status == "COMPLETED")
                    {
                        existingFlight.Progress = 1.0;
                        existingFlight.CurrentLat = dto.EndLat;
                        existingFlight.CurrentLng = dto.EndLng;
                        existingFlight.Altitude = 0;
                        existingFlight.Speed = 0;
                    }
                }
                else
                {
                    var newFlight = new Flight
                    {
                        Id = dtoId,
                        StartLat = dto.StartLat,
                        StartLng = dto.StartLng,
                        EndLat = dto.EndLat,
                        EndLng = dto.EndLng,
                        Speed = dto.Speed > 0 ? dto.Speed : 850,
                        Status = dto.Status,
                        StartTimestamp = dto.StartTimestamp,
                        Progress = 0,
                        CurrentLat = dto.StartLat,
                        CurrentLng = dto.StartLng,
                        Altitude = 0
                    };

                    flightDict.Add(newFlight.Id, newFlight);
                }
            }

            return flightDict.Values.ToList();
        }

        /// <summary>
        /// Verilen Flight listesindeki her bir uçuşun mevcut konumunu zaman damgasına göre hesaplar.
        /// </summary>
        public List<Flight> SimulateMovement(List<Flight> flights, long timestamp)
        {
            foreach (var flight in flights)
            {
                if (flight.Status == "COMPLETED" || flight.StartTimestamp == 0)
                    continue;

                double totalDistanceKm = CalculateDistance(flight.StartLat, flight.StartLng,
                                                           flight.EndLat, flight.EndLng);

                if (flight.Speed <= 0)
                    flight.Speed = 850;

                long totalDurationMs = (long)((totalDistanceKm / flight.Speed) * 3600 * 1000);

                if (totalDurationMs <= 0)
                {
                    flight.Progress = 1;
                    flight.Status = "COMPLETED";
                    flight.CurrentLat = flight.EndLat;
                    flight.CurrentLng = flight.EndLng;
                    flight.Speed = 0;
                    flight.Altitude = 0;
                    continue;
                }

                long elapsedMs = timestamp - flight.StartTimestamp;

                double progress = elapsedMs <= 0
                    ? 0
                    : Math.Min(1.0, (double)elapsedMs / totalDurationMs);

                flight.Progress = Math.Round(progress, 4);

                if (flight.Progress >= 1.0)
                {
                    flight.Status = "COMPLETED";
                    flight.CurrentLat = flight.EndLat;
                    flight.CurrentLng = flight.EndLng;
                    flight.Speed = 0;
                    flight.Altitude = 0;
                }
                else if (flight.Progress > 0)
                {
                    flight.Status = "ACTIVE";
                    flight.CurrentLat = Lerp(flight.StartLat, flight.EndLat, flight.Progress);
                    flight.CurrentLng = Lerp(flight.StartLng, flight.EndLng, flight.Progress);
                    flight.Altitude = SimulateAltitude(flight.Progress);
                }
                else
                {
                    flight.Status = "PENDING";
                    flight.CurrentLat = flight.StartLat;
                    flight.CurrentLng = flight.StartLng;
                    flight.Altitude = 0;
                }
            }

            return flights;
        }

        // --- Yardımcı Metotlar ---

        private double SimulateAltitude(double progress)
        {
            const double CLIMB_END = 0.15;
            const double DESCENT_START = 0.85;

            if (progress < CLIMB_END)
                return Lerp(0, CRUISE_ALTITUDE, progress / CLIMB_END);

            if (progress >= DESCENT_START)
                return Lerp(CRUISE_ALTITUDE, 0, (progress - DESCENT_START) / (1 - DESCENT_START));

            return CRUISE_ALTITUDE;
        }

        private double Lerp(double start, double end, double t)
            => start + (end - start) * t;

        private double ToRadians(double degrees) => degrees * Math.PI / 180;

        private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);

            lat1 = ToRadians(lat1);
            lat2 = ToRadians(lat2);

            var a = Math.Pow(Math.Sin(dLat / 2), 2) +
                    Math.Pow(Math.Sin(dLon / 2), 2) *
                    Math.Cos(lat1) * Math.Cos(lat2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return R * c;
        }
    }
}
