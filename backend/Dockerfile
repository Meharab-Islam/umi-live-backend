FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ curl

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose backend port and all 7 mini-game ports
EXPOSE 5050 5061 5062 5063 5064 5065 5066 5067

# Start server
CMD ["npm", "start"]
