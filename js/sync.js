// Logika Sinkronisasi Google Sheets Cloud Storage
// Menggunakan Google Apps Script Web App

// Kirim data presensi/logbook baru ke Google Sheets
function syncToGoogleSheets(logData) {
    if (!state.cloudSyncUrl) {
        console.log("Cloud sync URL tidak disetel. Presensi disimpan lokal.");
        return;
    }

    const payload = {
        action: "create",
        id: logData.id,
        memberId: logData.memberId,
        name: logData.name,
        type: logData.type,
        time: logData.time,
        date: logData.date,
        text: logData.text,
        photo: logData.photo || "", // Kirim foto hasil kompresi ke Google Sheets
        verified: logData.verified ? "TRUE" : "FALSE"
    };

    fetch(state.cloudSyncUrl, {
        method: 'POST',
        mode: 'no-cors', // Mencegah isu CORS saat kirim POST ke Apps Script
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(() => {
        showToast("Data presensi berhasil disinkronkan ke Google Sheets!", "success");
    })
    .catch(err => {
        console.error("Gagal sinkronisasi cloud:", err);
        showToast("Gagal kirim data ke Google Sheets. Disimpan lokal di HP Anda.", "error");
    });
}

// Ambil semua data presensi/logbook dari Google Sheets
async function fetchDataFromCloud(isSilent = false) {
    if (!state.cloudSyncUrl) {
        console.log("Cloud sync URL tidak disetel. Menggunakan database luring.");
        return false;
    }

    try {
        const url = `${state.cloudSyncUrl}?action=read&t=${Date.now()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const cloudLogs = await response.json();
        
        if (Array.isArray(cloudLogs)) {
            // Jadikan data cloud sebagai source of truth utama
            const newLogs = cloudLogs.map(cloudLog => ({
                id: cloudLog.id,
                memberId: String(cloudLog.memberId),
                name: cloudLog.name,
                type: cloudLog.type,
                time: cloudLog.time,
                date: cloudLog.date,
                photo: cloudLog.photo || "",
                text: cloudLog.text,
                verified: cloudLog.verified === "TRUE" || cloudLog.verified === true
            }));

            // Hitung pertambahan data
            const addedCount = newLogs.filter(nl => !state.logs.some(ol => ol.id === nl.id)).length;
            const isChanged = state.logs.length !== newLogs.length || addedCount > 0 || 
                              state.logs.some((l, idx) => newLogs[idx] && l.verified !== newLogs[idx].verified);

            state.logs = newLogs;

            // Perbarui status kehadiran mahasiswa secara real-time di UI
            const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            state.members.forEach(m => {
                const todayClockIn = state.logs.find(l => String(l.memberId) === String(m.id) && (l.type === 'hadir' || l.type === 'clock_in') && l.date === todayStr);
                if (todayClockIn) {
                    m.initialStatus = "Hadir";
                } else {
                    // Reset kembali ke "Belum Absen" jika datanya telah dihapus/direset di cloud oleh DPL atau berganti hari
                    m.initialStatus = "Belum Absen";
                }
            });

            saveStateToLocalStorage();
            
            if (addedCount > 0 && !isSilent) {
                showToast(`${addedCount} data presensi baru berhasil disinkronkan dari Google Sheets!`, "success");
            } else if (isChanged && !isSilent) {
                showToast("Data sinkronisasi berhasil diperbarui!", "success");
            }
            return isChanged; // Mengembalikan true jika ada perubahan data asli (agar UI direfresh)
        }
    } catch (err) {
        console.error("Gagal sinkron data dari Cloud:", err);
        if (!isSilent) {
            showToast("Gagal memperbarui data dari Google Sheets. Periksa koneksi internet Anda.", "error");
        }
        return false;
    }
}

// Verifikasi logbook di Google Sheets
function verifyLogbookOnCloud(logId) {
    if (!state.cloudSyncUrl) return;

    const payload = {
        action: "verify",
        id: logId
    };

    fetch(state.cloudSyncUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .catch(err => console.error("Gagal memverifikasi di cloud:", err));
}

// Reset data di Google Sheets (khusus DPL)
function resetCloudData() {
    if (!state.cloudSyncUrl) return;

    const payload = {
        action: "reset"
    };

    fetch(state.cloudSyncUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .catch(err => console.error("Gagal mereset data di cloud:", err));
}

/* =========================================================================
 * TEMPLATE KODE GOOGLE APPS SCRIPT (Silakan Salin ke Script Editor Google Sheet Anda)
 * =========================================================================
 * 
 * const sheetName = "Sheet1";
 * 
 * function doGet(e) {
 *   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
 *   const rows = sheet.getDataRange().getValues();
 *   const headers = rows[0];
 *   const data = [];
 *   
 *   for (let i = 1; i < rows.length; i++) {
 *     const row = rows[i];
 *     const log = {};
 *     headers.forEach((header, index) => {
 *       log[header] = row[index];
 *     });
 *     data.push(log);
 *   }
 *   
 *   return ContentService.createTextOutput(JSON.stringify(data))
 *     .setMimeType(ContentService.MimeType.JSON);
 * }
 * 
 * function doPost(e) {
 *   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
 *   const payload = JSON.parse(e.postData.contents);
 *   const action = payload.action;
 *   
 *   if (action === "create") {
 *     // Menambahkan baris presensi baru
 *     const timestamp = new Date();
 *     sheet.appendRow([
 *       payload.id,
 *       payload.memberId,
 *       payload.name,
 *       payload.type,
 *       payload.time,
 *       payload.date,
 *       payload.text,
 *       payload.verified,
 *       payload.photo, // Kolom I: Foto bukti kehadiran (Base64)
 *       timestamp
 *     ]);
 *   } else if (action === "verify") {
 *     // Memverifikasi logbook berdasarkan log ID
 *     const logId = payload.id;
 *     const data = sheet.getDataRange().getValues();
 *     for (let i = 1; i < data.length; i++) {
 *       if (data[i][0] === logId) { // Kolom pertama (index 0) adalah id
 *         sheet.getRange(i + 1, 8).setValue("TRUE"); // Kolom ke-8 (kolom H) adalah verified
 *         break;
 *       }
 *     }
 *   } else if (action === "reset") {
 *     // Menghapus semua baris data kecuali header
 *     const lastRow = sheet.getLastRow();
 *     if (lastRow > 1) {
 *       sheet.deleteRows(2, lastRow - 1);
 *     }
 *   }
 *   
 *   return ContentService.createTextOutput(JSON.stringify({success: true}))
 *     .setMimeType(ContentService.MimeType.JSON);
 * }
 */
