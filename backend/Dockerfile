FROM python:3.11-slim

WORKDIR /backend

COPY ./requirements.txt /backend/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /backend/requirements.txt

COPY ./ /backend

# TODO: upgrade this to a production command
# https://www.uvicorn.org/deployment/#gunicorn

CMD [ "/bin/bash", "-c", "gunicorn -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8080 --workers 5 --max-requests 1 --worker-tmp-dir /dev/shm --timeout 255 main:app"]