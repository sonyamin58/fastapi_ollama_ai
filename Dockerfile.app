# my-ai-portfolio-fastapi/Dockerfile.app
FROM python:3.10-slim-buster

WORKDIR /app

COPY ./app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app .

EXPOSE 8001

# Variabel lingkungan untuk nama model agar main.py bisa mengaksesnya
ENV OLLAMA_MODEL_NAME=deepseek-r1:1.5b

# Perintah untuk menjalankan FastAPI dengan Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]