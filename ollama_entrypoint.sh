#!/bin/bash
# my-ai-portfolio-fastapi/entrypoint.sh (rename ollama_modeling.sh to this)

# Define model name (ARG passed via environment)
MODEL_NAME=${OLLAMA_MODEL_NAME:-deepseek-r1:1.5b} # Pastikan model yang sesuai

echo "Starting Ollama server in background..."
ollama serve & # Mulai ollama serve di latar belakang
OLLAMA_PID=$!  # Simpan PID (Process ID) dari ollama serve

echo "Waiting for Ollama server to become ready..."
# Loop untuk menunggu Ollama menjadi siap (maksimal 2.5 menit)
ATTEMPTS=0
MAX_ATTEMPTS=30 # 30 * 5 detik = 150 detik (2.5 menit)
until curl -s --head --fail http://localhost:11434; do
    if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
        echo "Error: Ollama server did not become ready in time. Exiting."
        kill $OLLAMA_PID # Hentikan proses ollama serve di latar belakang
        exit 1
    fi
    echo "Ollama server not ready yet, waiting 5 seconds..."
    sleep 5
    ATTEMPTS=$((ATTEMPTS+1))
done
echo "Ollama server is ready."

# Cek Koneksi Internet (seperti sebelumnya)
echo "Checking external internet connection..."
if curl -s --head --fail --max-time 10 https://www.google.com > /dev/null; then
    echo "Internet connection OK."
else
    echo "ERROR: No internet connection. Cannot reach https://www.google.com"
    echo "Please check your network settings, VPN, or firewall. Killing Ollama server."
    kill $OLLAMA_PID # Hentikan proses ollama serve jika tidak ada internet
    exit 1
fi

# Coba tarik model
echo "Attempting to pull Ollama model: $MODEL_NAME"
ollama pull "$MODEL_NAME"

if [ $? -eq 0 ]; then
    echo "Successfully pulled model: $MODEL_NAME"
else
    echo "Failed to pull model: $MODEL_NAME. Please check the model name or Ollama registry."
    echo "This might happen if the model name is incorrect or there's an issue with the Ollama registry."
    kill $OLLAMA_PID # Hentikan proses ollama serve jika pull gagal
    exit 1
fi

echo "Model setup complete. Keeping Ollama server running in foreground."
# Bawa proses ollama serve di latar belakang ke latar depan.
# Ini memastikan container terus berjalan selama ollama serve berjalan.
wait $OLLAMA_PID