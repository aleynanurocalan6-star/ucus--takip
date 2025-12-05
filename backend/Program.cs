using Backend; // Flight modeline ve FlightDbContext'e erişim için
// Flight modelinin bulunduğu namespace'i ekliyoruz (Gerekiyorsa)
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging; 
using System;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// 1. DB Context Kaydı (SQLite için)
builder.Services.AddDbContext<FlightDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// KRİTİK: FlightSimulatorService kaydı (Singleton olarak)
// Bu sayede tek bir _lastUpdateTime örneği korunur ve simülasyon tutarlı olur.
builder.Services.AddSingleton<FlightSimulatorService>();

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
// Yardımcı Metot: SeedData
// =======================================================
void SeedData(FlightDbContext context)
{
    Console.WriteLine("Veritabanına başlangıç uçuş verileri ekleniyor...");
    
    var nowSeconds = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    
    context.Flights.AddRange(
        // Uçuş 1: Ankara -> İstanbul (AKTİF BAŞLAMIŞ)
        new Flight 
        { 
            FlightId = "TK-1923", 
            StartLat = 39.93, StartLng = 32.85, EndLat = 41.00, EndLng = 28.97, 
            Progress = 0.3, 
            CurrentLat = 40.23, CurrentLng = 31.68, // Mevcut konum, yolda olduğunu gösteriyor
            Speed = 850, Altitude = 35000, 
            Status = "ACTIVE", 
            StartTimestamp = nowSeconds - 3600, // 1 saat önce başladı
            Origin = "Ankara", Destination = "İstanbul"
        },
        
        // Uçuş 2: İzmir -> Antalya (AKTİF BAŞLAMIŞ)
        new Flight 
        { 
            FlightId = "TK-1881", 
            StartLat = 38.42, StartLng = 27.14, EndLat = 36.89, EndLng = 30.71, 
            Progress = 0.6, 
            CurrentLat = 37.42, CurrentLng = 28.58, 
            Speed = 900, Altitude = 38000, 
            Status = "ACTIVE", 
            StartTimestamp = nowSeconds - 7200, // 2 saat önce başladı
            Origin = "İzmir", Destination = "Antalya"
        },
        
        // Uçuş 3: İstanbul -> Ankara (BEKLEYEN) - 2 dakika sonra başlayacak
        new Flight 
        { 
            FlightId = "TK-0002", 
            StartLat = 41.00, StartLng = 28.97, EndLat = 39.93, EndLng = 32.85, 
            Progress = 0.0, 
            CurrentLat = 41.00, CurrentLng = 28.97, // Kalkış noktasında
            Speed = 0, Altitude = 0, 
            Status = "PENDING", 
            StartTimestamp = nowSeconds + 120, // 2 dakika sonra kalkacak
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
            StartTimestamp = nowSeconds - 10800,
            Origin = "İstanbul", Destination = "Ankara"
        }
    );
    context.SaveChanges();
    Console.WriteLine("Başlangıç verileri başarıyla eklendi.");
}