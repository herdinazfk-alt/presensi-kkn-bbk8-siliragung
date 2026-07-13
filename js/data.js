// Daftar Anggota Resmi KKN-BBK 8 UNAIR Desa Siliragung 2026
const KKN_MEMBERS = [
    {
        id: "172231050",
        name: "DINI RISMA WARDHANI",
        gender: "Perempuan",
        faculty: "Ilmu Sosial dan Ilmu Politik",
        studyProgram: "S1 Administrasi Publik",
        role: "PDD",
        contact: "6285606377639",
        photo: "foto/dini risma.jpg"
    },
    {
        id: "171231063",
        name: "POPPY AYU PAWITRININGRUM",
        gender: "Perempuan",
        faculty: "Ilmu Sosial dan Ilmu Politik",
        studyProgram: "S1 Sosiologi",
        role: "Ketua Kelompok",
        contact: "6281231395369",
        photo: "foto/poppy ayu.jpg"
    },
    {
        id: "182231071",
        name: "HERDINA IZZA AFKARINA",
        gender: "Perempuan",
        faculty: "Sains dan Teknologi",
        studyProgram: "S1 Fisika",
        role: "Sekretaris",
        contact: "6282264556590",
        photo: "foto/herdina izza.jpg"
    },
    {
        id: "123231139",
        name: "NADHIRAH KAMILA PUTRI PRASETYO",
        gender: "Perempuan",
        faculty: "Ilmu Budaya",
        studyProgram: "S1 Bahasa dan Sastra Inggris",
        role: "Perlengkapan",
        contact: "6285781161061",
        photo: "foto/nadhirah kamila.jpg"
    },
    {
        id: "132231083",
        name: "NUR FADHILAH",
        gender: "Perempuan",
        faculty: "Keperawatan",
        studyProgram: "S1 Keperawatan",
        role: "Acara",
        contact: "6285854928355",
        photo: "foto/nur fadhilah.jpg"
    },
    {
        id: "412231072",
        name: "SABRINA FIRDAUSA AZZAHRA SUNARTO",
        gender: "Perempuan",
        faculty: "Vokasi",
        studyProgram: "D4 Fisioterapi",
        role: "Bendahara",
        contact: "6281235364787",
        photo: "foto/sabrina firdausa.jpg"
    },
    {
        id: "434231099",
        name: "PEDJA RAFSANJANI",
        gender: "Laki-laki",
        faculty: "Vokasi",
        studyProgram: "D4 Teknik Informatika",
        role: "Perlengkapan",
        contact: "6285710902854",
        photo: "foto/pedja rafsanjani.jpg"
    },
    {
        id: "441231007",
        name: "NANDA JELITA ANGGIA ARTA",
        gender: "Perempuan",
        faculty: "Vokasi",
        studyProgram: "D4 Teknologi Veteriner",
        role: "Acara",
        contact: "6281515513747",
        photo: "foto/nanda jelita.jpg"
    },
    {
        id: "441231026",
        name: "SULTAN MAULANA IBRAHIM",
        gender: "Laki-laki",
        faculty: "Vokasi",
        studyProgram: "D4 Teknologi Veteriner",
        role: "PDD",
        contact: "6281230609974",
        photo: "foto/sultan maulana.jpg"
    },
    {
        id: "194231031",
        name: "VIRNA ANANDA",
        gender: "Perempuan",
        faculty: "Ilmu Kesehatan, Kedokteran dan Ilmu Alam",
        studyProgram: "S1 Kesehatan Masyarakat (Fikkia Banyuwangi)",
        role: "Humas",
        contact: "6281213485638",
        photo: "foto/virna ananda.jpg"
    }
];

// STATE MANAGER
let state = {
    members: JSON.parse(JSON.stringify(KKN_MEMBERS)).map(m => {
        m.initialStatus = "Belum Absen";
        return m;
    }),
    logs: [],
    registeredAccounts: {}, // format: { "NIM": "password" }
    cloudSyncUrl: "https://script.google.com/macros/s/AKfycbxTGjyHCPcyshNZUj_YuB7JnfQAX3xqHOAUN4buPEzAl3x4SvjTvuxT0FF_VqRsydk_pA/exec",
    mockLocation: {
        latitude: null,
        longitude: null,
        distance: "Belum Mendeteksi"
    },
    temporaryPhoto: null
};

// Kunci penyimpanan LocalStorage
const STORAGE_KEY = "kkn_presensi_state_prod_v2";

// Memuat state dari LocalStorage saat startup
function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.members = parsed.members || state.members;
            state.logs = parsed.logs || state.logs;
            state.registeredAccounts = parsed.registeredAccounts || state.registeredAccounts;
            // cloudSyncUrl selalu menggunakan nilai hardcoded dari kode
        } catch (e) {
            console.error("Gagal memuat data dari LocalStorage, menggunakan data default.", e);
        }
    }
}

// Menyimpan state ke LocalStorage
function saveStateToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        members: state.members,
        logs: state.logs,
        registeredAccounts: state.registeredAccounts
    }));
}

// Reset semua data lokal
function resetAllStateData() {
    state.members = JSON.parse(JSON.stringify(KKN_MEMBERS)).map(m => {
        m.initialStatus = "Belum Absen";
        return m;
    });
    state.logs = [];
    saveStateToLocalStorage();
}
