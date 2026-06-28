FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Google Cloud Run injects a PORT environment variable. We default to 8080 if not set.
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
