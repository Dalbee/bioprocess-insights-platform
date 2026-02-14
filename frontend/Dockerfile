# Use the latest stable Node.js alpine image for a small footprint
FROM node:22-alpine

WORKDIR /app

# Install dependencies first (better for Docker caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend source code
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run Vite with the --host flag to allow external access (from your browser)
CMD ["npm", "run", "dev", "--", "--host"]