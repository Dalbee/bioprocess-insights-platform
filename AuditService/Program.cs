using Microsoft.EntityFrameworkCore;
using AuditService; // Using the namespace defined in your AuditContext.cs

var builder = WebApplication.CreateBuilder(args);

// --- 1. SERVICE CONFIGURATION ---
// Configure the SQLite Database Connection
// Configures Entity Framework to use SQLite. 
// The "Data Source" points to the file that will store your logs permanently.

// FIX: Define the folder and path to ensure it's in the /app/db subfolder
var dbFolder = Path.Combine(AppContext.BaseDirectory, "db");
if (!Directory.Exists(dbFolder)) Directory.CreateDirectory(dbFolder);
var dbPath = Path.Combine(dbFolder, "audit.db");

builder.Services.AddDbContext<AuditContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// Add CORS to allow your React Dashboard (Vite/Vercel) to communicate with this service.
// Without this, the browser will block the "Setpoint Change" requests.
builder.Services.AddCors(options => {
    options.AddPolicy("AllowReactApp",
        policy => {
            // In Production, we specify the Vercel URL. 
            // In Development, we allow the local Vite port.
            policy.WithOrigins("http://localhost:5173", "https://your-frontend-name.vercel.app") 
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .WithExposedHeaders("Content-Disposition"); // ESSENTIAL for "Export" to allow browser to see filename
        });
});

// Tell .NET to find your Controllers (Required for MVC pattern)
// This is essential for the design logic to work.
builder.Services.AddControllers();


// --- 2. APPLICATION BUILD ---
// This "freezes" the service configuration and creates the web application instance.
var app = builder.Build();


// --- 3. DATABASE INITIALIZATION ---
// Automated Database Initialization: Creates the audit.db file if it doesn't exist.
// This ensures that as soon as the Docker container starts, it checks for 
// audit.db. If the file is missing, it creates it and the necessary tables.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AuditContext>();
    db.Database.EnsureCreated();

    // Verification Step: Count existing records
    var count = db.AuditLogs.Count();
    Console.WriteLine("-----------------------------------------------");
    Console.WriteLine($" DATABASE ACTIVE: {count} audit records found.");
    Console.WriteLine("-----------------------------------------------");    
}

// Enable the Security Policy defined in Step 2.
app.UseCors("AllowReactApp");


// --- 4. ENDPOINT MAPPING (API ROUTES) ---

// 4a. Map the routes for Controller classes
// This tells the app to look into your Controllers/AuditController.cs 
// to handle incoming requests like GET and POST /api/audit.
app.MapControllers();


// --- 5. EXECUTION ---
// Start the web server and listen for incoming requests.
app.Run();