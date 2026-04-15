FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p src/uploads
EXPOSE 5000
CMD ["npm", "start"]
