FROM public.ecr.aws/amazonlinux/amazonlinux:2023
RUN mkdir /app
COPY root /app
CMD ./root -application root-config -configProfile root-config -environment Production -region us-east-1