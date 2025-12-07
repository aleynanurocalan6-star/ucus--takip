using Microsoft.EntityFrameworkCore;
using Backend.Models;
using  Backend.DTO;
namespace Backend
{
    public class FlightDbContext : DbContext
    {
        public FlightDbContext(DbContextOptions<FlightDbContext> options) : base(options)
        {
        }

        public DbSet<Flight> Flights { get; set; }
        public DbSet<FlightPosition> FlightPositions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Flight>()
                .HasKey(f => f.Id);

            modelBuilder.Entity<FlightPosition>()
                .HasKey(p => p.Id);
        }
    }
}
