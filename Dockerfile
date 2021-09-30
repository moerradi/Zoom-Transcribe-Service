FROM node:lts-alpine

# create the application directory
RUN mkdir /transcriber
WORKDIR /transcriber

# Install Build Dependencies for the docker image. 
RUN apk add --no-cache --virtual .gyp make g++ ffmpeg

# copy the application files
COPY . ./

# installing dependencies
RUN npm install --silent

# making shell script executable
RUN ["chmod", "+x", "start.sh"]


# run it when the container starts -- requires environment vars
CMD sh start.sh