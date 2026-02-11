# Use the SDK image to build the code
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# 1. Copy the csproj from the subfolder to the current container dir
COPY AuditService/*.csproj ./
# 2. Restore specifically for that project
RUN dotnet restore

# 3. Copy the rest of the AuditService source code
COPY AuditService/ .

# 4. Build and Publish
RUN dotnet publish -c Release -o out

# --- Runtime Stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/out .

# Ensure the app listens on the port Render expects
ENV ASPNETCORE_URLS=http://+:5197
EXPOSE 5197

ENTRYPOINT ["dotnet", "AuditService.dll"]