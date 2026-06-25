using Backend.Extensions;
using Dapper;

namespace Backend;

public static class Program
{
    public static void Main(string[] args)
    {
        try
        {
            // Enable mapping from underscore-separated column names to PascalCase properties
            DefaultTypeMap.MatchNamesWithUnderscores = true;

            var builder = WebApplication.CreateBuilder(args);

            builder.AddSerilogLogging();
            builder.Services.AddApiInfrastructure(builder.Configuration);
            builder.Services.AddOracleDataAccess();
            builder.Services.AddApplicationServices();

            var app = builder.Build();
            app.ConfigurePipeline();
            app.Run();
        }
        catch (Exception ex)
        {
            Serilog.Log.Fatal(ex, "Host terminated unexpectedly");
        }
        finally
        {
            Serilog.Log.CloseAndFlush();
        }
    }
}
