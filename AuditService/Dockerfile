# --- Build Stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy all source code and publish
# We publish to a folder OUTSIDE the /app path to avoid conflicts with volume mapping
COPY . .
RUN dotnet publish -c Release -o /publish

# --- Runtime Stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Copy the published application from the build stage
COPY --from=build /publish .

# Create the db directory and set permissions for SQLite
# This ensures the container can write to the volume-mapped folder
RUN mkdir -p /app/db && chmod 777 /app/db

# Configure the service to run on port 5197
ENV ASPNETCORE_URLS=http://+:5197
EXPOSE 5197

ENTRYPOINT ["dotnet", "AuditService.dll"]