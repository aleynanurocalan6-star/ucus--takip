using Backend;
using Backend.Services;
using Backend.DTO;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

// ==============================
// 1. SERVICES
// ==============================

// EF Core + SQLite
builder.Services.AddDbContext<FlightDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// FlightService – Backend için gerekli
builder.Services.AddScoped<IFlightService, FlightService>();

builder.Services.AddControllers();

// ==============================
// 2. BUILD
// ==============================
var app = builder.Build();

// ==============================
// 3. MIGRATION + SEED
// ==============================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    try
    {
        var context = services.GetRequiredService<FlightDbContext>();
        context.Database.Migrate();

        if (!context.Flights.Any())
        {
            SeedData(context);
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Migration veya Seed sırasında hata oluştu.");
    }
}

// ==============================
// 4. MIDDLEWARE
// ==============================
app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

app.Run();

// ==============================
// 5. Seed
// ==============================
void SeedData(FlightDbContext context)
{
    Console.WriteLine("Seed data ekleniyor...");
    // Örnek olarak birkaç uçuş eklenebilir:
    // context.Flights.Add(new Flight { FlightCode = "TK123", StartLat = 40.98, StartLng = 29.12, EndLat = 41.00, EndLng = 28.99, Status = "PENDING", StartTimestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
    // context.SaveChanges();
}
