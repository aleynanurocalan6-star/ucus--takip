using Backend.Models;
using  Backend.DTO;

namespace Backend.DTO
{
    public static class MappingExtensions
    {
        // Flight → FlightDto
        public static FlightDto ToDto(this Flight f)
        {
            return new FlightDto
            {
                FlightId = f.Id,
                Status = f.Status,
                StartLat = f.StartLat,
                StartLng = f.StartLng,
                EndLat = f.EndLat,
                EndLng = f.EndLng,
                Progress = f.Progress,
                CurrentLat = f.CurrentLat,
                CurrentLng = f.CurrentLng,
                Altitude = f.Altitude,
                Speed = f.Speed
            };
        }

        // FlightPosition → FlightPositionDto
        public static FlightPositionDto ToDto(this FlightPosition p)
        {
            return new FlightPositionDto
            {
                FlightId = p.FlightId,
                Latitude = p.Latitude,
                Longitude = p.Longitude,
                Altitude = p.Altitude,
                Speed = p.Speed,
                Timestamp = p.Timestamp
                };
                }
            }
        }

