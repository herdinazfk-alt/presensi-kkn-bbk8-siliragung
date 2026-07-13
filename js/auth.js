// Logika Otentikasi untuk Presensi KKN BBK 8 Siliragung

// Kunci penyimpanan LocalStorage untuk session
const SESSION_KEY = "kkn_logged_in_user";

// Mengambil user yang sedang login saat ini
function getCurrentUser() {
    const userJson = localStorage.getItem(SESSION_KEY);
    if (!userJson) return null;
    try {
        return JSON.parse(userJson);
    } catch (e) {
        return null;
    }
}

// Memeriksa session aktif dan mengalihkan halaman jika diperlukan
function checkSessionAndRedirect(isLoginPage = false) {
    const currentUser = getCurrentUser();
    
    if (isLoginPage) {
        // Jika di halaman login dan sudah login, alihkan ke dashboard (index.html)
        if (currentUser) {
            window.location.href = "index.html";
        }
    } else {
        // Jika di halaman dashboard dan belum login, alihkan ke login.html
        if (!currentUser) {
            window.location.href = "login.html";
        }
    }
}

// Mendaftarkan akun baru (mahasiswa)
function registerAccount(nim, password) {
    // 1. Cari NIM di database anggota resmi
    const member = KKN_MEMBERS.find(m => m.id === nim);
    if (!member) {
        return { success: false, message: "NIM tidak terdaftar sebagai anggota KKN BBK 8 Siliragung!" };
    }
    
    // 2. Pastikan NIM belum didaftarkan sebelumnya
    if (state.registeredAccounts[nim]) {
        return { success: false, message: "Akun dengan NIM ini sudah terdaftar. Silakan langsung login." };
    }
    
    // 3. Simpan password (disimpan lokal di state & localStorage)
    state.registeredAccounts[nim] = password;
    saveStateToLocalStorage();
    
    return { success: true, message: `Akun untuk ${member.name} berhasil dibuat! Silakan login.` };
}

// Login mahasiswa
function loginStudent(nim, password) {
    // 1. Cari NIM di database anggota resmi
    const member = KKN_MEMBERS.find(m => m.id === nim);
    if (!member) {
        return { success: false, message: "NIM tidak terdaftar!" };
    }
    
    // 2. Pastikan akun sudah terdaftar
    const registeredPassword = state.registeredAccounts[nim];
    if (!registeredPassword) {
        return { success: false, message: "Akun belum dibuat! Silakan registrasi terlebih dahulu." };
    }
    
    // 3. Validasi password
    if (registeredPassword !== password) {
        return { success: false, message: "Kata sandi salah!" };
    }
    
    // 4. Set session
    const sessionUser = {
        id: member.id,
        name: member.name,
        role: member.role,
        photo: member.photo,
        faculty: member.faculty,
        studyProgram: member.studyProgram,
        contact: member.contact,
        type: "student"
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    
    return { success: true, message: "Login berhasil!" };
}

// Login DPL (Dosen Pembimbing Lapangan)
function loginDPL(password) {
    if (password === "UNAIR2026") {
        const dplSession = {
            id: "dpl",
            name: "Dra. Ira Suarilah, M.Sc., Ph.D.", // DPL Siliragung berdasarkan foto ira suarilah.jpg
            role: "Dosen Pembimbing Lapangan (DPL)",
            photo: "foto/ira suarilah.jpg",
            type: "dpl"
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(dplSession));
        return { success: true, message: "Login DPL Berhasil!" };
    } else {
        return { success: false, message: "Kata sandi DPL salah!" };
    }
}

// Keluar dari sistem (Logout)
function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
}
