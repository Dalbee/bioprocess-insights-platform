# Use the SDK image to both build and run for development
FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /app

# Copy the project file and restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Copy everything else
COPY . .

# Expose the port
EXPOSE 5197

# Tell .NET to watch for changes and run the app
# This makes it look for the .csproj file instead of a pre-compiled .dll
ENTRYPOINT ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:5197"]