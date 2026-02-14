# Use a lightweight Python image
FROM python:3.10-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the simulation logic and API code
# This copies everything in /backend (including the new /data folder) into /app
COPY . .

# Expose the FastAPI port
EXPOSE 8000

# Run uvicorn server directly using the python executable
CMD ["python", "main.py"]