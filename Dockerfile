FROM python:3 as builder
COPY mycode.py /
RUN pip install flask \
    && pip install pyInstaller \
    && pip uninstall typing \
    && pyInstaller mycode.py 

FROM alpine as prod
COPY --from=builder mycode /
ENTRYPOINT [ "python3","mycode" ]