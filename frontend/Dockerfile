# Updated from node:18-alpine to node:22-alpine to support latest features and security updates
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
# The --host flag is required for Vite to work inside Docker
CMD ["npm", "run", "dev", "--", "--host"]