using Backend; // Flight modeline ve FlightDbContext'e erişim için
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging; 
using System;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// 1. DB Context Kaydı (SQLite için)
builder.Services.AddDbContext<FlightDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// ❌ KALDIRILDI: FlightSimulatorService kaydı (Artık sadece simülasyon sayfasında kullanılacaksa burada tanımlanmaz)
// builder.Services.AddSingleton<FlightSimulatorService>(); 

// 2. CORS (Çapraz Kaynak Erişim) Ayarları
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: "AllowFrontend",
        policy  =>
        {
            policy.AllowAnyOrigin() 
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

builder.Services.AddControllers();

var app = builder.Build();

// =======================================================
// Veritabanı Başlatma ve SeedData
// =======================================================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<FlightDbContext>();
        
        // 1. Migration'ları Uygula (DB dosyasını oluşturur veya günceller)
        context.Database.Migrate(); 

        // 2. Veri Başlatma Kontrolü
        if (!context.Flights.Any())
        {
            SeedData(context);
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Veritabanı başlatılırken bir hata oluştu (Migration veya SeedData).");
    }
}
// =======================================================

// CORS kullanımını etkinleştir
app.UseCors("AllowFrontend");

if (app.Environment.IsDevelopment())
{
    // ...
}

app.UseAuthorization();
app.MapControllers();
app.Run();


// =======================================================
// Yardımcı Metot: SeedData (Zaman Damgaları Milisaniyeye Çevrildi)
// =======================================================
void SeedData(FlightDbContext context)
{
    Console.WriteLine("Veritabanına başlangıç uçuş verileri ekleniyor...");
    
    // 💡 KRİTİK DÜZELTME: Milisaniye cinsinden zaman damgası al
    var nowMillis = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); 
    
    // 3600 saniye = 1 saat = 3.600.000 ms
    // 7200 saniye = 2 saat = 7.200.000 ms
    // 120 saniye = 2 dakika = 120.000 ms
    // 10800 saniye = 3 saat = 10.800.000 ms
    
    context.Flights.AddRange(
        // Uçuş 1: Ankara -> İstanbul (AKTİF BAŞLAMIŞ - 1 saat önce)
        new Flight 
        { 
            FlightId = "TK-1923", 
            StartLat = 39.93, StartLng = 32.85, EndLat = 41.00, EndLng = 28.97, 
            Progress = 0.3, 
            CurrentLat = 40.23, CurrentLng = 31.68,
            Speed = 850, Altitude = 35000, 
            Status = "ACTIVE", 
            StartTimestamp = nowMillis - (3600 * 1000), 
            Origin = "Ankara", Destination = "İstanbul"
        },
        
        // Uçuş 2: İzmir -> Antalya (AKTİF BAŞLAMIŞ - 2 saat önce)
        new Flight 
        { 
            FlightId = "TK-1881", 
            StartLat = 38.42, StartLng = 27.14, EndLat = 36.89, EndLng = 30.71, 
            Progress = 0.6, 
            CurrentLat = 37.42, CurrentLng = 28.58, 
            Speed = 900, Altitude = 38000, 
            Status = "ACTIVE", 
            StartTimestamp = nowMillis - (7200 * 1000), 
            Origin = "İzmir", Destination = "Antalya"
        },
        
        // Uçuş 3: İstanbul -> Ankara (BEKLEYEN - 2 dakika sonra)
        new Flight 
        { 
            FlightId = "TK-0002", 
            StartLat = 41.00, StartLng = 28.97, EndLat = 39.93, EndLng = 32.85, 
            Progress = 0.0, 
            CurrentLat = 41.00, CurrentLng = 28.97,
            Speed = 0, Altitude = 0, 
            Status = "PENDING", 
            StartTimestamp = nowMillis + (120 * 1000), 
            Origin = "İstanbul", Destination = "Ankara"
        },
        
        // Uçuş 4: Tamamlanmış Uçuş
        new Flight 
        { 
            FlightId = "TK-0001", 
            StartLat = 41.00, StartLng = 28.97, EndLat = 39.93, EndLng = 32.85, 
            Progress = 1.0, 
            CurrentLat = 39.93, CurrentLng = 32.85, 
            Speed = 0, Altitude = 0, 
            Status = "COMPLETED", 
            StartTimestamp = nowMillis - (10800 * 1000),
            Origin = "İstanbul", Destination = "Ankara"
        }
    );
    context.SaveChanges();
    Console.WriteLine("Başlangıç verileri başarıyla eklendi.");
}