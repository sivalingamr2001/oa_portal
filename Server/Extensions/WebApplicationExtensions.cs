namespace Backend.Extensions;

/// <summary>
/// Configures the HTTP request pipeline.
/// </summary>
public static class WebApplicationExtensions
{
    public static WebApplication ConfigurePipeline(this WebApplication app)
    {
        app.UseExceptionHandler();

        app.UseSwagger();
        app.UseSwaggerUI();

        app.UseCors("AllowFrontend");
        app.UseHttpsRedirection();

        app.UseDefaultFiles();
        app.UseStaticFiles();

        app.MapControllers();
        app.MapFallbackToFile("index.html");

        return app;
    }
}
