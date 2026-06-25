using Backend.DB;
using Backend.Interfaces;
using Backend.Middleware;
using Backend.Services;
using Backend.Shared;
using Serilog;

namespace Backend.Extensions;

/// <summary>
/// Registers application services, data access, and cross-cutting concerns.
/// </summary>
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAllocationService, AllocationService>();
        services.AddScoped<IBinAllocationService, BinAllocationService>();
        return services;
    }

    public static IServiceCollection AddOracleDataAccess(this IServiceCollection services)
    {
        services.AddSingleton<OracleService>();

        services.AddSingleton<IDbConnectionFactory>(sp =>
        {
            var oracleService = sp.GetRequiredService<OracleService>();
            return new OracleConnectionFactory(oracleService.GetConnectionString());
        });

        services.AddSingleton<IDynamicQueryExecutor, DynamicQueryExecutor>();
        return services;
    }

    public static IServiceCollection AddApiInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddControllers();
        services.AddEndpointsApiExplorer();

        services.AddSwaggerGen(options =>
        {
            options.CustomSchemaIds(type => type.FullName);
        });

        services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend", policy =>
            {
              policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails();

        return services;
    }

    public static WebApplicationBuilder AddSerilogLogging(this WebApplicationBuilder builder)
    {
        Serilog.Log.Logger = new Serilog.LoggerConfiguration()
            .Enrich.WithMachineName()
            .ReadFrom.Configuration(builder.Configuration)
            .CreateLogger();

        builder.Host.UseSerilog();
        return builder;
    }
}
