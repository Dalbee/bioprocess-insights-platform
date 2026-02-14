using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AuditService; // Using the namespace defined in your AuditContext.cs

namespace AuditService.Controllers // <--- THIS WAS MISSING
{
    [ApiController]
    [Route("api/[controller]")] // This defines the URL as /api/audit
    public class AuditController : ControllerBase
    {
        private readonly AuditContext _context;

        public AuditController(AuditContext context)
        {
            _context = context;
        }

        // This handles the "View Audit Logs" button (GET request)
        [HttpGet]
        public async Task<IActionResult> GetLogs()
        {
            var logs = await _context.AuditLogs.OrderByDescending(x => x.Timestamp).ToListAsync();
            return Ok(logs);
        }

        // This handles saving new logs (POST request)
        [HttpPost]
        public async Task<IActionResult> CreateLog([FromBody] AuditEntry entry)
        {
            // Server-side timestamping ensures the time cannot be faked by the client
            entry.Timestamp = DateTime.UtcNow;
            
            _context.AuditLogs.Add(entry);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Audit record signed and secured." });
        }
    }
}