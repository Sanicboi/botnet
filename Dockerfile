FROM node
WORKDIR /app
COPY package*.json .
COPY tsconfig.json .
RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y ffmpeg
RUN npm install 
COPY . .
EXPOSE 8082
EXPOSE 50051
RUN npm run build
CMD ["npm", "start"]
