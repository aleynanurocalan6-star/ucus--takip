using Backend;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

// ==============================
// 1. SERVICES (container open)
// ==============================
builder.Services.AddDbContext<FlightDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// FlightSimulatorService gerekiyorsa ekle
builder.Services.AddSingleton<FlightSimulatorService>();

builder.Services.AddControllers();

// ==============================
// 2. BUILD (container closes)
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
        logger.LogError(ex, "Migration/Seed sırasında hata");
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
// 5. SeedData()
// ==============================
void SeedData(FlightDbContext context)
{
    var nowMillis = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    Console.WriteLine("Seed data ekleniyor...");
}
