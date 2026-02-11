using Microsoft.EntityFrameworkCore;

namespace AuditService
{
    // This class manages the connection to your SQLite database
    public class AuditContext : DbContext
    {
        public AuditContext(DbContextOptions<AuditContext> options) : base(options) { }

        // This represents the table in your database. 
        // It must match the class name we are using (AuditEntry).
        public DbSet<AuditEntry> AuditLogs { get; set; }
    }

    // This model matches the 'AuditEntry' class at the bottom of the Program.cs
    // We can define it here or in Program.cs, but it's cleaner to keep it in one place.
    // Since it's already in the Program.cs, we just need the Context to recognize it.
}