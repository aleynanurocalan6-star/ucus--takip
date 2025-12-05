using Microsoft.EntityFrameworkCore;

namespace Backend
{
    // FlightDbContext, DbContext'ten türetilir ve EF Core için kullanılır
    public class FlightDbContext : DbContext
    {
        // 1. Uçuş Planı Verileri (Ana Tablo)
        public DbSet<Flight> Flights { get; set; }

        // 2. Uçuş Konum Verileri (Zaman Serisi Tablosu)
        public DbSet<FlightPosition> Positions { get; set; } 

        // Constructor, options'ı Base class'e (DbContext) aktarır
        public FlightDbContext(DbContextOptions<FlightDbContext> options)
            : base(options)
        {
        }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // --- 1. Flight Tablosu Ayarları ---
            
            // FlightID'nin (Harici Uçuş Kodu) benzersizliğini garanti altına alır.
            modelBuilder.Entity<Flight>()
                .HasIndex(f => f.FlightId)
                .IsUnique();

            // --- 2. FlightPosition Tablosu Ayarları ---
            
            // FlightPosition ve Flight arasında 1'den Çoğa ilişki kurar.
            // Her pozisyon kaydı tek bir Flight'a aittir.
            modelBuilder.Entity<FlightPosition>()
                .HasOne(p => p.Flight) // Position'ın bir Flight'ı vardır.
                .WithMany() // Flight'ın çok sayıda Position'ı olabilir.
                .HasForeignKey(p => p.FlightId); // Bağlantıyı FlightId üzerinden kur.

            // Geri oynatım (playback) sorgularını hızlandırmak için indeks ekleme.
            // Sorgular genellikle "Bu uçuşun şu zaman damgasından önceki en son konumunu bul" şeklinde olacaktır.
            modelBuilder.Entity<FlightPosition>()
                .HasIndex(p => new { p.FlightId, p.Timestamp });
        }
    }
}