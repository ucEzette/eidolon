# Use Node.js LTS (Alpine for smaller image)
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install dependencies (only production if possible, but we need tsc to build)
RUN npm install

# Bundle app source
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose port 8080 (Receptionist)
EXPOSE 8080

# Define command to run the app
CMD [ "npm", "start" ]
