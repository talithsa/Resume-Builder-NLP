from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import os, re, traceback, joblib
from io import BytesIO

try:
    import nltk
    for pkg in ['punkt', 'stopwords']:
        try:
            nltk.data.find(f'tokenizers/{pkg}' if pkg == 'punkt' else f'corpora/{pkg}')
        except LookupError:
            print(f">>> Mengunduh paket NLTK yang dibutuhkan: {pkg}...")
            nltk.download(pkg, quiet=True)
    from nltk.corpus import stopwords
    from nltk.stem import PorterStemmer
    print(">>> INFO: Semua library NLP berhasil dimuat.")
except ImportError as e:
    print(f">>> ERROR: Library NLTK atau Sastrawi belum terinstal. Harap jalankan 'pip install nltk Sastrawi'. Error: {e}")
    exit()

# Inisialisasi Flask dan Model
app = Flask(__name__)
app.secret_key = 'secret_key'

porter_stemmer = PorterStemmer()

try:
    model = joblib.load('model/job_desc_model.pkl')
    tokenizer = joblib.load('model/vectorizer.pkl')
    print(">>> INFO: Model prediksi berhasil dimuat.")
except FileNotFoundError:
    print(">>> ERROR: File model atau vectorizer tidak ditemukan. Pastikan 'model/job_desc_model.pkl' dan 'model/vectorizer.pkl' ada.")
    exit()

# === ALUR KERJA PREDIKSI MODEL ===
def preprocess_for_model(text):
    """
    Fungsi ini sekarang mencetak setiap langkah pra-pemrosesan ke terminal
    sebagai indikator bahwa proses telah berhasil.
    """
    print("\n=======================================================")
    print("--- Memulai Pra-pemrosesan Teks untuk Prediksi Model ---")
    print(f"Teks Summary Awal: '{text}'")
    print("-------------------------------------------------------")

    # Tahap 1: Parsing (Case Folding & Cleaning)
    text_lower = text.lower()
    print(f"1. Parsing (lowercase): '{text_lower}'")
    
    parsed_text = re.sub(r'[^a-z\s]', '', text_lower)
    print(f"2. Parsing (hapus simbol & angka): '{parsed_text}'")

    # Tahap 2: Tokenisasi
    words = parsed_text.split()
    print(f"\n3. Tokenisasi (dipecah menjadi list kata):\n   {words}")

    # Tahap 3: Stopword Removal
    stop_words = set(stopwords.words('english'))
    words_after_stopwords = [word for word in words if word not in stop_words]
    print(f"\n4. Stopword Removal (kata tidak penting dihapus):\n   {words_after_stopwords}")

    # Tahap 4: Stemming (Indeksing)
    stemmed_words = [porter_stemmer.stem(word) for word in words_after_stopwords]
    print(f"\n5. Stemming (kata diubah ke bentuk dasar):\n   {stemmed_words}")
    
    final_text = ' '.join(stemmed_words)
    print("\n-------------------------------------------------------")
    print(f"Teks Akhir yang Siap Diproses Model: '{final_text}'")
    print("--- Pra-pemrosesan Selesai ---")
    print("=======================================================\n")
    
    return final_text

def predict_job_category(text):
    if not text or not text.strip():
        return "Belum Diprediksi"
    try:
        preprocessed_text = preprocess_for_model(text)
        if not preprocessed_text.strip():
            return "Teks Tidak Cukup"
        transformed_text = tokenizer.transform([preprocessed_text])
        return model.predict(transformed_text)[0]
    except Exception:
        traceback.print_exc()
        return "Error Saat Prediksi"

# === ROUTE APLIKASI FLASK ===

@app.route('/')
def resume_form():
    """Menampilkan halaman utama dan melakukan prediksi awal."""
    data = session.get('resume_data', None)
    if data is None:
        data = { 'full_name': [''], 'job_title': [''], 'email': [''], 'phone': [''], 'summary': [''], 'skills': [''],
                 'work_title[]': [], 'company[]': [], 'work_start[]': [], 'work_end[]': [], 'work_desc[]': [],
                 'edu_school[]': [], 'edu_degree[]': [], 'edu_start[]': [], 'edu_end[]': [], 'edu_desc[]': [] }
        session['resume_data'] = data
    summary_text = data.get("summary", [""])[0]
    predicted_category = predict_job_category(summary_text)
    return render_template('resume_form.html', data=data, predicted_category=predicted_category)

@app.route('/process_nlp', methods=['POST'])
def process_nlp():
    """Hanya menjalankan prediksi untuk panel pratinjau live."""
    summary_text = request.form.get('summary', '')
    prediction = predict_job_category(summary_text)
    return jsonify({'prediction': prediction})

@app.route('/edit_resume', methods=['POST'])
def edit_resume():
    form_data = request.form.to_dict(flat=False)
    session['resume_data'] = form_data
    return redirect(url_for('resume_form'))

@app.route('/preview', methods=['POST'])
def preview():
    form_data = request.form.to_dict(flat=False)
    processed_data = {key: (values_list[0] if not key.endswith('[]') else values_list) for key, values_list in form_data.items()}
    skills_string = processed_data.get('skills', '')
    processed_data['skills'] = [skill.strip() for skill in skills_string.split(',') if skill.strip()]
    predicted_category = processed_data.get("predicted_category", "Belum Diprediksi")
    return render_template("resume_preview.html", data=processed_data, predicted_category=predicted_category, zip=zip)

@app.route('/clear_session_data', methods=['GET'])
def clear_session_data():
    session.clear()
    return redirect(url_for('resume_form'))

if __name__ == '__main__':
    app.run(debug=True)