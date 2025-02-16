FROM node
WORKDIR /app
COPY package*.json .
COPY tsconfig.json .
RUN npm install 
COPY . .
EXPOSE 8082
EXPOSE 50051
RUN apt install ffmpeg
RUN npm run build
CMD ["npm", "start"]
