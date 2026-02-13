FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# This will find the csproj whether it's in the root or a subfolder
COPY *.csproj ./
RUN dotnet restore

# This copies EVERYTHING in the current build context
COPY . .

# We publish to a folder OUTSIDE the /app path
RUN dotnet publish -c Release -o /publish

# --- Runtime Stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /publish .

ENV ASPNETCORE_URLS=http://+:5197
EXPOSE 5197

ENTRYPOINT ["dotnet", "AuditService.dll"]