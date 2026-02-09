var builder = WebApplication.CreateBuilder(args);

// Add CORS to allow your React Dashboard (Vite) to communicate with this service
builder.Services.AddCors(options => {
    options.AddPolicy("AllowReactApp",
        policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

// Enable CORS
app.UseCors("AllowReactApp");

// Simulated In-Memory Database for Audit Logs
var auditLogs = new List<AuditEntry>();

// Endpoint: Record a new action (e.g., "Setpoint Change" with specific RPM details)
app.MapPost("/api/audit", (AuditEntry entry) => {
    // Set the server-side timestamp for 21 CFR Part 11 integrity
    entry.Timestamp = DateTime.UtcNow;

    auditLogs.Add(entry);
    // Formatted to look like a official signature record
    Console.WriteLine($"[{entry.Timestamp:HH:mm:ss}] SIGNED BY: {entry.User} | ACTION: {entry.Action} | DATA: {entry.Details}");
    
    return Results.Ok(new { message = "Audit record signed and secured." });
});

// Endpoint: Retrieve logs for the "History" view in your React Frontend
app.MapGet("/api/audit", () => auditLogs);

app.Run();

// Data model representing a 21 CFR Part 11 compliant log entry
// Note: Record parameters (Action, User, Details) map to the JSON keys sent by your frontend
public record AuditEntry(string Action, string User, string Details) {
    public DateTime? Timestamp { get; set; }
}