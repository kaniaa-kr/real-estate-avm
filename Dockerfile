FROM python:3.XX-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY api ./api
COPY models ./models

CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-7860}
