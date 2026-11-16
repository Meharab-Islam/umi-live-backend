FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ curl

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose backend port
EXPOSE 5050

# Start server
CMD ["npm", "start"]
