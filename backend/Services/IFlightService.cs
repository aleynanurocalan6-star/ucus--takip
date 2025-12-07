using Backend.Models;
using  Backend.DTO;
namespace Backend.Services
{
    public interface IFlightService
    {
        Task<List<Flight>> GetAllFlightPlansAsync();
        Task<List<FlightPosition>> GetCurrentPositionsAsync();
        Task<List<FlightPosition>> GetPositionsAtTimeAsync(long timestamp);


        Task AddFlightPlanAsync(Flight flight);
        Task SetFlightPositionsAsync(List<FlightPosition> positions);
    }
}
