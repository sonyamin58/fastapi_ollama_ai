# my-ai-portfolio-fastapi/app/main.py
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import ollama
import base64
import os

app = FastAPI(
    title="Portofolio AI Multimodal [Nama Anda]",
    description="API untuk berinteraksi dengan model LLaVA/Qwen melalui Ollama, menerima input teks dan gambar."
)

# Izinkan CORS untuk mengakses API dari frontend (berjalan di port berbeda)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Ganti dengan domain frontend Anda di produksi, misal: ["http://localhost:8000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nama model Ollama yang akan digunakan
MODEL_NAME = os.getenv("OLLAMA_MODEL_NAME", "deepseek-r1:1.5b") # Default ke llava:7b

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def read_root():
    """Endpoint root sederhana yang mungkin akan diarahkan ke frontend."""
    return """
    <html>
        <head>
            <title>FastAPI AI Portfolio</title>
        </head>
        <body>
            <h1>Aplikasi API AI Multimodal Berjalan!</h1>
            <p>Akses dokumentasi API di <a href="/docs">/docs</a> atau <a href="/redoc">/redoc</a>.</p>
            <p>Frontend akan tersedia di <a href="http://localhost:8000">http://localhost:8000</a> (jika di-deploy secara terpisah).</p>
        </body>
    </html>
    """

@app.post("/chat/")
async def chat_with_ai(
    text_input: str = Form(None),
    image_file: UploadFile = File(None)
):
    """
    Berinteraksi dengan model AI. Menerima input teks dan/atau gambar.
    """
    if not text_input and not image_file:
        raise HTTPException(status_code=400, detail="Setidaknya satu input (teks atau gambar) diperlukan.")

    messages = []
    
    if text_input:
        messages.append({'role': 'user', 'content': text_input})

    if image_file:
        try:
            image_bytes = await image_file.read()
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            # Tambahkan gambar ke pesan terakhir pengguna atau buat pesan baru
            if messages:
                messages[-1]['images'] = [base64_image]
            else:
                messages.append({
                    'role': 'user',
                    'content': text_input,
                    'images': [base64_image]
                })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal memproses gambar: {e}")
    
    try:
        # Hostname 'ollama-server' akan diresolusi oleh Docker Compose
        client = ollama.Client(host='http://ollama-server:11434')
        response = client.chat(model=MODEL_NAME, messages=messages)
        print(MODEL_NAME)
        return JSONResponse(content={"response": response['message']['content']})
        
    except ollama.ResponseError as e:
        raise HTTPException(status_code=500, detail=f"Kesalahan dari Ollama: {e.error}. Pastikan model '{MODEL_NAME}' terunduh dan Ollama berjalan.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan tak terduga: {e}")