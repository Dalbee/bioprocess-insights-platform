FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . .
# We publish to a folder OUTSIDE the /app path that gets mounted
RUN dotnet publish -c Release -o /publish

# --- Runtime Stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
# Copy from the /publish folder of the build stage
COPY --from=build /publish .

ENV ASPNETCORE_URLS=http://+:5197
EXPOSE 5197

# This will now find the DLL in /app because we copied it there in the image
ENTRYPOINT ["dotnet", "AuditService.dll"]