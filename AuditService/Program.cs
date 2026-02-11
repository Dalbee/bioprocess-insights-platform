using Microsoft.EntityFrameworkCore;
using AuditService; // Using the namespace defined in your AuditContext.cs

var builder = WebApplication.CreateBuilder(args);

// 1. DATABASE CONFIGURATION
// Configure the SQLite Database Connection
// Configures Entity Framework to use SQLite. 
// The "Data Source" points to the file that will store your logs permanently.
// Tells the app to use SQLite. This ensures the audit trail is saved to a file 
// (audit.db) rather than just being held in temporary memory.
builder.Services.AddDbContext<AuditContext>(options =>
    options.UseSqlite("Data Source=audit.db"));


// 2. CORS SECURITY POLICY
// // Add CORS to allow your React Dashboard (Vite) to communicate with this service
// Allows your React HMI (running on port 5173) to send data to this API.
// Without this, the browser will block the "Setpoint Change" requests.
builder.Services.AddCors(options => {
    options.AddPolicy("AllowReactApp",
        policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();


// 3. DATABASE INITIALIZATION 
// Automated Database Initialization: Creates the audit.db file if it doesn't exist
// This ensures that as soon as the Docker container starts, it checks for 
// audit.db. If the file is missing, it creates it and the necessary tables.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuditContext>();
    db.Database.EnsureCreated();
}

// Enable CORS
app.UseCors("AllowReactApp");

// Simulated In-Memory Database for Audit Logs
var auditLogs = new List<AuditEntry>();

// 4. POST ENDPOINT: Record Audit Log
// Record a new action (e.g., "Setpoint Change" with specific RPM details)
// When the user clicks 'Submit' in React, this receives the JSON data.
// It injects 'AuditContext' to talk to the database.
app.MapPost("/api/audit", async (AuditContext db, AuditEntry entry) => {
    
    // Server-side timestamping ensures the time cannot be faked by the client (for 21 CFR Part 11 integrity)
    entry.Timestamp = DateTime.UtcNow;

    // Save the record to the persistent SQLite database
    db.AuditLogs.Add(entry);     // Adds the entry to the Database tracking context
    await db.SaveChangesAsync(); // Physically writes the data to the SQLite file

    // Formatted to look like a official signature record in the logs
    Console.WriteLine($"[{entry.Timestamp:HH:mm:ss}] SIGNED BY: {entry.User} | ACTION: {entry.Action} | DATA: {entry.Details}");
    
    return Results.Ok(new { message = "Audit record signed and secured." });
});


// --- Endpoint: Retrieve logs for the "History" view ---
// Fetches the logs from the database so the React frontend can display them.
app.MapGet("/api/audit", async (AuditContext db) => {
    return await db.AuditLogs.OrderByDescending(x => x.Timestamp).ToListAsync();
});

app.Run();

// --- Data Model ---
// Data model representing a 21 CFR Part 11 compliant log entry
// Note: Record parameters (Action, User, Details) map to the JSON keys sent by your frontend
public class AuditEntry {
    public int Id { get; set; } // Required by the database to uniquely identify each row
    public string Action { get; set; } = string.Empty;
    public string User { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTime? Timestamp { get; set; }
}