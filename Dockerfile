# Stage 1: Build the React Frontend
FROM node:22-alpine AS build-frontend
WORKDIR /app/dashboard-react
COPY dashboard-react/package*.json ./
RUN npm install
COPY dashboard-react/ ./
RUN npm run build

# Stage 2: Build the Backend and Production Image
FROM node:22-alpine
WORKDIR /app

# Install build dependencies for native modules (like bcrypt)
RUN apk add --no-cache python3 make g++

# Copy backend package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend source code
COPY . .

# Copy built frontend from Stage 1 into the backend's expected directory
# server.js looks for dashboard-react/dist
RUN mkdir -p dashboard-react/dist
COPY --from=build-frontend /app/dashboard-react/dist ./dashboard-react/dist

# Expose the API port (standard 3000 as per server.js)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
