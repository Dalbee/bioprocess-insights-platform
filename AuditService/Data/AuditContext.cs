using Microsoft.EntityFrameworkCore;

namespace AuditService // This matches the 'using AuditService' in your other files
{
    // 1. THE BRIDGE: This class manages the connection to your SQLite database
    public class AuditContext : DbContext
    {
        public AuditContext(DbContextOptions<AuditContext> options) : base(options) { }

        // This represents the table in your database. 
        // It must match the class name we are using (AuditEntry).
        public DbSet<AuditEntry> AuditLogs { get; set; }
    }
    // 2. THE STRUCTURE: Represents a single row in the database table
    // Moving this here allows the Controller and Program.cs to see it clearly.
    // --- DATA MODEL ---
    // Data model representing a 21 CFR Part 11 compliant log entry.
    // This model matches the 'AuditEntry' class logic.
    // By placing it here in the AuditService namespace, the Context can find it.

    public class AuditEntry 
    {
        public int Id { get; set; } // Required by the database to uniquely identify each row
        public string Action { get; set; } = string.Empty;
        public string User { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public DateTime? Timestamp { get; set; }
    }
}
