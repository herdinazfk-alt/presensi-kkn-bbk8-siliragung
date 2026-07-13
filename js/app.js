// Logika Utama Aplikasi Dashboard KKN BBK 8 Siliragung

let presenceChart = null;

// Tentukan user aktif saat halaman dimuat
let activeUser = null;

// Toast Notification System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `flex items-center p-4 rounded-xl shadow-lg border text-xs sm:text-sm font-semibold transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto max-w-sm w-full `;
    
    if (type === 'success') {
        toast.className += 'bg-emerald-50 border-emerald-200 text-emerald-800';
        toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 mr-3 text-lg"></i><span>${message}</span>`;
    } else if (type === 'error') {
        toast.className += 'bg-red-50 border-red-200 text-red-800';
        toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-red-500 mr-3 text-lg"></i><span>${message}</span>`;
    } else {
        toast.className += 'bg-blue-50 border-blue-200 text-blue-800';
        toast.innerHTML = `<i class="fa-solid fa-circle-info text-blue-500 mr-3 text-lg"></i><span>${message}</span>`;
    }

    container.appendChild(toast);
    setTimeout(() => { toast.classList.remove('translate-y-2', 'opacity-0'); }, 50);

    // Self-Destruct
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => { toast.remove(); }, 300);
    }, 4000);
}

// Inisialisasi Aplikasi Utama
function initApp() {
    loadState();
    activeUser = getCurrentUser();
    
    // Keamanan session
    if (!activeUser) {
        window.location.href = "login.html";
        return;
    }
    
    initClock();
    setupUIForUserRole();
    
    // Sinkronisasi data awal dari cloud (Google Sheets) jika dikonfigurasi
    if (state.cloudSyncUrl) {
        fetchDataFromCloud().then(() => {
            renderActiveTabContent('dashboard');
        });
    } else {
        renderActiveTabContent('dashboard');
    }

    // Jalankan polling otomatis di latar belakang
    startAutoPolling();
}

// Memulai polling otomatis di latar belakang setiap 30 detik
function startAutoPolling() {
    setInterval(() => {
        if (state.cloudSyncUrl) {
            // Polling secara silent (isSilent = true) tanpa notifikasi toast yang mengganggu
            fetchDataFromCloud(true).then(updated => {
                if (updated) {
                    const activeTabBtn = document.querySelector('.tab-btn.active');
                    if (activeTabBtn) {
                        const tabId = activeTabBtn.id.replace('tab-btn-', '');
                        renderActiveTabContent(tabId);
                    }
                }
            });
        }
    }, 30000); // Polling setiap 30 detik
}

// Jam Digital Sistem
function initClock() {
    setInterval(() => {
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0];
        const clockEl = document.getElementById('digital-clock');
        if (clockEl) {
            clockEl.innerText = timeString;
        }
    }, 1000);
}

// Sesuaikan Tampilan UI Berdasarkan Role User (Mahasiswa vs DPL)
function setupUIForUserRole() {
    const navName = document.getElementById('nav-active-name');
    const navRole = document.getElementById('nav-active-role');
    const navPhoto = document.getElementById('nav-active-photo');
    
    if (navName) navName.innerText = activeUser.name;
    if (navRole) navRole.innerText = activeUser.role;
    if (navPhoto) {
        navPhoto.src = activeUser.photo;
        navPhoto.onerror = function() {
            this.src = `https://placehold.co/100/0f2d59/ffffff?text=${activeUser.name[0]}`;
        };
    }
    
    // Tampilkan / Sembunyikan Tab berdasarkan Role
    const tabPresensi = document.getElementById('tab-btn-presensi');
    const tabAdmin = document.getElementById('tab-btn-admin');
    
    if (activeUser.type === 'dpl') {
        // DPL: sembunyikan formulir presensi, tampilkan panel DPL
        if (tabPresensi) tabPresensi.classList.add('hidden');
        if (tabAdmin) tabAdmin.classList.remove('hidden');
        switchTab('dashboard');
    } else {
        // Mahasiswa: tampilkan presensi, sembunyikan panel DPL
        if (tabPresensi) tabPresensi.classList.remove('hidden');
        if (tabAdmin) tabAdmin.classList.add('hidden');
        
        // Load data profil presensi mandiri
        setupPresensiProfile();
        switchTab('dashboard');
    }
    
    // Populate filter logbook di tab Logbook
    populateLogbookFilters();
}

// Menyiapkan Profil Presensi Mandiri Mahasiswa
function setupPresensiProfile() {
    const memberName = document.getElementById('member-name');
    const memberNim = document.getElementById('member-nim');
    const memberRole = document.getElementById('member-role');
    const memberAvatar = document.getElementById('member-avatar');
    
    if (memberName) memberName.innerText = activeUser.name;
    if (memberNim) memberNim.innerText = `NIM. ${activeUser.id}`;
    if (memberRole) memberRole.innerText = activeUser.role;
    if (memberAvatar) {
        memberAvatar.innerHTML = `<img src="${activeUser.photo}" alt="${activeUser.name}" class="w-full h-full object-cover rounded-full" onerror="this.remove(); document.getElementById('member-avatar').innerText='${activeUser.name.split(' ').map(n=>n[0]).slice(0,2).join('')}'">`;
    }
    
    const member = state.members.find(m => m.id === activeUser.id);
    if (member) {
        updateMemberStatusDisplay(member);
    }
}

// Update Kotak Status Presensi di Halaman Presensi Mandiri
function updateMemberStatusDisplay(member) {
    const statusBox = document.getElementById('member-status-box');
    const clockInBox = document.getElementById('member-clock-in');
    
    if (!statusBox || !clockInBox) return;
    
    const todayInLog = state.logs.find(l => l.memberId === member.id && l.type === 'clock_in');
    statusBox.className = "font-semibold text-xs py-0.5 px-2 rounded ";
    
    if (todayInLog) {
        statusBox.innerText = "Hadir (Clock-In)";
        statusBox.className += "bg-emerald-100 text-emerald-800";
        clockInBox.innerText = todayInLog.time;
    } else {
        const statusMap = {
            "Hadir": { text: "Hadir", class: "bg-emerald-100 text-emerald-800" },
            "Izin": { text: "Izin", class: "bg-amber-100 text-amber-800" },
            "Sakit": { text: "Sakit", class: "bg-red-100 text-red-800" },
            "Belum Absen": { text: "Belum Absen", class: "bg-slate-100 text-slate-800" }
        };
        const mapped = statusMap[member.initialStatus] || statusMap["Belum Absen"];
        statusBox.innerText = mapped.text;
        statusBox.className += mapped.class;
        clockInBox.innerText = "-- : --";
    }
}

// Ganti Tab Utama
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.add('hidden');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'border-unair-blue', 'text-unair-blue');
        btn.classList.add('border-transparent', 'text-slate-500');
    });

    const targetSection = document.getElementById(`tab-${tabId}`);
    if (targetSection) targetSection.classList.remove('hidden');
    
    const activeBtn = document.getElementById(`tab-btn-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'border-unair-blue', 'text-unair-blue');
        activeBtn.classList.remove('border-transparent', 'text-slate-500');
    }

    renderActiveTabContent(tabId);
}

// Render Konten Tab yang Sedang Aktif
function renderActiveTabContent(tabId) {
    if (tabId === 'dashboard') {
        renderDashboard();
    } else if (tabId === 'logbook') {
        renderLogbooks();
    } else if (tabId === 'anggota') {
        renderMembersList();
    } else if (tabId === 'admin') {
        renderAdminMemberList();
    }
}

// Render Tab: Beranda/Dashboard
function renderDashboard() {
    const dashboardWelcomeMsg = document.getElementById('dashboard-welcome-msg');
    if (dashboardWelcomeMsg && activeUser) {
        dashboardWelcomeMsg.innerHTML = `Halo, ${activeUser.name.split(' ')[0]}! <span class="wave">👋</span>`;
    }

    // Hitung Stat
    const totalHadir = state.members.filter(m => {
        const hasClockIn = state.logs.some(l => l.memberId === m.id && l.type === 'clock_in');
        return hasClockIn || m.initialStatus === 'Hadir';
    }).length;

    const totalIzinSakit = state.members.filter(m => m.initialStatus === 'Izin' || m.initialStatus === 'Sakit').length;
    const totalBelum = 10 - totalHadir - totalIzinSakit;

    const totalLogbooks = state.logs.filter(l => l.text && l.text.length > 5).length;
    const verifikasiDplCount = state.logs.filter(l => l.verified).length;
    const verifikasiRate = state.logs.length > 0 ? Math.round((verifikasiDplCount / state.logs.length) * 100) : 0;

    const statHadir = document.getElementById('stat-hadir');
    const statBelum = document.getElementById('stat-belum');
    const statLogbook = document.getElementById('stat-logbook');
    const statVerifikasi = document.getElementById('stat-terverifikasi');
    
    if (statHadir) statHadir.innerText = `${totalHadir} / 10`;
    if (statBelum) statBelum.innerText = `${totalBelum}`;
    if (statLogbook) statLogbook.innerText = totalLogbooks;
    if (statVerifikasi) statVerifikasi.innerText = `${verifikasiRate}%`;

    drawPresenceChart(totalHadir, totalIzinSakit, totalBelum);

    // Render Aktivitas Terkini
    const container = document.getElementById('recent-logs-container');
    if (!container) return;
    
    container.innerHTML = '';

    if (state.logs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400 font-sans">
                <i class="fa-solid fa-hourglass-empty text-3xl mb-2 block text-slate-300"></i>
                <p class="text-xs">Belum ada aktivitas presensi atau logbook terkumpul hari ini.</p>
            </div>
        `;
        return;
    }

    const sortedLogs = [...state.logs].reverse();

    sortedLogs.forEach(log => {
        const icon = log.type === 'clock_in' ? 'fa-circle-arrow-down text-emerald-500' : 'fa-circle-arrow-up text-red-500';
        const actionLabel = log.type === 'clock_in' ? 'Clock-In (Masuk)' : 'Clock-Out (Pulang)';
        const badgeVerified = log.verified 
            ? `<span class="bg-emerald-50 text-emerald-700 text-[9px] px-2 py-0.5 rounded border border-emerald-200 font-bold flex items-center gap-1"><i class="fa-solid fa-certificate"></i> Terverifikasi DPL</span>` 
            : `<span class="bg-amber-50 text-amber-700 text-[9px] px-2 py-0.5 rounded border border-amber-200 font-bold flex items-center gap-1"><i class="fa-solid fa-spinner animate-spin"></i> Menunggu DPL</span>`;

        const member = KKN_MEMBERS.find(m => m.id === log.memberId);
        const role = member ? member.role : 'Anggota';
        const profilePhoto = member ? member.photo : 'https://placehold.co/100/0f2d59/ffffff';

        const logItem = document.createElement('div');
        logItem.className = "bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex gap-3 text-xs";
        logItem.innerHTML = `
            <div class="flex-shrink-0">
                <img src="${profilePhoto}" alt="${log.name}" class="w-10 h-10 rounded-lg object-cover border border-slate-200" onerror="this.src='https://placehold.co/100/0f2d59/ffffff?text=${log.name[0]}'">
            </div>
            <div class="flex-grow space-y-1">
                <div class="flex items-center justify-between flex-wrap gap-1">
                    <span class="font-bold text-slate-800">${log.name} <span class="text-[10px] text-slate-400 font-normal">(${role})</span></span>
                    <span class="font-mono text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border">${log.time}</span>
                </div>
                <div class="flex items-center space-x-1.5 text-slate-500 font-medium py-0.5">
                    <i class="fa-solid ${icon}"></i>
                    <span>${actionLabel}</span>
                </div>
                <p class="text-slate-600 leading-relaxed font-sans mt-1 bg-white p-2 rounded-lg border border-slate-100 italic">${log.text || 'Tidak menulis deskripsi logbook.'}</p>
                <div class="flex justify-end pt-1">
                    ${badgeVerified}
                </div>
            </div>
        `;
        container.appendChild(logItem);
    });
}

// Gambar Chart Doughnut
function drawPresenceChart(hadir, izin, belum) {
    const chartEl = document.getElementById('presenceChart');
    if (!chartEl) return;
    
    const ctx = chartEl.getContext('2d');
    
    if (presenceChart) {
        presenceChart.destroy();
    }

    presenceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hadir', 'Sakit/Izin', 'Belum Absen'],
            datasets: [{
                data: [hadir, izin, belum],
                backgroundColor: ['#059669', '#F59E0B', '#E2E8F0'],
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            cutout: '70%'
        }
    });
}

// Simulasi Lokasi Posko (Geofencing)
function detectLocation() {
    const coordsEl = document.getElementById('gps-coords');
    const distEl = document.getElementById('gps-distance');
    
    if (!coordsEl || !distEl) return;
    
    coordsEl.innerText = "Mendeteksi...";
    distEl.innerText = "Menghitung...";
    
    setTimeout(() => {
        const isWithinRange = Math.random() > 0.05; // 95% tervalidasi masuk daerah target
        
        if (isWithinRange) {
            state.mockLocation = {
                latitude: -8.4735 + (Math.random() - 0.5) * 0.001,
                longitude: 114.1154 + (Math.random() - 0.5) * 0.001,
                distance: "124 meter dari Balai Desa Siliragung"
            };
            showToast("GPS Lokasi Anda tervalidasi di kawasan Desa Siliragung!", "success");
        } else {
            state.mockLocation = {
                latitude: -8.5412,
                longitude: 114.2341,
                distance: "12 km di luar radius Desa Siliragung!"
            };
            showToast("GPS Mendeteksi Anda di luar radius Desa Siliragung. Harap kembali ke lokasi posko!", "error");
        }

        coordsEl.innerText = `${state.mockLocation.latitude.toFixed(5)}, ${state.mockLocation.longitude.toFixed(5)}`;
        distEl.innerText = state.mockLocation.distance;
    }, 800);
}

// Tampilkan Gambar Bukti Absen
function previewPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        state.temporaryPhoto = e.target.result;
        const placeholder = document.getElementById('camera-placeholder');
        if (placeholder) placeholder.classList.add('hidden');
        
        const previewImg = document.getElementById('camera-preview');
        const container = document.getElementById('camera-preview-container');
        if (previewImg && container) {
            previewImg.src = e.target.result;
            container.classList.remove('hidden');
        }
    };
    reader.readAsDataURL(file);
}

// Reset Gambar Bukti Absen
function resetPhoto(event) {
    if (event) event.stopPropagation();
    state.temporaryPhoto = null;
    const input = document.getElementById('photo-input');
    if (input) input.value = '';
    
    const placeholder = document.getElementById('camera-placeholder');
    const container = document.getElementById('camera-preview-container');
    if (placeholder) placeholder.classList.remove('hidden');
    if (container) container.classList.add('hidden');
}

// Toggle Fields Form Clock-In vs Clock-Out
function toggleFormFields(value) {
    const logbookSection = document.getElementById('logbook-input-section');
    const submitBtnText = document.getElementById('submit-btn-text');
    
    if (!logbookSection || !submitBtnText) return;
    
    if (value === 'clock_in') {
        logbookSection.classList.remove('hidden');
        submitBtnText.innerText = "Kirim Absensi Masuk (Clock-In)";
    } else {
        logbookSection.classList.add('hidden');
        submitBtnText.innerText = "Kirim Absensi Pulang (Clock-Out)";
    }
}

// Handler Submit Form Absensi
function handleAttendanceSubmit(event) {
    event.preventDefault();
    
    const attendanceType = document.querySelector('input[name="attendance_type"]:checked').value;
    const logbookTextEl = document.getElementById('logbook-text');
    const logbookText = logbookTextEl ? logbookTextEl.value.trim() : '';

    if (!state.temporaryPhoto) {
        showToast("Anda wajib melampirkan foto bukti kehadiran!", "error");
        return;
    }

    // Kirim absensi harian tanpa minimal batas karakter logbook
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB";

    const newLog = {
        id: "log-" + Date.now(),
        memberId: activeUser.id,
        name: activeUser.name,
        type: attendanceType,
        time: timeString,
        date: now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        photo: state.temporaryPhoto,
        text: attendanceType === 'clock_in' ? logbookText : "Clock-Out Mandiri Berhasil",
        verified: false
    };

    // Update status harian
    const localMember = state.members.find(m => m.id === activeUser.id);
    if (localMember) {
        localMember.initialStatus = (attendanceType === 'clock_in') ? "Hadir" : "Belum Absen";
    }

    state.logs.push(newLog);
    saveStateToLocalStorage();

    // Kirim ke Google Sheets Cloud jika URL aktif
    if (state.cloudSyncUrl) {
        syncToGoogleSheets(newLog);
    }

    showToast(`${attendanceType === 'clock_in' ? 'Clock-In' : 'Clock-Out'} Berhasil Dikirim!`, "success");
    
    if (logbookTextEl) logbookTextEl.value = '';
    resetPhoto();
    
    if (localMember) {
        updateMemberStatusDisplay(localMember);
    }
    
    setTimeout(() => { switchTab('dashboard'); }, 500);
}

// Inisialisasi Filter di Tab Logbook
function populateLogbookFilters() {
    const logFilter = document.getElementById('logbook-filter');
    if (!logFilter) return;
    
    logFilter.innerHTML = '<option value="all">Semua Anggota</option>';
    
    KKN_MEMBERS.forEach(m => {
        const optFilter = document.createElement('option');
        optFilter.value = m.id;
        optFilter.innerText = m.name;
        logFilter.appendChild(optFilter);
    });
}

// Render Tab: Daftar Logbook
function renderLogbooks() {
    const container = document.getElementById('logbook-list-container');
    const filterEl = document.getElementById('logbook-filter');
    if (!container || !filterEl) return;
    
    const filterVal = filterEl.value;
    container.innerHTML = '';
    
    const filteredLogs = state.logs.filter(log => {
        if (filterVal === 'all') return log.text && log.text.length > 5;
        return log.memberId === filterVal && log.text && log.text.length > 5;
    });

    if (filteredLogs.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100 font-sans">
                <i class="fa-solid fa-folder-open text-4xl mb-3 text-slate-300 block"></i>
                <p class="text-xs text-slate-400">Belum ada riwayat berkas logbook untuk anggota kelompok ini.</p>
            </div>
        `;
        return;
    }

    [...filteredLogs].reverse().forEach(log => {
        const member = KKN_MEMBERS.find(m => m.id === log.memberId);
        const role = member ? member.role : 'Anggota';
        const profilePhoto = member ? member.photo : 'https://placehold.co/100/0f2d59/ffffff';
        const statusBadge = log.verified 
            ? `<span class="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Terverifikasi DPL</span>`
            : `<span class="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><i class="fa-solid fa-hourglass-start animate-pulse"></i> Menunggu DPL</span>`;

        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between space-y-4";
        card.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div class="flex gap-3">
                    <div class="flex-shrink-0">
                        <img src="${profilePhoto}" alt="${log.name}" class="w-11 h-11 rounded-xl object-cover border border-slate-200" onerror="this.src='https://placehold.co/100/0f2d59/ffffff?text=${log.name[0]}'">
                    </div>
                    <div>
                        <h4 class="font-heading font-extrabold text-sm text-slate-800">${log.name}</h4>
                        <p class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">${role}</p>
                    </div>
                </div>
                <span class="text-[10px] font-mono text-slate-400 bg-slate-50 border px-2 py-1 rounded">${log.time}</span>
            </div>
            
            <p class="text-xs leading-relaxed text-slate-600 italic bg-slate-50/50 p-3 rounded-xl border border-slate-100 font-sans">${log.text}</p>
            
            <div class="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-2">
                <span class="text-[10px] text-slate-400 font-medium flex items-center gap-1"><i class="fa-regular fa-calendar"></i> ${log.date}</span>
                ${statusBadge}
            </div>
        `;
        container.appendChild(card);
    });
}

// Helper untuk memformat nomor WhatsApp agar menggunakan kode negara (62)
function formatWhatsAppNumber(phone) {
    if (!phone) return "";
    let clean = phone.toString().replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
        clean = "62" + clean.slice(1);
    }
    return clean;
}

// Render Tab: Data Anggota Kelompok
function renderMembersList() {
    const tableBody = document.getElementById('members-table-body');
    const cardsContainer = document.getElementById('members-cards-container');
    
    if (!tableBody || !cardsContainer) return;
    
    tableBody.innerHTML = '';
    cardsContainer.innerHTML = '';

    state.members.forEach(member => {
        const initials = member.name.split(' ').map(n => n[0]).slice(0, 2).join('');
        
        const badgeMap = {
            "Hadir": "bg-emerald-100 text-emerald-800",
            "Izin": "bg-amber-100 text-amber-800",
            "Sakit": "bg-red-100 text-red-800",
            "Belum Absen": "bg-slate-100 text-slate-800"
        };
        const classBadge = badgeMap[member.initialStatus] || "bg-slate-100 text-slate-800";

        // Tampilan Desktop Table Row
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/50 transition";
        tr.innerHTML = `
            <td class="py-4 px-6">
                <div class="w-10 h-10 bg-unair-blue text-white rounded-xl overflow-hidden flex items-center justify-center font-heading font-extrabold text-xs shadow-inner">
                    <img src="${member.photo}" alt="${member.name}" class="w-full h-full object-cover" onerror="this.remove(); document.write('${initials}')">
                </div>
            </td>
            <td class="py-4 px-6 font-medium">
                <span class="block font-bold text-slate-800 font-heading">${member.name}</span>
                <span class="block text-[10px] text-slate-400 font-mono mt-0.5">NIM. ${member.id}</span>
            </td>
            <td class="py-4 px-6 font-sans">
                <span class="block text-slate-700 font-medium">${member.faculty}</span>
                <span class="block text-[10px] text-slate-400 mt-0.5">${member.studyProgram}</span>
            </td>
            <td class="py-4 px-6">
                <span class="bg-blue-50 text-unair-blue font-bold px-2.5 py-1 rounded border border-blue-100 text-[10px] uppercase tracking-wider block text-center max-w-[140px]">${member.role}</span>
            </td>
            <td class="py-4 px-6 text-center">
                <span class="font-bold text-[10px] px-2.5 py-1 rounded-full ${classBadge}">${member.initialStatus}</span>
            </td>
            <td class="py-4 px-6 text-right">
                <a href="https://wa.me/${formatWhatsAppNumber(member.contact)}" target="_blank" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1.5 rounded-lg border border-emerald-100 inline-flex items-center gap-1">
                    <i class="fa-brands fa-whatsapp text-sm"></i>Hubungi
                </a>
            </td>
        `;
        tableBody.appendChild(tr);

        // Tampilan Mobile Card
        const card = document.createElement('div');
        card.className = "p-4 space-y-3 font-sans";
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-unair-blue text-white rounded-xl overflow-hidden flex items-center justify-center font-heading font-bold text-xs">
                        <img src="${member.photo}" alt="${member.name}" class="w-full h-full object-cover" onerror="this.remove(); document.write('${initials}')">
                    </div>
                    <div>
                        <h4 class="font-heading font-extrabold text-sm text-slate-800 leading-tight">${member.name}</h4>
                        <span class="text-[10px] text-slate-400 font-mono">NIM. ${member.id}</span>
                    </div>
                </div>
                <span class="font-bold text-[9px] px-2 py-0.5 rounded-full ${classBadge}">${member.initialStatus}</span>
            </div>
            <div class="text-[11px] text-slate-500 space-y-0.5">
                <p><span class="font-semibold text-slate-400 font-sans">Prodi:</span> ${member.studyProgram}</p>
                <p><span class="font-semibold text-slate-400 font-sans">Jabatan:</span> <span class="text-unair-blue font-bold">${member.role}</span></p>
            </div>
            <div class="flex justify-between items-center pt-2">
                <span class="text-[10px] text-slate-400">${member.faculty}</span>
                <a href="https://wa.me/${formatWhatsAppNumber(member.contact)}" target="_blank" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-lg border border-emerald-100 inline-flex items-center gap-1">
                    <i class="fa-brands fa-whatsapp"></i> Hubungi
                </a>
            </div>
        `;
        cardsContainer.appendChild(card);
    });
}

// Render Tab: Panel Admin (DPL)
function renderAdminMemberList() {
    const container = document.getElementById('admin-member-list');
    if (!container) return;
    
    container.innerHTML = '';

    state.members.forEach(member => {
        const todayInLog = state.logs.find(l => l.memberId === member.id && l.type === 'clock_in');
        
        const isVerified = todayInLog ? todayInLog.verified : false;
        const checkboxAttr = isVerified ? 'checked disabled' : (todayInLog ? '' : 'disabled');
        const verifyActionText = isVerified 
            ? '<span class="text-emerald-600 font-bold text-xs flex items-center justify-end gap-1"><i class="fa-solid fa-square-check"></i> Berhasil Verifikasi</span>' 
            : (todayInLog 
                ? `<button onclick="verifyLogbook('${todayInLog.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded text-[10px] transition">Verifikasi</button>` 
                : '<span class="text-slate-400 italic">Belum Ada Berkas</span>');

        const overrideOptions = ["Hadir", "Izin", "Sakit", "Belum Absen"].map(opt => {
            const isSelected = member.initialStatus === opt ? 'selected' : '';
            return `<option value="${opt}" ${isSelected}>${opt}</option>`;
        }).join('');

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition border-b border-slate-100 font-sans";
        tr.innerHTML = `
            <td class="py-3 px-6 flex items-center gap-3">
                <img src="${member.photo}" alt="${member.name}" class="w-8 h-8 rounded-full object-cover border border-slate-200" onerror="this.src='https://placehold.co/100/0f2d59/ffffff?text=${member.name[0]}'">
                <div>
                    <span class="block font-bold text-slate-800">${member.name}</span>
                    <span class="block text-[10px] text-slate-400 font-mono">${member.role}</span>
                </div>
            </td>
            <td class="py-3 px-6">
                <select onchange="overrideMemberStatus('${member.id}', this.value)" class="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-600 font-medium focus:outline-none">
                    ${overrideOptions}
                </select>
            </td>
            <td class="py-3 px-6">
                <span class="block text-slate-600 font-medium">${todayInLog ? todayInLog.time : '-- : --'}</span>
            </td>
            <td class="py-3 px-6">
                <p class="max-w-xs truncate text-[11px] text-slate-500" title="${todayInLog ? todayInLog.text : 'Tidak ada catatan'}">
                    ${todayInLog ? todayInLog.text : '<span class="italic text-slate-300">Belum lapor</span>'}
                </p>
            </td>
            <td class="py-3 px-6 text-center">
                <input type="checkbox" ${checkboxAttr} class="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500">
            </td>
            <td class="py-3 px-6 text-right">
                ${verifyActionText}
            </td>
        `;
        container.appendChild(tr);
    });
}

// Verifikasi Logbook secara manual oleh DPL
function verifyLogbook(logId) {
    const log = state.logs.find(l => l.id === logId);
    if (log) {
        log.verified = true;
        saveStateToLocalStorage();
        
        // Verifikasi di cloud jika diset
        verifyLogbookOnCloud(logId);
        
        showToast(`Logbook milik ${log.name} berhasil divalidasi!`, "success");
        renderAdminMemberList();
        renderDashboard();
    }
}

// DPL Mengubah Status Anggota secara manual (override)
function overrideMemberStatus(memberId, newStatus) {
    const member = state.members.find(m => m.id === memberId);
    if (member) {
        member.initialStatus = newStatus;
        saveStateToLocalStorage();
        showToast(`Status harian ${member.name} diubah menjadi: ${newStatus}`, "success");
        renderAdminMemberList();
        renderDashboard();
    }
}



// Trigger Manual Sinkronisasi Data dari Cloud
function triggerManualRefresh() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.classList.add('animate-spin');
    }
    
    fetchDataFromCloud().then(success => {
        if (success) {
            renderActiveTabContent('dashboard');
        }
        if (refreshBtn) {
            refreshBtn.classList.remove('animate-spin');
        }
    });
}

// Ekspor Rekap Kehadiran ke CSV
function exportToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "NIM,Nama Mahasiswa,Fakultas,Program Studi,Jabatan Kelompok,Status Hari Ini,Logbook Aktivitas,Waktu Presensi\n";
    
    state.members.forEach(m => {
        const logToday = state.logs.find(l => l.memberId === m.id && l.type === 'clock_in');
        const cleanLogText = logToday ? logToday.text.replace(/"/g, '""') : 'Tidak ada laporan';
        const timeLog = logToday ? logToday.time : '--';
        
        csvContent += `"${m.id}","${m.name}","${m.faculty}","${m.studyProgram}","${m.role}","${m.initialStatus}","${cleanLogText}","${timeLog}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "REKAP_PRESENSI_KKN_SILIRAGUNG_2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("File CSV Rekap Kehadiran berhasil diunduh!", "success");
}

// Salin Ringkasan Mingguan untuk Whatsapp/DPL
function copyWeeklySummary() {
    let textSummary = `📋 RINGKASAN PRESENSI HARIAN KKN-BBK 8 UNAIR DESA SILIRAGUNG 2026\n`;
    textSummary += `========================================================\n\n`;
    
    state.members.forEach((m, idx) => {
        const logToday = state.logs.find(l => l.memberId === m.id && l.type === 'clock_in');
        const logText = logToday ? `- Logbook: "${logToday.text.substring(0, 80)}..."` : "- Logbook: Belum diisi";
        textSummary += `${idx + 1}. [${m.initialStatus}] ${m.name} (${m.role})\n   ${logText}\n\n`;
    });

    textSummary += `Diambil secara otomatis lewat Sistem Presensi Mandiri Web Siliragung.`;

    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = textSummary;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    
    try {
        const success = document.execCommand('copy');
        if (success) {
            showToast("Ringkasan Presensi disalin ke Clipboard!", "success");
        } else {
            showToast("Gagal menyalin ringkasan.", "error");
        }
    } catch (err) {
        console.error("Gagal menyalin", err);
    }
    
    document.body.removeChild(tempTextarea);
}

// Buka Modal Reset Data
function openResetModal() {
    const modal = document.getElementById('reset-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

// Tutup Modal Reset Data
function closeResetModal() {
    const modal = document.getElementById('reset-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Konfirmasi dan hapus semua data
function confirmResetAllData() {
    resetAllStateData();
    resetCloudData();
    closeResetModal();
    
    showToast("Semua database presensi & logbook kelompok telah berhasil dibersihkan!", "success");
    
    // Refresh Tampilan UI
    setupUIForUserRole();
    renderActiveTabContent('dashboard');
}
