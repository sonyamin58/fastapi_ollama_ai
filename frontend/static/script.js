// Dapatkan referensi elemen-elemen DOM
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const imageInput = document.getElementById('image-input'); // Input file yang tersembunyi
const uploadButton = document.getElementById('upload-button'); // Tombol ikon untuk memicu input file

// Inisialisasi markdown-it untuk menguraikan Markdown menjadi HTML
// highlight.js diintegrasikan untuk syntax highlighting pada blok kode
const md = new markdownit({
    html: false, // Jangan izinkan HTML mentah di Markdown (keamanan)
    linkify: true, // Otomatis ubah URL menjadi tautan
    typographer: true, // Gunakan penggantian tipografi cerdas
    highlight: function (str, lang) { // Fungsi kustom untuk syntax highlighting
        // Coba highlight sesuai bahasa yang ditentukan (misal: ```python)
        if (lang && hljs.getLanguage(lang)) {
            try {
                return '<pre class="hljs"><code>' +
                       hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                       '</code></pre>';
            } catch (__) {}
        }
        // Jika bahasa tidak ditentukan atau tidak dikenali, coba deteksi otomatis
        return '<pre class="hljs"><code>' + hljs.highlightAuto(str).value + '</code></pre>';
    }
});

/**
 * Menambahkan pesan ke dalam area chat.
 * @param {string} sender - 'user' atau 'ai'
 * @param {string} text - Konten teks pesan
 * @param {string} [imageUrl=null] - URL gambar opsional untuk pesan pengguna
 */
function appendMessage(sender, text, imageUrl = null) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');

    if (sender === 'ai') {
        // Render Markdown dari respons AI ke HTML
        messageElement.innerHTML = md.render(text);

        // Tambahkan tombol salin untuk setiap blok kode
        messageElement.querySelectorAll('pre code').forEach((block) => {
            const container = document.createElement('div');
            container.classList.add('code-block-container');

            const copyButton = document.createElement('button');
            copyButton.classList.add('copy-button');
            copyButton.textContent = 'Salin';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(block.textContent);
                copyButton.textContent = 'Disalin!';
                // Kembalikan teks tombol setelah 2 detik
                setTimeout(() => { copyButton.textContent = 'Salin'; }, 2000);
            };

            // Pindahkan <pre> (parent dari code) ke dalam container baru
            // dan tambahkan tombol salin
            block.parentNode.parentNode.insertBefore(container, block.parentNode);
            container.appendChild(block.parentNode);
            container.appendChild(copyButton);
        });

    } else { // Pesan dari pengguna
        messageElement.textContent = text;
        if (imageUrl) {
            const imgPreview = document.createElement('img');
            imgPreview.src = imageUrl;
            imgPreview.classList.add('uploaded-image-preview');
            messageElement.appendChild(imgPreview);
        }
    }
    
    chatMessages.appendChild(messageElement);
    // Gulir ke bawah secara otomatis ke pesan terbaru
    chatMessages.scrollTop = chatMessages.scrollHeight; 
}

/**
 * Mengirim pesan dan/atau gambar ke API backend.
 */
async function sendMessage() {
    const text = userInput.value.trim();
    const imageFile = imageInput.files[0]; // Dapatkan file gambar yang dipilih

    // Validasi input: setidaknya harus ada teks atau gambar
    if (text === '' && !imageFile) {
        alert('Silakan masukkan teks atau pilih gambar untuk dikirim.');
        return;
    }

    // Tampilkan pesan pengguna di UI sebelum mengirim
    let userMessageContent = text;
    let imageUrlForPreview = null;
    if (imageFile) {
        // Buat URL objek sementara untuk menampilkan preview gambar
        imageUrlForPreview = URL.createObjectURL(imageFile);
        userMessageContent += ` (Gambar: ${imageFile.name})`;
    }
    appendMessage('user', userMessageContent, imageUrlForPreview);

    // Bersihkan input setelah pesan dikirim
    userInput.value = '';
    imageInput.value = ''; // Reset input file
    adjustTextareaHeight(); // Sesuaikan tinggi textarea

    // Tampilkan indikator loading AI
    const loadingMessage = document.createElement('div');
    loadingMessage.classList.add('message', 'ai-message');
    loadingMessage.innerHTML = '<span>Mengetik...</span>';
    chatMessages.appendChild(loadingMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const formData = new FormData();
        formData.append('text_input', text); // Tambahkan teks ke FormData

        if (imageFile) {
            formData.append('image_file', imageFile, imageFile.name); // Tambahkan file gambar
        }

        // Kirim permintaan POST ke API backend
        // Ganti 'http://localhost:8001/chat' jika Nginx mem-proxy-nya ke '/chat'
        // Jika Nginx mem-proxy, cukup gunakan '/chat'
        const response = await fetch('http://localhost:8001/chat', { 
            method: 'POST',
            body: formData // Fetch API akan otomatis mengatur Content-Type untuk FormData
        });

        const data = await response.json(); // Dapatkan respons JSON
        if (response.ok) {
            appendMessage('ai', data.response); // Tampilkan respons dari AI
        } else {
            // Tampilkan pesan error dari API
            appendMessage('ai', `Error: ${data.detail || 'Terjadi kesalahan dari API.'}`);
        }
    } catch (error) {
        // Tangani kesalahan jaringan
        appendMessage('ai', `Terjadi kesalahan jaringan: ${error.message}.`);
    } finally {
        // Selalu hapus indikator loading setelah selesai (berhasil atau gagal)
        if (loadingMessage.parentNode) {
            loadingMessage.parentNode.removeChild(loadingMessage);
        }
        chatMessages.scrollTop = chatMessages.scrollHeight; // Gulir lagi ke bawah
    }
}

/**
 * Menyesuaikan tinggi textarea input secara otomatis berdasarkan konten.
 */
function adjustTextareaHeight() {
    userInput.style.height = 'auto'; // Reset tinggi ke 'auto'
    userInput.style.height = userInput.scrollHeight + 'px'; // Atur tinggi sesuai konten
}

// --- Event Listeners ---

// Kirim pesan saat tombol "Kirim" diklik
sendButton.addEventListener('click', sendMessage);

// Kirim pesan saat tombol "Enter" ditekan (tanpa Shift+Enter)
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Mencegah baris baru
        sendMessage();
    }
});

// Sesuaikan tinggi textarea saat ada input
userInput.addEventListener('input', adjustTextareaHeight);

// Memicu klik pada input file tersembunyi saat tombol "Upload" diklik
uploadButton.addEventListener('click', () => {
    imageInput.click();
});

// Opsional: Lakukan sesuatu saat file gambar dipilih
imageInput.addEventListener('change', () => {
    if (imageInput.files.length > 0) {
        console.log('File gambar dipilih:', imageInput.files[0].name);
        // Anda bisa menambahkan indikasi visual di sini, misal:
        // mengubah teks tombol Kirim atau menambahkan ikon "gambar terpilih"
    }
});

// Inisialisasi awal untuk tinggi textarea
adjustTextareaHeight();