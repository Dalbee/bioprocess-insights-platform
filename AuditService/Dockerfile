# --- STAGE 1: BUILD ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY ["AuditService.csproj", "./"]
RUN dotnet restore "./AuditService.csproj"

# Copy the entire source code
COPY . .

# Build and publish the application
RUN dotnet publish "AuditService.csproj" -c Release -o /app/publish /p:UseAppHost=false

# --- STAGE 2: RUNTIME ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy the published API from the build stage
COPY --from=build /app/publish .

# IMPORTANT: Copy the physical audit.db file from your 'db' folder 
# into the root of the app so Program.cs can find it to "Seed" the session.
COPY ["db/audit.db", "./audit.db"]

# Create the active 'db' directory and set permissions
# This allows the app to create/modify the database in the ephemeral container.
RUN mkdir -p /app/db && chmod -R 777 /app/db

# Expose the port the app runs on
EXPOSE 5197

# Set the environment variable for Render
ENV ASPNETCORE_URLS=http://0.0.0.0:5197

ENTRYPOINT ["dotnet", "AuditService.dll"]