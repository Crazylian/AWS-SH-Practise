FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:20.17.0-alpine3.20
WORKDIR /pureweb
ADD . /pureweb
RUN echo $(ls) && npm install
EXPOSE 3000
CMD echo $(ls) && node example.js
