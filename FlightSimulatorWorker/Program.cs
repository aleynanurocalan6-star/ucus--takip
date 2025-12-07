using FlightSimulatorWorker; // Worker sınıfı için
using FlightSimulatorWorker.Services; // BackendClient ve FlightSimulatorService için
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;

var builder = Host.CreateDefaultBuilder(args)
    .ConfigureServices(services =>
    {
        // 1. Simülasyon Servisi
        services.AddSingleton<FlightSimulatorService>();

        // 2. HTTP Client + BackendClient
        services.AddHttpClient<BackendClient>(c =>
        {
            c.BaseAddress = new Uri("http://localhost:5058/");
        });

        // 3. Hosted Service (Worker)
        services.AddHostedService<Worker>();
    })
    .Build();

await builder.RunAsync();
