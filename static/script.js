// =================================================================
// 1. FUNGSI UTAMA & PEMBANTU
// =================================================================

/**
 * Mengumpulkan semua data dari form editor menjadi objek FormData.
 */
function collectFormData() {
    const formData = new FormData();
    // Kolom isian tunggal
    formData.append('full_name', document.getElementById('full_name').value);
    formData.append('job_title', document.getElementById('job_title_editor').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('phone', document.getElementById('phone').value);
    formData.append('summary', document.getElementById('summary').value);
    formData.append('skills', document.getElementById('skillsHidden').value);

    // Kolom isian dinamis (Pengalaman & Pendidikan)
    document.querySelectorAll('#work-container .entry-block').forEach(group => {
        formData.append('work_title[]', group.querySelector('input[name="work_title[]"]').value);
        formData.append('company[]', group.querySelector('input[name="company[]"]').value);
        formData.append('work_start[]', group.querySelector('input[name="work_start[]"]').value);
        formData.append('work_end[]', group.querySelector('input[name="work_end[]"]').value);
        formData.append('work_desc[]', group.querySelector('textarea[name="work_desc[]"]').value);
    });
    document.querySelectorAll('#education-container .entry-block').forEach(group => {
        formData.append('edu_school[]', group.querySelector('input[name="edu_school[]"]').value);
        formData.append('edu_degree[]', group.querySelector('input[name="edu_degree[]"]').value);
        formData.append('edu_start[]', group.querySelector('input[name="edu_start[]"]').value);
        formData.append('edu_end[]', group.querySelector('input[name="edu_end[]"]').value);
        formData.append('edu_desc[]', group.querySelector('textarea[name="edu_desc[]"]').value);
    });
    return formData;
}

/**
 * Mengisi form-form tersembunyi (untuk simpan, cetak, dll) dengan data terbaru.
 */
function updateHiddenInputs(formData, prediction) {
    const formsToUpdate = [
        document.getElementById('saveDraftForm'),
        document.getElementById('downloadPdfFormPreview')
    ].filter(Boolean);

    formsToUpdate.forEach(form => {
        form.querySelectorAll('input[type="hidden"]').forEach(input => input.remove());
        for (let [key, value] of formData.entries()) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        }
        const predInput = document.createElement('input');
        predInput.type = 'hidden';
        predInput.name = 'predicted_category';
        predInput.value = prediction;
        form.appendChild(predInput);
    });
}

/**
 * Mengupdate semua elemen visual di panel pratinjau resume.
 */
function updateResumeDisplay(formData) {
    // Info dasar
    document.querySelector('.header h1').textContent = formData.get('full_name') || 'Nama Lengkap';
    document.querySelector('.header .job-title-header').textContent = formData.get('job_title') || 'Jabatan';
    document.querySelector('.preview-panel .info').innerHTML = `${formData.get('email') || 'email@example.com'} | ${formData.get('phone') || '(123) 456-7890'}`;
    
    // Summary
    document.getElementById('preview-summary').textContent = formData.get('summary') || 'Tulis ringkasan profesional Anda di sini.';

    // Skills
    const skillsContainer = document.getElementById('preview-skills');
    skillsContainer.innerHTML = '';
    const skillsString = formData.get('skills');
    if (skillsString) {
        skillsString.split(',').forEach(skill => {
            if (skill.trim()) {
                const span = document.createElement('span');
                span.textContent = skill.trim();
                skillsContainer.appendChild(span);
            }
        });
    }
    if (skillsContainer.childElementCount === 0) {
        skillsContainer.innerHTML = '<span>Belum ada keterampilan.</span>';
    }

    // Pengalaman Kerja
    const workPreview = document.getElementById('preview-work-experience');
    workPreview.innerHTML = '';
    const workTitles = formData.getAll('work_title[]');
    let hasWorkEntries = workTitles.some((title, i) => title.trim() || formData.getAll('company[]')[i].trim() || formData.getAll('work_desc[]')[i].trim());
    if (hasWorkEntries) {
        workTitles.forEach((title, i) => {
            const item = document.createElement('div');
            item.classList.add('work-experience-item');
            item.innerHTML = `
                <strong>${title || 'Jabatan'}</strong>
                <em>${formData.getAll('company[]')[i] || 'Perusahaan'}</em>
                <span class="date-range">(${formData.getAll('work_start[]')[i] || 'Mulai'} - ${formData.getAll('work_end[]')[i] || 'Selesai'})</span>
                <p>${formData.getAll('work_desc[]')[i].replace(/\n/g, '<br>') || 'Deskripsi pekerjaan.'}</p>`;
            workPreview.appendChild(item);
        });
    } else {
        workPreview.innerHTML = '<p>Belum ada pengalaman kerja.</p>';
    }

    // Pendidikan
    const eduPreview = document.getElementById('preview-education');
    eduPreview.innerHTML = '';
    const eduDegrees = formData.getAll('edu_degree[]');
    let hasEduEntries = eduDegrees.some((degree, i) => degree.trim() || formData.getAll('edu_school[]')[i].trim() || formData.getAll('edu_desc[]')[i].trim());
    if (hasEduEntries) {
        eduDegrees.forEach((degree, i) => {
            const item = document.createElement('div');
            item.classList.add('education-item');
            item.innerHTML = `
                <strong>${degree || 'Gelar'}</strong>
                <em>${formData.getAll('edu_school[]')[i] || 'Sekolah/Universitas'}</em>
                <span class="date-range">(${formData.getAll('edu_start[]')[i] || 'Mulai'} - ${formData.getAll('edu_end[]')[i] || 'Selesai'})</span>
                <p>${formData.getAll('edu_desc[]')[i].replace(/\n/g, '<br>') || 'Deskripsi pendidikan.'}</p>`;
            eduPreview.appendChild(item);
        });
    } else {
        eduPreview.innerHTML = '<p>Belum ada riwayat pendidikan.</p>';
    }
}

// =================================================================
// 2. FUNGSI UTAMA & EVENT LISTENERS
// =================================================================

/**
 * Fungsi utama yang dipanggil setiap kali ada perubahan input.
 */
function updateAllPreviews() {
    const formData = collectFormData();
    updateResumeDisplay(formData); // Update pratinjau visual resume

    fetch('/process_nlp', {
        method: 'POST',
        body: new URLSearchParams({ summary: formData.get('summary') })
    })
    .then(response => response.json())
    .then(data => {
        // Hanya memperbarui field prediksi
        document.getElementById('predicted-category-preview').innerHTML = `<strong>Predicted Job Field:</strong> ${data.prediction}`;

        // Update semua form tersembunyi dengan data dan prediksi terbaru
        updateHiddenInputs(formData, data.prediction);
    })
    .catch(error => {
        console.error('Error fetching NLP process:', error);
    });
}

/**
 * Event listener yang dijalankan saat halaman selesai dimuat.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Panggil sekali saat halaman dimuat untuk menyinkronkan data
    updateAllPreviews();
    
    // Tambahkan listener ke seluruh panel editor yang akan memicu update
    document.querySelector('.editor-panel').addEventListener('input', updateAllPreviews);
    
    // Inisialisasi skill tags jika ada
    const initialSkills = document.getElementById("skillsHidden").value;
    if (initialSkills) {
        initialSkills.split(',').forEach(skill => {
            if (skill.trim()) addSkillBadge(skill.trim());
        });
    }
});


// =================================================================
// 3. FUNGSI UNTUK INPUT DINAMIS (TAMBAH/HAPUS & SKILLS)
// =================================================================

// --- Manajemen Pendidikan ---
function createEducationEntryHtml() {
    return `
      <button type="button" class="remove-btn" onclick="this.parentElement.remove(); updateAllPreviews();">x</button>
      <div class="form-group"><label>Gelar / Program</label><input type="text" name="edu_degree[]"></div>
      <div class="form-group"><label>Sekolah / Institusi</label><input type="text" name="edu_school[]"></div>
      <div class="form-group"><label>Tanggal Mulai</label><input type="text" name="edu_start[]"></div>
      <div class="form-group"><label>Tanggal Selesai</label><input type="text" name="edu_end[]"></div>
      <div class="form-group"><label>Deskripsi</label><textarea name="edu_desc[]" rows="4"></textarea></div>`;
}
function addEducation() {
    const container = document.getElementById('education-container');
    const newEntry = document.createElement('div');
    newEntry.classList.add('entry-block');
    newEntry.innerHTML = createEducationEntryHtml();
    container.appendChild(newEntry);
    updateAllPreviews(); // Pastikan pratinjau diupdate saat menambah entri
}

// --- Manajemen Pengalaman Kerja ---
function createWorkEntryHtml() {
    return `
      <button type="button" class="remove-btn" onclick="this.parentElement.remove(); updateAllPreviews();">x</button>
      <div class="form-group"><label>Jabatan</label><input type="text" name="work_title[]"></div>
      <div class="form-group"><label>Perusahaan</label><input type="text" name="company[]"></div>
      <div class="form-group"><label>Tanggal Mulai</label><input type="text" name="work_start[]"></div>
      <div class="form-group"><label>Tanggal Selesai</label><input type="text" name="work_end[]"></div>
      <div class="form-group"><label>Deskripsi</label><textarea name="work_desc[]" rows="4"></textarea></div>`;
}
function addWork() {
    const container = document.getElementById('work-container');
    const newEntry = document.createElement('div');
    newEntry.classList.add('entry-block');
    newEntry.innerHTML = createWorkEntryHtml();
    container.appendChild(newEntry);
    updateAllPreviews(); // Pastikan pratinjau diupdate saat menambah entri
}

// --- Manajemen Keterampilan (Skills) ---
const skillInput = document.getElementById("skillInput");
const skillsBox = document.getElementById("skills-box");
const hiddenSkills = document.getElementById("skillsHidden");

skillInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && this.value.trim() !== "") {
        e.preventDefault();
        addSkillBadge(this.value.trim());
        this.value = "";
        updateHiddenSkills();
    }
});

function addSkillBadge(skill) {
    const tag = document.createElement("div");
    tag.className = "skill-badge";
    tag.textContent = skill;
    const close = document.createElement("span");
    close.textContent = "×";
    close.onclick = () => {
        tag.remove();
        updateHiddenSkills();
    };
    tag.appendChild(close);
    skillsBox.insertBefore(tag, skillInput);
}

function updateHiddenSkills() {
    const skills = Array.from(document.querySelectorAll(".skill-badge")).map(b => b.childNodes[0].nodeValue.trim());
    hiddenSkills.value = skills.join(",");
    updateAllPreviews();
}