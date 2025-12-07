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
            modelBuilder.Entity<FlightPosition>()
                .HasOne(p => p.Flight) // Position'ın bir Flight'ı vardır.
                .WithMany() // Flight'ın çok sayıda Position'ı olabilir.
                .HasForeignKey(p => p.FlightId) // Yabancı anahtar: FlightPosition.FlightId (string)
                
                // KRİTİK DÜZELTME: Yabancı anahtarın hedef aldığı ana Flight tablosundaki 
                // anahtarı varsayılan PK (Id: int) yerine string tipindeki FlightId olarak ayarlar.
                .HasPrincipalKey(f => f.FlightId); 
            
            // Geri oynatım (playback) sorgularını hızlandırmak için bileşik indeks ekleme.
            modelBuilder.Entity<FlightPosition>()
                .HasIndex(p => new { p.FlightId, p.Timestamp });
        }
    }
}