// Plant configuration data
const plantOrder = [
    { code: "5E01", wilayah: "Kal-Bar", desc: "KEBUN GUNUNG MELIAU", hk: 25 },
    { code: "5E02", wilayah: "Kal-Bar", desc: "KEBUN GUNUNG MAS", hk: 25 },
    { code: "5E03", wilayah: "Kal-Bar", desc: "KEBUN SUNGAI DEKAN", hk: 25 },
    { code: "5E04", wilayah: "Kal-Bar", desc: "KEBUN RIMBA BELIAN", hk: 25 },
    { code: "5E06", wilayah: "Kal-Bar", desc: "KEBUN SINTANG", hk: 25 },
    { code: "5E07", wilayah: "Kal-Bar", desc: "KEBUN NGABANG", hk: 25 },
    { code: "5E08", wilayah: "Kal-Bar", desc: "KEBUN PARINDU", hk: 25 },
    { code: "5E09", wilayah: "Kal-Bar", desc: "KEBUN KEMBAYAN", hk: 25 },
    { code: "5E11", wilayah: "Kal-Sel-Teng", desc: "KEBUN DANAU SALAK", hk: 25 },
    { code: "5E12", wilayah: "Kal-Sel-Teng", desc: "KEBUN KUMAI KARET", hk: 25 },
    { code: "5E13", wilayah: "Kal-Sel-Teng", desc: "KEBUN BATULICIN", hk: 25 },
    { code: "5E14", wilayah: "Kal-Sel-Teng", desc: "KEBUN PAMUKAN", hk: 25 },
    { code: "5E15", wilayah: "Kal-Sel-Teng", desc: "KEBUN PELAIHARI", hk: 25 },
    { code: "5E16", wilayah: "Kal-Tim", desc: "KEBUN TABARA", hk: 25 },
    { code: "5E17", wilayah: "Kal-Tim", desc: "KEBUN TAJATI", hk: 25 },
    { code: "5E18", wilayah: "Kal-Tim", desc: "KEBUN PANDAWA", hk: 25 },
    { code: "5E19", wilayah: "Kal-Tim", desc: "KEBUN LONGKALI", hk: 25 },
    { code: "5F01", wilayah: "Kal-Bar", desc: "PABRIK GUNUNG MELIAU", hk: 25 },
    { code: "5F04", wilayah: "Kal-Bar", desc: "PABRIK RIMBA BELIAN", hk: 25 },
    { code: "5F07", wilayah: "Kal-Bar", desc: "PABRIK NGABANG", hk: 25 },
    { code: "5F08", wilayah: "Kal-Bar", desc: "PABRIK PARINDU", hk: 25 },
    { code: "5F09", wilayah: "Kal-Bar", desc: "PABRIK KEMBAYAN", hk: 25 },
    { code: "5F11", wilayah: "Kal-Sel-Teng", desc: "UNIT PROYEK BATU BARA", hk: "-" },
    { code: "5F14", wilayah: "Kal-Sel-Teng", desc: "PABRIK PAMUKAN", hk: "-" },
    { code: "5F15", wilayah: "Kal-Sel-Teng", desc: "PABRIK PELAIHARI", hk: 25 },
    { code: "5F20", wilayah: "Kal-Sel-Teng", desc: "PKR TAMBARANGAN", hk: "-" },
    { code: "5F21", wilayah: "Kal-Tim", desc: "PABRIK SAMUNTAI", hk: "-" },
    { code: "5F22", wilayah: "Kal-Tim", desc: "PABRIK LONG PINANG", hk: 25 },
    { code: "5D01", wilayah: "Kal-Bar", desc: "Distrik Kalbar", hk: 25 },
    { code: "5D02", wilayah: "Kal-Tim", desc: "Distrik Kaltim", hk: 25 },
    { code: "5D03", wilayah: "Kal-Sel-Teng", desc: "Distrik Kalselteng", hk: 25 }
];

// Target input logbook (dynamically set to MaxDate + 1 day)
let TARGET_DATE = new Date(2026, 6, 1);
TARGET_DATE.setHours(0, 0, 0, 0);

// App state
let globalTransactions = [];
let selectedDate = new Date(2026, 5, 30); // Default to 30 June 2026
let currentYear = 2026;
let currentMonth = 5; // June (0-based)
let activeEquipmentData = [];

// Date helper to parse excel formats
function excelDateToJSDate(serial) {
    if (!serial) return null;
    if (serial instanceof Date) {
        // Force time reset to midnight to avoid offset issues
        const d = new Date(serial);
        d.setHours(0,0,0,0);
        return d;
    }
    if (typeof serial === 'string') {
        const parts = serial.trim().split(/[\/\-\s]/);
        if (parts.length >= 3) {
            let p1 = parseInt(parts[0], 10);
            let p2 = parseInt(parts[1], 10);
            let p3 = parseInt(parts[2], 10);
            if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
                let y = p3 > 1000 ? p3 : (p3 < 100 ? 2000 + p3 : p3);
                let m, d;
                if (p1 > 12) {
                    d = p1; m = p2;
                } else if (p2 > 12) {
                    m = p1; d = p2;
                } else {
                    m = p1; d = p2;
                }
                return new Date(y, m - 1, d);
            }
        }
        return new Date(serial);
    }
    // Excel numeric date code
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), 0, 0, 0);
}

// Convert date to readable Indonesia format (Senin, 06 Juli 2026)
function formatDayLabel(date) {
    if (!date) return '-';
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${day} ${month} ${year}`;
}

function formatDate(date) {
    if (!date) return '-';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}

function getLogbookClass(date) {
    if (!date) return 'bg-black';
    const diffTime = TARGET_DATE - date;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'bg-green';
    if (diffDays > 0 && diffDays < 3) return 'bg-yellow';
    return 'bg-red';
}

function formatPercent(value, total) {
    if (total === 0) return '0,00%';
    const pct = (value / total) * 100;
    return pct.toFixed(2).replace('.', ',') + '%';
}

// Process data for both the daily logs and the aggregated monthly logbook
function processData(data) {
    const agg = {};
    let globalMaxDate = null;

    // Initialize aggregated stats object
    plantOrder.forEach(p => {
        agg[p.code] = {
            code: p.code,
            wilayah: p.wilayah,
            desc: p.desc,
            hk: p.hk,
            vehCodes: new Set(),
            rencana: 0,
            upToDate: 0,
            tidakUpToDate: 0,
            total: 0,
            lastDate: null
        };
    });

    data.forEach(row => {
        const plant = row['Plant'];
        if (!agg[plant]) return;
        if (row['Cancelled/Reversed']) return; // Filter out cancelled transactions

        const p = agg[plant];
        p.rencana++;
        p.total++;
        if (row['Vehicle Code']) {
            p.vehCodes.add(row['Vehicle Code']);
        }

        const vDateStr = row['Vehicle Date'] || row['Tgl Angkut'];
        const cDateStr = row['Created on'];
        
        if (vDateStr) {
            const vDate = excelDateToJSDate(vDateStr);
            if (!p.lastDate || vDate > p.lastDate) {
                p.lastDate = vDate;
            }
            if (!globalMaxDate || vDate > globalMaxDate) {
                globalMaxDate = vDate;
            }

            if (cDateStr) {
                const cDate = excelDateToJSDate(cDateStr);
                const diffTime = cDate - vDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 1) {
                    p.upToDate++;
                } else {
                    p.tidakUpToDate++;
                }
            } else {
                p.tidakUpToDate++;
            }
        }
    });

    // Enforce target date dynamically (H+1) based on the latest transaction
    if (globalMaxDate) {
        TARGET_DATE = new Date(globalMaxDate);
        TARGET_DATE.setDate(TARGET_DATE.getDate() + 1);
        TARGET_DATE.setHours(0, 0, 0, 0);
        
        const targetDisplay = document.getElementById('targetDateDisplay');
        if (targetDisplay) targetDisplay.textContent = formatDate(TARGET_DATE);
        
        // Auto-select latest date on initial load
        selectedDate = new Date(globalMaxDate);
        currentYear = selectedDate.getFullYear();
        currentMonth = selectedDate.getMonth();
    }

    // Set last update label
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        const now = new Date();
        lastUpdated.textContent = "Last Update: " + now.toLocaleString('id-ID');
    }

    // Calculate unique ranking
    const forRanking = plantOrder.map(p => agg[p.code]);
    forRanking.sort((a, b) => b.upToDate - a.upToDate);
    for(let i = 0; i < forRanking.length; i++) {
        forRanking[i].rank = i + 1;
    }

    renderMonthlyTable(agg);
    populatePlantDropdown();
    generateCalendar(currentYear, currentMonth);
    updateDailyView();
}

// Render Monthly Logbook Table (Tab 2)
function renderMonthlyTable(agg) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    plantOrder.forEach(plant => {
        const d = agg[plant.code];
        const pctUp = formatPercent(d.upToDate, d.total);
        const pctTidak = formatPercent(d.tidakUpToDate, d.total);
        const lastDateStr = formatDate(d.lastDate);
        const colorClass = d.total === 0 ? 'bg-black' : getLogbookClass(d.lastDate);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-left">${d.wilayah}</td>
            <td style="font-weight: 600;">${d.code}</td>
            <td class="text-left">${d.desc}</td>
            <td>${d.vehCodes.size}</td>
            <td>${d.hk}</td>
            <td>${d.rencana}</td>
            <td>${d.upToDate}</td>
            <td>${d.tidakUpToDate}</td>
            <td>${d.total}</td>
            <td>${pctUp}</td>
            <td>${pctTidak}</td>
            <td class="${colorClass}">${lastDateStr}</td>
            <td style="font-weight: 600;">${d.rank}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Check if there is data on a specific date (for calendar highlight)
function hasDataOnDate(date) {
    if (!globalTransactions || globalTransactions.length === 0) return false;
    return globalTransactions.some(row => {
        if (row['Cancelled/Reversed']) return false;
        const vDateStr = row['Vehicle Date'] || row['Tgl Angkut'];
        if (!vDateStr) return false;
        const vDate = excelDateToJSDate(vDateStr);
        return vDate && 
               vDate.getDate() === date.getDate() && 
               vDate.getMonth() === date.getMonth() && 
               vDate.getFullYear() === date.getFullYear();
    });
}

// Generate Calendar Days
function generateCalendar(year, month) {
    const calendarDays = document.getElementById('calendarDays');
    if (!calendarDays) return;
    calendarDays.innerHTML = '';
    
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();
    
    // Overflow previous month days
    for(let i = firstDay - 1; i >= 0; i--) {
        const day = prevTotalDays - i;
        const dDiv = document.createElement('div');
        dDiv.className = 'calendar-day prev-month';
        dDiv.textContent = day;
        calendarDays.appendChild(dDiv);
    }
    
    // Current month days
    for(let i = 1; i <= totalDays; i++) {
        const dDiv = document.createElement('div');
        dDiv.className = 'calendar-day';
        dDiv.textContent = i;
        
        const thisDate = new Date(year, month, i);
        
        // Highlight active date select
        if (selectedDate && 
            thisDate.getDate() === selectedDate.getDate() && 
            thisDate.getMonth() === selectedDate.getMonth() && 
            thisDate.getFullYear() === selectedDate.getFullYear()) {
            dDiv.classList.add('selected');
        }
        
        // Highlight days with transaction logs
        if (hasDataOnDate(thisDate)) {
            dDiv.classList.add('has-data');
        }
        
        dDiv.addEventListener('click', () => {
            selectedDate = thisDate;
            const prevSel = calendarDays.querySelector('.selected');
            if (prevSel) prevSel.classList.remove('selected');
            dDiv.classList.add('selected');
            updateDailyView();
        });
        
        calendarDays.appendChild(dDiv);
    }
    
    // Overflow next month days
    const totalCells = firstDay + totalDays;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for(let i = 1; i <= remaining; i++) {
        const dDiv = document.createElement('div');
        dDiv.className = 'calendar-day next-month';
        dDiv.textContent = i;
        calendarDays.appendChild(dDiv);
    }
}

// Populate Dropdown filter with valid plants
function populatePlantDropdown() {
    const dropdown = document.getElementById('plantFilter');
    if (!dropdown) return;
    dropdown.innerHTML = '<option value="all">Semua Plant</option>';
    
    plantOrder.forEach(p => {
        const option = document.createElement('option');
        option.value = p.code;
        option.textContent = `${p.code} - ${p.desc}`;
        dropdown.appendChild(option);
    });
}

// Filter and render daily input log list based on active conditions
function updateDailyView() {
    const label = document.getElementById('selectedDateLabel');
    if (label) label.textContent = formatDayLabel(selectedDate);
    
    const tbody = document.getElementById('dailyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const plantFilterValue = document.getElementById('plantFilter').value;
    const searchQuery = document.getElementById('logSearch').value.toLowerCase().trim();
    
    // Filter records
    const filtered = globalTransactions.filter(row => {
        // Date match check
        const vDateStr = row['Vehicle Date'] || row['Tgl Angkut'];
        if (!vDateStr) return false;
        const vDate = excelDateToJSDate(vDateStr);
        const dateMatch = vDate && 
                          vDate.getDate() === selectedDate.getDate() && 
                          vDate.getMonth() === selectedDate.getMonth() && 
                          vDate.getFullYear() === selectedDate.getFullYear();
        if (!dateMatch) return false;
        
        // Plant filter match check
        if (plantFilterValue !== 'all' && row['Plant'] !== plantFilterValue) return false;
        
        // Search query text match check (Vehicle Code, Remarks, Plant, job code)
        if (searchQuery) {
            const vehicle = (row['Vehicle Code'] || '').toString().toLowerCase();
            const remarks = (row['Remarks'] || '').toString().toLowerCase();
            const pCode = (row['Plant'] || '').toString().toLowerCase();
            if (!vehicle.includes(searchQuery) && 
                !remarks.includes(searchQuery) && 
                !pCode.includes(searchQuery)) {
                return false;
            }
        }
        
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-icon">
                        <svg width="48" height="48" fill="none" stroke="#ccc" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <p>Tidak ada data input untuk tanggal ini.</p>
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(row => {
        const vDateStr = row['Vehicle Date'] || row['Tgl Angkut'];
        const vDate = excelDateToJSDate(vDateStr);
        const dateFormatted = formatDate(vDate);
        
        const status = row['Cancelled/Reversed'] ? 'Batal' : 'Aktif';
        const statusClass = row['Cancelled/Reversed'] ? 'style="color: red; font-weight:600;"' : 'style="color: green; font-weight:600;"';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateFormatted}</td>
            <td style="font-weight:600;">${row['Plant'] || '-'}</td>
            <td>${row['Vehicle Code'] || '-'}</td>
            <td ${statusClass}>${status}</td>
            <td>${row['HM/KM'] || '0.00'}</td>
            <td>${row['Remarks'] || '-'}</td>
            <td>
                <button class="act-btn btn-template" style="padding: 2px 6px; margin: 0;">Detail</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Dom initializers
document.addEventListener('DOMContentLoaded', () => {
    // Topbar live clock run
    setInterval(() => {
        const clock = document.getElementById('topbarClock');
        if (clock) {
            const now = new Date();
            const formatString = now.toLocaleString('id-ID', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).replace('pukul ', '');
            clock.textContent = formatString;
        }
    }, 1000);

    // Sidebar collapsible trigger
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('collapseBtn');
    const menuToggle = document.getElementById('menuToggle');
    
    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // Navigation Tab switches logic
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            if (!tabId) return;

            // Remove active states
            menuItems.forEach(mi => mi.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

            // Set current active state
            item.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // Calendar navigation arrows
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        generateCalendar(currentYear, currentMonth);
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        generateCalendar(currentYear, currentMonth);
    });

    // Dropdown and Search filters trigger
    document.getElementById('plantFilter').addEventListener('change', updateDailyView);
    document.getElementById('logSearch').addEventListener('input', updateDailyView);

    // Master Data filters trigger
    const eqSearch = document.getElementById('equipmentSearch');
    const eqUnit = document.getElementById('unitFilter');
    const eqKepemilikan = document.getElementById('kepemilikanFilter');

    if (eqSearch) eqSearch.addEventListener('input', updateEquipmentView);
    if (eqUnit) eqUnit.addEventListener('change', updateEquipmentView);
    if (eqKepemilikan) eqKepemilikan.addEventListener('change', updateEquipmentView);

    // Initial render call with empty placeholders
    renderMonthlyTable(plantOrder.reduce((acc, p) => {
        acc[p.code] = { ...p, vehCodes: new Set(), rencana: 0, upToDate: 0, tidakUpToDate: 0, total: 0, lastDate: null, rank: '-' };
        return acc;
    }, {}));
    generateCalendar(currentYear, currentMonth);
    populatePlantDropdown();
    
    // Master data initial run
    if (typeof equipmentData !== 'undefined') {
        activeEquipmentData = [...equipmentData];
        populateUnitDropdown();
        updateEquipmentView();
        
        // Coba sinkronisasi otomatis dari Google Spreadsheet
        updateFromGSheet();
    }

    // Master Data file upload listener (Upload Otomatis ke Google Drive Kebun Terkait)
    const eqUpload = document.getElementById('equipmentUpload');
    if (eqUpload) {
        eqUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const filenameLower = file.name.toLowerCase();
            let matchedUnit = "";
            
            const units = Object.keys(unitDriveLinks);
            for (let u of units) {
                if (filenameLower.includes(u.toLowerCase())) {
                    matchedUnit = u;
                    break;
                }
            }

            if (matchedUnit) {
                const driveLink = unitDriveLinks[matchedUnit];
                const folderIdMatch = driveLink.match(/\/folders\/([a-zA-Z0-9-_]+)/);
                if (folderIdMatch) {
                    const folderId = folderIdMatch[1];
                    uploadFileToGDrive(file, matchedUnit, folderId);
                } else {
                    alert(`Gagal mengekstrak ID folder Google Drive dari link unit ${matchedUnit}.`);
                }
            } else {
                alert(`File "${file.name}" terdeteksi. Namun nama unit tidak ditemukan dari nama file Anda.\n\nTabel web tidak diperbarui.`);
            }
            
            // Clear input agar file yang sama bisa di-select kembali
            eqUpload.value = '';
        });
    }

    // Excel File Upload Listener
    const fileInput = document.getElementById('excelUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            if (fileNameDisplay) fileNameDisplay.textContent = file.name;

            const reader = new FileReader();
            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array', cellDates: true});
                
                // Fetch first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Parse excel data to json array
                const json = XLSX.utils.sheet_to_json(worksheet);
                globalTransactions = json;
                processData(json);
            };
            reader.readAsArrayBuffer(file);
        });
    }
});

// Master Data Google Drive links mapping
const unitDriveLinks = {
    "Gunung Meliau": "https://drive.google.com/drive/folders/1xonQxdT0ouxPVL2_FSV2Zr7L03xHzZFB?usp=drive_link",
    "Gunung Mas": "https://drive.google.com/drive/folders/1HuqTZGu8pmPqUz9R5hwIgxyfR_ejSf73?usp=drive_link",
    "Sungai Dekan": "https://drive.google.com/drive/folders/1PzeTz4lUC-kwWdLK4beB1BZVPbV8MLAg?usp=drive_link",
    "Rimba Belian": "https://drive.google.com/drive/folders/1Y6UX3ULMFUhO1PA1WXORKb9rCkHyOHR3?usp=drive_link",
    "Sintang": "https://drive.google.com/drive/folders/1iZQ2r_wPNsL1fc15DNpcNrL_B1fRzl5q?usp=drive_link",
    "Ngabang": "https://drive.google.com/drive/folders/1P5cjaD-evUGvXGywRkLgjndu06e1kwab?usp=drive_link",
    "Parindu": "https://drive.google.com/drive/folders/1RZqo8eqOcrq2nv0lzDgi6Xgj9_C7YeX_?usp=drive_link",
    "Kembayan": "https://drive.google.com/drive/folders/1I0ZomzyrPVwFnCjeH-w3XCwVb3HelJrJ?usp=drive_link",
    "Danau Salak": "https://drive.google.com/drive/folders/1bTJ7889RSUlN7-_STzbyBOrx62yUcxuW?usp=drive_link",
    "Kumai": "https://drive.google.com/drive/folders/1eFbbASq-mpeMaJIVn8x91QgKQTKZN-kS?usp=drive_link",
    "Batu Licin": "https://drive.google.com/drive/folders/1rrZwDoUcljMpV7uqLSQqWSjoBQZMf7WL?usp=drive_link",
    "Pamukan": "https://drive.google.com/drive/folders/1YtHg5hemGfvRXziZswoZzg_3QQdRYlW7?usp=drive_link",
    "Pelaihari": "https://drive.google.com/drive/folders/16hIhKNE1gCMTDq5jhA_oiNPkBacCDLZW?usp=drive_link",
    "Tabara": "https://drive.google.com/drive/folders/1PjFOoLXbORGnGSHE-KR1ETlbKb4TRFJV?usp=drive_link",
    "Tajati": "https://drive.google.com/drive/folders/109-fcLCoLEgA4XATB99euD1DnJiXCY7v?usp=drive_link",
    "Pandawa": "https://drive.google.com/drive/folders/1O7-DsbuT7wBHXyyu9Sh5dceZr4Tjibus?usp=drive_link",
    "Longkali": "https://drive.google.com/drive/folders/15cGPTpzTplaRGboyopV-tgwdDHiyGJro?usp=drive_link",
    "PKS Gunung Meliau": "https://drive.google.com/drive/folders/1Td3RmPbyIzRnwMM2-wFqg8ZHQEZlztiH?usp=drive_link",
    "PKS Rimba Belian": "https://drive.google.com/drive/folders/1x6B7Zfq-D0ucLN6tFRK1hGq3Vo0P8UqR?usp=drive_link",
    "PKS Ngabang": "https://drive.google.com/drive/folders/171V-_3V-zEjWgl0m9W_8HQsPJkHfrbVE?usp=drive_link",
    "PKS Parindu": "https://drive.google.com/drive/folders/1mCS3UgW_sDfI3IX3NeqKCuYupymTqcXI?usp=drive_link",
    "PKS Kembayan": "https://drive.google.com/drive/folders/1JSxZxTaD9-WUnV4z4eGgKi4ieURGh7ye?usp=drive_link",
    "PKS Pamukan": "https://drive.google.com/drive/folders/17RLXeOGVHJXkzUHIsHQPCHyrkwIeYeIZ?usp=drive_link",
    "PKS Pelaihari": "https://drive.google.com/drive/folders/1uK9_pBUck2dz21_sJl30HWeJw0ZKbekr?usp=drive_link",
    "Tambarangan": "https://drive.google.com/drive/folders/1qXXe-dl3eZfgK3OTH278Pc-Ytiwvnl-S?usp=drive_link",
    "PKS Samuntai": "https://drive.google.com/drive/folders/1UjU1OOJLqXKxoB0c5yiUySEWm7kB28ow?usp=drive_link",
    "PKS Longpinang": "https://drive.google.com/drive/folders/18UP7quYFbY1ltMmKqrmXQxPZK5tBI2_4?usp=drive_link",
    "Distrik Kalimantan Barat": "https://drive.google.com/drive/folders/1NehhM54pJpuoSOUlF3RslXdbqQZTMHFr?usp=sharing",
    "DIstrik Kalimantan Barat": "https://drive.google.com/drive/folders/1NehhM54pJpuoSOUlF3RslXdbqQZTMHFr?usp=sharing",
    "Distrik Kalimantan Timur": "https://drive.google.com/drive/folders/1lIPcVNxN2mZ1V4CR09q7lhi17pSLkyLq?usp=sharing",
    "Distrik Kalimantan Selatan": "https://drive.google.com/drive/folders/1PSXUokWe-xdQRLhUtAh7z1M7gpB30_fo?usp=sharing"
};

// Master Data functions
function populateUnitDropdown() {
    const dropdown = document.getElementById('unitFilter');
    if (!dropdown) return;
    
    // Clear and reset dropdown
    dropdown.innerHTML = '<option value="all">Semua Unit/Kerja</option>';
    
    // Calculate counts per unit
    const unitCounts = {};
    activeEquipmentData.forEach(item => {
        if (item.unit) {
            unitCounts[item.unit] = (unitCounts[item.unit] || 0) + 1;
        }
    });
    
    // Get unique units
    const units = [...new Set(activeEquipmentData.map(item => item.unit))].filter(Boolean);
    units.sort();
    
    units.forEach(u => {
        const option = document.createElement('option');
        option.value = u;
        option.textContent = `${u} (${unitCounts[u] || 0})`;
        dropdown.appendChild(option);
    });
}

function updateEquipmentView() {
    const tbody = document.getElementById('equipmentTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const searchVal = document.getElementById('equipmentSearch').value.toLowerCase().trim();
    const unitVal = document.getElementById('unitFilter').value;
    const kepemilikanVal = document.getElementById('kepemilikanFilter').value;
    
    const filtered = activeEquipmentData.filter(item => {
        // Unit Filter
        if (unitVal !== 'all' && item.unit !== unitVal) return false;
        
        // Kepemilikan Filter
        if (kepemilikanVal !== 'all' && item.kepemilikan !== kepemilikanVal) return false;
        
        // Search
        if (searchVal) {
            const name = (item.name || '').toLowerCase();
            const num = (item.number || '').toLowerCase();
            const cc = (item.cost_center || '').toLowerCase();
            const unit = (item.unit || '').toLowerCase();
            if (!name.includes(searchVal) && !num.includes(searchVal) && !cc.includes(searchVal) && !unit.includes(searchVal)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Calculate counts per unit from activeEquipmentData
    const unitCounts = {};
    activeEquipmentData.forEach(item => {
        if (item.unit) {
            unitCounts[item.unit] = (unitCounts[item.unit] || 0) + 1;
        }
    });

    // Update count indicator
    const counter = document.getElementById('totalEquipmentCount');
    if (counter) counter.textContent = filtered.length;
    
    const footerCounter = document.getElementById('equipmentTotalFooter');
    if (footerCounter) footerCounter.textContent = filtered.length;
    
    let prevUnit = "";
    let prevNo = "";
    
    filtered.forEach(item => {
        let unitDisplay = item.unit;
        let noDisplay = item.no;
        
        // Excel group styling: only hide duplicates if no search is active
        if (!searchVal && unitVal === 'all') {
            if (item.unit === prevUnit) {
                unitDisplay = "";
                noDisplay = "";
            } else {
                prevUnit = item.unit;
                prevNo = item.no;
            }
        }
        
        let unitDisplayHtml = unitDisplay;
        if (unitDisplay) {
            const driveLink = unitDriveLinks[unitDisplay] || "#";
            const count = unitCounts[unitDisplay] || 0;
            unitDisplayHtml = `<a href="${driveLink}" target="_blank" class="unit-link" style="color: #3182ce; text-decoration: none; border-bottom: 1px dashed #3182ce;">${unitDisplay} (${count})</a>`;
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="border: 1px solid var(--border-color); text-align: center; font-weight: 600; padding: 3px 6px; background-color: ${unitDisplay ? '#f7fafc' : 'transparent'};">${unitDisplayHtml}</td>
            <td style="border: 1px solid var(--border-color); text-align: center; padding: 3px 6px;">${item.name || '-'}</td>
            <td style="border: 1px solid var(--border-color); text-align: center; padding: 3px 6px; font-family: monospace;">${item.number || '-'}</td>
            <td style="border: 1px solid var(--border-color); text-align: center; padding: 3px 6px; font-family: monospace;">${item.cost_center || '-'}</td>
            <td style="border: 1px solid var(--border-color); text-align: center; padding: 3px 6px;">${item.ket_vhc || '-'}</td>
            <td style="border: 1px solid var(--border-color); text-align: center; padding: 3px 6px;">${item.status || '-'}</td>
            <td style="border: 1px solid var(--border-color); text-align: center; padding: 3px 6px; font-weight: 500;">${item.kepemilikan || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function parseBAEquipmentExcel(rows, filename) {
    let headerIdx = -1;
    // Scan rows to find the main headers row dynamically
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.some(cell => cell && cell.toString().trim().toUpperCase() === 'NAMA EQUIPMENT')) {
            headerIdx = i;
            break;
        }
    }
    
    if (headerIdx === -1) {
        alert("Format Excel BA Equipment tidak dikenali. Pastikan terdapat kolom 'NAMA EQUIPMENT'.");
        return;
    }
    
    const headers = rows[headerIdx].map(h => (h || '').toString().trim());
    const parsedData = [];
    
    let currentUnit = "";
    let currentNo = "";
    
    // Build column map index
    const colMap = {
        no: headers.findIndex(h => h.toUpperCase() === 'NO'),
        unit: headers.findIndex(h => h.toUpperCase() === 'UNIT/KERJA' || h.toUpperCase() === 'UNIT / KERJA'),
        name: headers.findIndex(h => h.toUpperCase() === 'NAMA EQUIPMENT'),
        number: headers.findIndex(h => h.toUpperCase() === 'NOMOR EQUIPMENT' || h.toUpperCase() === 'NOMOR'),
        costCenter: headers.findIndex(h => h.toUpperCase() === 'REVISI COST CENTER' || h.toUpperCase() === 'COST CENTER'),
        ketCc: headers.findIndex(h => h.toUpperCase() === 'KET CC'),
        ketVhc: headers.findIndex(h => h.toUpperCase() === 'KET VHC'),
        status: headers.findIndex(h => h.toUpperCase() === 'STATUS KENDARAAN' || h.toUpperCase() === 'STATUS'),
        kepemilikan: headers.findIndex(h => h.toUpperCase() === 'KEPEMILIKAN')
    };

    for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const eqName = colMap.name !== -1 ? row[colMap.name] : null;
        const eqNum = colMap.number !== -1 ? row[colMap.number] : null;
        
        if (!eqName && !eqNum) continue; // Skip empty spacing rows
        
        let no = colMap.no !== -1 && row[colMap.no] ? row[colMap.no].toString().trim() : '';
        let unit = colMap.unit !== -1 && row[colMap.unit] ? row[colMap.unit].toString().trim() : '';
        
        // Group logic for blank cells
        if (unit) {
            currentUnit = unit;
            currentNo = no;
        } else {
            unit = currentUnit;
            no = currentNo;
        }
        
        const ketVhc = colMap.ketVhc !== -1 && row[colMap.ketVhc] ? row[colMap.ketVhc].toString().trim() : '';
        if (!ketVhc.toLowerCase().includes('aktif')) continue; // Skip if not active!

        parsedData.push({
            no: no,
            unit: unit,
            name: eqName ? eqName.toString().trim() : '',
            number: eqNum ? eqNum.toString().trim() : '',
            cost_center: colMap.costCenter !== -1 && row[colMap.costCenter] ? row[colMap.costCenter].toString().trim() : '',
            ket_cc: colMap.ketCc !== -1 && row[colMap.ketCc] ? row[colMap.ketCc].toString().trim() : '',
            ket_vhc: ketVhc,
            status: colMap.status !== -1 && row[colMap.status] ? row[colMap.status].toString().trim() : '',
            kepemilikan: colMap.kepemilikan !== -1 && row[colMap.kepemilikan] ? row[colMap.kepemilikan].toString().trim() : ''
        });
    }
    
    // Update active state
    activeEquipmentData = parsedData;
    
    // Update subtitle label
    const subtitle = document.getElementById('masterDataSubtitle');
    if (subtitle) subtitle.textContent = `BA Equipment Ter-update dari: ${filename}`;
    
    // Redraw
    populateUnitDropdown();
    updateEquipmentView();
}

async function parsePDF(file) {
    const subtitle = document.getElementById('masterDataSubtitle');
    try {
        if (subtitle) subtitle.textContent = "Membaca file PDF...";
        const arrayBuffer = await file.arrayBuffer();
        
        // Setup PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Reconstruct rows by Y coordinates (group closely aligned text)
            const items = textContent.items;
            const linesMap = {};
            
            items.forEach(item => {
                const y = Math.round(item.transform[5] * 2) / 2;
                if (!linesMap[y]) linesMap[y] = [];
                linesMap[y].push(item);
            });
            
            const sortedYs = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
            
            sortedYs.forEach(y => {
                const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
                const lineText = lineItems.map(item => item.str).join(" ");
                if (lineText.trim()) {
                    fullText += lineText + "\n";
                }
            });
        }
        
        // Check if the PDF is scanned / empty text (photo PDF)
        if (fullText.trim().length < 50) {
            if (subtitle) subtitle.textContent = "Mendeteksi PDF Foto/Scanned. Memulai Proses OCR (Membaca Gambar)... Mohon tunggu...";
            
            let ocrText = "";
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                if (subtitle) subtitle.textContent = `Memproses OCR Halaman ${pageNum} dari ${pdf.numPages}...`;
                
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 }); // High scale for better OCR accuracy
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                
                // Run Tesseract OCR on the page canvas
                const result = await Tesseract.recognize(canvas, 'eng');
                ocrText += result.data.text + "\n";
            }
            fullText = ocrText;
        }
        
        parseEquipmentText(fullText, file.name);
    } catch (err) {
        console.error("Gagal membaca PDF:", err);
        if (subtitle) subtitle.textContent = "Gagal membaca file PDF.";
        alert("Gagal membaca file PDF. Silakan periksa kembali file Anda.");
    }
}

function parseEquipmentText(text, filename) {
    const lines = text.split('\n');
    const parsedData = [];
    
    const knownUnits = [
        "Gunung Meliau", "Gunung Mas", "Sungai Dekan", "Rimba Belian", "Sintang", "Ngabang", "Parindu", 
        "Kembayan", "Danau Salak", "Komoditi Kelapa Sawit", "Komoditi Karet", "PKS Gunung Meliau", 
        "PKS Rimba Belian", "PKS Ngabang", "PKS Parindu", "PKS Kembayan", "PKS Pamukan", "PKS Pelaihari", 
        "Tambarangan", "PKS Samuntai", "PKS Longpinang", "Distrik Kalimantan Barat", "Distrik Kalimantan Timur", 
        "Distrik Kalimantan Selatan", "DIstrik Kalimantan Barat", "Kumai", "Batu Licin", "Pamukan", "Pelaihari", "Tabara", "Tajati", "Pandawa", "Longkali"
    ];
    
    let currentUnit = "";
    let currentNo = "";
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // Find 10-digit number
        const numMatch = line.match(/(\d{10})/);
        if (numMatch) {
            const number = numMatch[1];
            const parts = line.split(number);
            const left = parts[0].trim();
            const right = parts[1] ? parts[1].trim() : '';
            
            let no = "";
            let unit = "";
            let name = "";
            
            // Parse left side
            const noMatch = left.match(/^(\d+)\s+(.+)$/);
            if (noMatch) {
                no = noMatch[1];
                const rem = noMatch[2].trim();
                let foundUnit = false;
                for (let u of knownUnits) {
                    if (rem.startsWith(u)) {
                        unit = u;
                        name = rem.substring(u.length).trim();
                        currentUnit = u;
                        currentNo = no;
                        foundUnit = true;
                        break;
                    }
                }
                if (!foundUnit) {
                    name = rem;
                    unit = currentUnit;
                    no = currentNo;
                }
            } else {
                let foundUnit = false;
                for (let u of knownUnits) {
                    if (left.startsWith(u)) {
                        unit = u;
                        name = left.substring(u.length).trim();
                        currentUnit = u;
                        currentNo = "";
                        foundUnit = true;
                        break;
                    }
                }
                if (!foundUnit) {
                    name = left;
                    unit = currentUnit;
                    no = currentNo;
                }
            }
            
            // Parse right side
            const rightTokens = right.split(/\s+/).filter(Boolean);
            const costCenter = rightTokens[0] || '';
            const tailTokens = rightTokens.slice(1);
            const tailStr = tailTokens.join(" ");
            
            let kepemilikan = "";
            let status = "";
            let ketVhc = "";
            let ketCc = "";
            
            // Parse Kepemilikan
            const kepMatch = tailStr.match(/(Sewa KKS|Sewa P3BB|Sewa Raren|Sewa|Inventaris|Perusahaan|Pinjam)$/);
            let remTail = tailStr;
            if (kepMatch) {
                kepemilikan = kepMatch[1];
                remTail = tailStr.substring(0, tailStr.length - kepemilikan.length).trim();
            }
            
            // Parse Status
            const statMatch = remTail.match(/(Baik \(Rusak Gardan Depan\)|Rusak\/Perbaikan|Rusak Berat|Perlu dilakukan perbaikan|Jalan \/ Rem Tidak Berfungsi|Jalan \/ Double Tidak berfungsi|Jalan \/ Unit Sudah Tua|Rusak \/ Hidrolik Pump|Jalan \/ Vibrator tidak berfungsi|Jalan \/ Rusak Garda Depan|Patah dudukan pisau|Jalan \/ Baik|Baik|Rusak|Perbaikan|Jalan|Mati|Bak)$/);
            let remTail2 = remTail;
            if (statMatch) {
                status = statMatch[1];
                remTail2 = remTail.substring(0, remTail.length - status.length).trim();
            }
            
            // Parse Ket VHC
            const vhcMatch = remTail2.match(/(Tidak Ada BA|Aktif p3bb|929 Beban Operasi Lain|5D01AU17UG|5F11SU0402|Sewa KKS|Aktif|Mati)$/);
            let remTail3 = remTail2;
            if (vhcMatch) {
                ketVhc = vhcMatch[1];
                remTail3 = remTail2.substring(0, remTail2.length - ketVhc.length).trim();
            }
            
            ketCc = remTail3;
            
            if (!ketVhc.toLowerCase().includes('aktif')) return; // Skip if not active!

            parsedData.push({
                no: no,
                unit: unit,
                name: name,
                number: number,
                cost_center: costCenter,
                ket_cc: ketCc,
                ket_vhc: ketVhc,
                status: status,
                kepemilikan: kepemilikan
            });
        }
    });
    
    if (parsedData.length === 0) {
        alert("Gagal mengekstrak data dari PDF. Pastikan format tabel di PDF terbaca dengan jelas.");
        return;
    }
    
    activeEquipmentData = parsedData;
    
    const subtitle = document.getElementById('masterDataSubtitle');
    if (subtitle) {
        subtitle.textContent = `BA Equipment Ter-update dari (PDF): ${filename}`;
    }
    
    populateUnitDropdown();
    updateEquipmentView();
}

async function updateFromGSheet() {
    const webAppUrl = "https://script.google.com/macros/s/AKfycby9cdSmdLmJ1tV1V2EsmOx8clW2gvEG-IjB0Oe8wEx56dO8Y8TiQ0Hful0IbXHvBZ8-/exec";
    const subtitle = document.getElementById('masterDataSubtitle');
    
    if (subtitle) subtitle.textContent = "Sinkronisasi otomatis dengan Google Spreadsheet...";
    
    try {
        const res = await fetch(webAppUrl);
        if (!res.ok) throw new Error("Gagal mengambil data dari Google Apps Script");
        const rows = await res.json();
        
        parseBAEquipmentExcel(rows, "Google Spreadsheet (Live Sync)");
        if (subtitle) subtitle.textContent = "Master Data ter-update otomatis dari Google Spreadsheet secara live!";
    } catch (err) {
        console.warn("Error saat sinkronisasi Google Sheet via Apps Script:", err);
        if (subtitle) {
            subtitle.textContent = "BA Equipment (Lokal - Gagal Sinkronisasi Google Sheet)";
        }
    }
}

function uploadFileToGDrive(file, unitName, folderId) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${yyyy}${mm}${dd}`;
    const newFilename = `${datePrefix}_${file.name}`;

    const subtitle = document.getElementById('masterDataSubtitle');
    if (subtitle) {
        subtitle.innerHTML = `<span style="color: #2b6cb0; font-weight: 600;">Mengunggah "${newFilename}" otomatis ke Google Drive ${unitName}... Mohon tunggu...</span>`;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const base64Data = e.target.result; // this is data:...;base64,...
            const webAppUrl = "https://script.google.com/macros/s/AKfycby9cdSmdLmJ1tV1V2EsmOx8clW2gvEG-IjB0Oe8wEx56dO8Y8TiQ0Hful0IbXHvBZ8-/exec";
            
            const payload = {
                folderId: folderId,
                filename: newFilename,
                mimeType: file.type || "application/octet-stream",
                base64Data: base64Data
            };
            
            // Gunakan fetch POST (Google Apps Script mendukung CORS jika dideploy sebagai Versi Baru dengan doPost)
            const response = await fetch(webAppUrl, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            if (result.status === "success") {
                if (subtitle) {
                    subtitle.innerHTML = `<span style="color: #38a169; font-weight: 600;">✔ Berhasil mengunggah otomatis ke Google Drive ${unitName}! <a href="${result.fileUrl}" target="_blank" style="color: #2b6cb0; text-decoration: underline; font-weight: 500;">Buka File</a></span>`;
                }
                
                // Tampilkan modal pop-up sukses dengan link langsung ke file
                showUploadSuccessModal(unitName, result.fileUrl || unitDriveLinks[unitName], newFilename);
            } else {
                throw new Error(result.message || "Gagal menyimpan file di Drive.");
            }
        } catch (err) {
            console.error("Gagal upload ke Google Drive via Fetch:", err);
            if (subtitle) subtitle.textContent = "Gagal mengunggah otomatis ke Google Drive.";
            
            alert(
                `GAGAL UNGGAH OTOMATIS!\n\n` +
                `Penyebab: Google Apps Script Anda kemungkinan belum menyimpan fungsi 'doPost' atau belum diterapkan sebagai 'Versi Baru'.\n\n` +
                `Solusi:\n` +
                `1. Buka kembali halaman Google Apps Script Anda.\n` +
                `2. Pastikan seluruh kode sudah diganti dengan kode terbaru yang ada fungsi 'doPost'.\n` +
                `3. Klik tombol biru 'Terapkan' (Deploy) -> 'Kelola penerapan' (Manage deployments).\n` +
                `4. Klik ikon Pensil (Edit) di kanan atas, ganti pilihan Versi menjadi 'Versi Baru' (New Version).\n` +
                `5. Klik tombol 'Terapkan' (Deploy) untuk mengaktifkan pembaruan script.\n\n` +
                `Pesan Error: ${err.message || "Failed to fetch (CORS/Authentication)"}`
            );
        }
    };
    reader.readAsDataURL(file);
}

function showUploadSuccessModal(unitName, folderUrl, filename) {
    // Bersihkan modal lama jika ada
    const existing = document.getElementById('uploadSuccessModal');
    if (existing) document.body.removeChild(existing);
    
    const modal = document.createElement('div');
    modal.id = 'uploadSuccessModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';
    
    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; max-width: 450px; width: 90%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.15); font-family: 'Segoe UI', Roboto, sans-serif; animation: modalFadeIn 0.3s ease;">
            <div style="width: 60px; height: 60px; background-color: #e6fffa; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 15px;">
                <svg width="32" height="32" fill="none" stroke="#319795" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h4 style="margin: 0 0 10px; color: #2d3748; font-size: 18px; font-weight: 600;">Unggah Otomatis Berhasil!</h4>
            <p style="margin: 0 0 20px; color: #718096; font-size: 14px; line-height: 1.5; text-align: left;">
                File <strong>"${filename}"</strong> telah berhasil diunggah secara otomatis ke folder Google Drive Unit <strong>${unitName}</strong>.
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <a href="${folderUrl}" target="_blank" style="display: block; width: 100%; padding: 10px 0; background-color: #319795; color: white; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px rgba(49, 151, 149, 0.2); transition: background-color 0.2s; text-align: center;">
                    Buka Folder Google Drive ${unitName}
                </a>
                <button onclick="document.body.removeChild(document.getElementById('uploadSuccessModal'))" style="width: 100%; padding: 10px 0; background-color: #edf2f7; color: #4a5568; border: none; border-radius: 6px; font-weight: 500; font-size: 14px; cursor: pointer; transition: background-color 0.2s;">
                    Tutup
                </button>
            </div>
        </div>
        <style>
            @keyframes modalFadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
        </style>
    `;
    
    document.body.appendChild(modal);
}

// ============================================================
// BERITA ACARA FEATURE
// ============================================================

// Mapping plant code -> Google Sheet GID in spreadsheet
// Spreadsheet: https://docs.google.com/spreadsheets/d/1qnUO7cv0QkgcmbHfbKqtuxrNBvRAvW1Pis_lNe-bH9Q
// Update GID di bawah ini sesuai dengan tab masing-masing unit di spreadsheet
const baSpreadsheetId = "1qnUO7cv0QkgcmbHfbKqtuxrNBvRAvW1Pis_lNe-bH9Q";
const baPlantGidMap = {
    "5E01": "1303884220",  // KEBUN GUNUNG MELIAU
    "5E02": "2135738591",  // KEBUN GUNUNG MAS
    "5E03": "1517696568",  // KEBUN SUNGAI DEKAN
    "5E04": "497071386",   // KEBUN RIMBA BELIAN
    "5E06": "1160889375",  // KEBUN SINTANG
    "5E07": "963639228",   // KEBUN NGABANG
    "5E08": "1219696675",  // KEBUN PARINDU
    "5E09": "950761709",   // KEBUN KEMBAYAN
    "5E11": "1674828736",  // KEBUN DANAU SALAK
    "5E12": "1887172657",  // KEBUN KUMAI KARET
    "5E13": "1266359771",  // KEBUN BATULICIN
    "5E14": "384993858",   // KEBUN PAMUKAN
    "5E15": "1997746437",  // KEBUN PELAIHARI
    "5E16": "1178360160",  // KEBUN TABARA
    "5E17": "670595830",   // KEBUN TAJATI
    "5E18": "226029537",   // KEBUN PANDAWA
    "5E19": "118697651",   // KEBUN LONGKALI
    "5F01": "837306200",   // PABRIK GUNUNG MELIAU
    "5F04": "1166270100",  // PABRIK RIMBA BELIAN
    "5F07": "516903064",   // PABRIK NGABANG
    "5F08": "942213141",   // PABRIK PARINDU
    "5F09": "121172532",   // PABRIK KEMBAYAN
    "5F11": "1037474081",  // UNIT PROYEK BATU BARA
    "5F14": "249921846",   // PABRIK PAMUKAN
    "5F15": "1819863835",  // PABRIK PELAIHARI
    "5F20": "1343055326",  // PKR TAMBARANGAN
    "5F21": "1007069224",  // PABRIK SAMUNTAI
    "5F22": "1097123651",  // PABRIK LONG PINANG
    "5D01": "1199608937",  // DISTRIK KALBAR
    "5D02": "1122696923",  // DISTRIK KALTIM
    "5D03": "1042534132",  // DISTRIK KALSELTENG
};

function loadGoogleSheetJSONP(url) {
    return new Promise((resolve, reject) => {
        const callbackName = "gvizCallback_" + Math.round(100000 * Math.random());
        window[callbackName] = function(data) {
            resolve(data);
            delete window[callbackName];
            if (document.getElementById(scriptId)) {
                document.body.removeChild(document.getElementById(scriptId));
            }
        };
        
        const scriptId = "jsonp_gviz_" + callbackName;
        const separator = url.includes('?') ? '&' : '?';
        const jsonpUrl = url + separator + "tqx=responseHandler:" + callbackName;
        
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = jsonpUrl;
        script.onerror = (err) => {
            reject(new Error("Gagal mengambil data dari Google Sheets. Pastikan spreadsheet Anda memiliki izin akses 'Siapa saja yang memiliki link'."));
            delete window[callbackName];
            if (document.getElementById(scriptId)) {
                document.body.removeChild(document.getElementById(scriptId));
            }
        };
        
        document.body.appendChild(script);
    });
}

async function loadBeritaAcara() {
    const selectorVal = document.getElementById('baUnitSelector').value;
    const statusMsg = document.getElementById('baStatusMsg');
    const baContent = document.getElementById('baContent');
    const editLink = document.getElementById('baEditLink');

    if (editLink) {
        editLink.style.display = "none";
    }

    if (!selectorVal) {
        statusMsg.textContent = "⚠ Silakan pilih unit terlebih dahulu.";
        statusMsg.style.color = "#dd6b20";
        return;
    }

    // Parse "UnitName|PlantCode" format
    const parts = selectorVal.split('|');
    const unitName = parts[0] || selectorVal;
    const plantCode = parts[1] || '';

    const gid = baPlantGidMap[plantCode] || "1303884220";
    const jsonpUrl = `https://docs.google.com/spreadsheets/d/${baSpreadsheetId}/gviz/tq?tq=&gid=${gid}&_ts=${Date.now()}`;

    statusMsg.textContent = `⏳ Memuat data ${plantCode ? '['+plantCode+'] ' : ''}${unitName}...`;
    statusMsg.style.color = "#3182ce";
    baContent.innerHTML = `<div style="text-align:center;padding:60px 0;color:#a0aec0;">Memuat data Berita Acara ${unitName}...</div>`;

    try {
        const data = await loadGoogleSheetJSONP(jsonpUrl);
        
        if (!data || !data.table || !data.table.rows) {
            throw new Error("Data Google Sheets kosong atau tidak valid.");
        }

        const rows = data.table.rows.map(r => {
            if (!r || !r.c) return [];
            return r.c.map(cell => {
                if (!cell) return "";
                return cell.f !== undefined ? String(cell.f) : (cell.v !== undefined ? String(cell.v) : "");
            });
        });

        renderBeritaAcara(data, unitName, plantCode);
        statusMsg.textContent = `✔ Data Berita Acara ${plantCode ? '['+plantCode+'] ' : ''}${unitName} berhasil dimuat.`;
        statusMsg.style.color = "#38a169";

        // Tampilkan link edit ke spreadsheet langsung ke sheet unit bersangkutan
        if (editLink) {
            editLink.href = `https://docs.google.com/spreadsheets/d/${baSpreadsheetId}/edit?gid=${gid}#gid=${gid}`;
            editLink.style.display = "inline-flex";
        }
    } catch (err) {
        statusMsg.textContent = `❌ Gagal memuat: ${err.message}`;
        statusMsg.style.color = "#e53e3e";
        baContent.innerHTML = `<div style="text-align:center;padding:60px;color:#e53e3e;">${err.message}<br><br>Langkah Solusi:<br>1. Buka Google Sheets Anda.<br>2. Klik tombol <strong>Bagikan (Share)</strong>.<br>3. Di bagian Akses Umum, ubah menjadi <strong>"Siapa saja yang memiliki link"</strong> sebagai <strong>Pengakses Lihat-saja (Viewer) / Editor</strong>.</div>`;
    }
}

function renderBeritaAcara(data, unitName, plantCode) {
    const baContent = document.getElementById('baContent');

    if (!data || !data.table || !data.table.rows) {
        baContent.innerHTML = `<div style="text-align:center;padding:60px;color:#e53e3e;">Data tidak valid.</div>`;
        return;
    }

    const rows = data.table.rows.map(r => {
        if (!r || !r.c) return [];
        return r.c.map(cell => {
            if (!cell) return "";
            return cell.f !== undefined ? String(cell.f) : (cell.v !== undefined ? String(cell.v) : "");
        });
    });

    const cols = data.table.cols;
    const headerText = cols[1]?.label || '';

    // Extract meta info from the rolled-up header label using robust boundary matches
    let nomorBA = '';
    const noMatch = headerText.match(/Nomor\s*:\s*(.*?)\s*Perihal/i);
    if (noMatch) {
        nomorBA = "Nomor: " + noMatch[1].trim();
    } else {
        // Fallback to today's date format if not found
        const today = new Date();
        const monthRoman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][today.getMonth()];
        const year = today.getFullYear();
        nomorBA = `Nomor: &nbsp;&nbsp;&nbsp;/BA/ M-02/${monthRoman}/${year}`;
    }

    let perihal = '';
    const perihalMatch = headerText.match(/Perihal\s*:\s*(.*?)\s*Pada hari ini/i);
    if (perihalMatch) {
        perihal = perihalMatch[1].trim();
    } else {
        perihal = `Equipment Aktif Di Unit ${unitName.toUpperCase()}`;
    }

    let pembukaan = '';
    const pembukaanMatch = headerText.match(/(Pada hari ini.*?)\s*(?:No|Nama Equipment|No Equipment)/i);
    if (pembukaanMatch) {
        pembukaan = pembukaanMatch[1].trim();
    } else {
        pembukaan = `Pada hari ini bertempat di Kantor Unit ${unitName}, telah dilaksanakan inventarisasi equipment (kendaraan dan mesin) yang masih aktif atau masih dalam perbaikan, adapun hasil inventaris dengan rincian sebagai berikut:`;
    }

    // Find signature block boundary (usually starts with "Dibuat Oleh" or similar)
    let tableEnd = rows.length;
    for (let i = 0; i < rows.length; i++) {
        const rowText = rows[i].join(' ').trim();
        if (rowText.match(/Dibuat Oleh|Demikian/i)) {
            tableEnd = i;
            break;
        }
    }

    // Parse equipment data (starts from index 0 because headers are stripped by Gviz)
    const equipmentRows = [];
    for (let i = 0; i < tableEnd; i++) {
        const row = rows[i];
        if (!row || row.length < 7) continue;
        const name = row[2] || '';
        const noEq = row[3] || '';
        const cc = row[4] || '';
        const status = row[5] || '';
        const kepemilikan = row[6] || '';
        const no = row[1] || '';
        if (!name || name.length < 2) continue;
        equipmentRows.push({ no, name, noEq, cc, status, kepemilikan });
    }

    // Extract signature details from rows starting from tableEnd
    let sigBuat = 'Dibuat Oleh,', sigKetahui = 'Diketahui Oleh,';
    let jabatanBuat = 'Asisten Teknik', jabatanKetahui = 'Manajer';
    let namaBuat = '(______________)', namaKetahui = '(______________)';

    for (let i = tableEnd; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 6) continue;
        const leftVal = (row[2] || '').trim();
        const rightVal = (row[5] || '').trim();

        if (leftVal.toLowerCase().includes('dibuat oleh')) {
            sigBuat = leftVal;
            sigKetahui = rightVal || 'Diketahui Oleh,';
        } else if (leftVal.toLowerCase().includes('asisten') || leftVal.toLowerCase().includes('astk') || leftVal.toLowerCase().includes('teknik')) {
            jabatanBuat = leftVal;
            jabatanKetahui = rightVal || 'Manajer';
        } else if (leftVal.startsWith('(') && leftVal.endsWith(')')) {
            namaBuat = leftVal;
            namaKetahui = rightVal || '(______________)';
        }
    }

    // Build HTML matching the exact layout, colors, and fonts of the spreadsheet
    const tableRowsHtml = equipmentRows.map((eq, idx) => `
        <tr>
            <td style="border: 1px solid #000000; border-left: none; padding: 5px 8px; text-align: center; vertical-align: middle;">${eq.no || (idx+1)}</td>
            <td style="border: 1px solid #000000; padding: 5px 8px; vertical-align: middle; text-align: left;">${eq.name}</td>
            <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center; vertical-align: middle; font-family: monospace;">${eq.noEq}</td>
            <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center; vertical-align: middle; font-family: monospace;">${eq.cc}</td>
            <td style="border: 1px solid #000000; padding: 5px 8px; text-align: center; vertical-align: middle;">${eq.status}</td>
            <td style="border: 1px solid #000000; border-right: none; padding: 5px 8px; text-align: center; vertical-align: middle;">${eq.kepemilikan}</td>
        </tr>
    `).join('');

    const formattedUnitName = perihal.replace(/^Equipment Aktif Di Unit/i, '').trim();

    baContent.innerHTML = `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.6; color: #000000; border: 2.2px solid #000000; padding: 0; background-color: #ffffff; max-width: 800px; min-height: 1030px; display: flex; flex-direction: column; margin: 0 auto; box-sizing: border-box;">
            
            <!-- Header Title Box (merged row 2-3) -->
            <div style="text-align: center; border-bottom: 1.5px solid #000000; padding: 16px; font-weight: bold; background-color: #ffffff; margin: 0;">
                <div style="font-size: 15px; text-decoration: underline; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">
                    BERITA ACARA INVENTARISASI EQUIPMENT SAP
                </div>
                <div style="font-size: 13px;">
                    ${nomorBA}
                </div>
            </div>

            <!-- Perihal Box (merged row 5) -->
            <div style="border-bottom: 1.5px solid #000000; padding: 10px 16px; font-weight: bold; text-align: left; margin: 0;">
                Perihal : ${perihal}
            </div>

            <!-- Pembukaan Box (merged row 7) -->
            <div style="border-bottom: 1.5px solid #000000; padding: 16px; text-align: justify; text-justify: inter-word; margin: 0;">
                ${pembukaan}
            </div>

            <!-- Blank Row 8 & 9 (Spacing before table) -->
            <div style="height: 15px;"></div>

            <!-- Equipment Table (merged row 10-17) -->
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin: 0; border-top: 1.5px solid #000000; border-bottom: 1.5px solid #000000; border-left: none; border-right: none;">
                <thead>
                    <tr style="background-color: #ffc000; font-weight: bold; color: #000000;">
                        <th style="border: 1px solid #000000; border-left: none; padding: 8px; text-align: center; width: 45px; vertical-align: middle;">No</th>
                        <th style="border: 1px solid #000000; padding: 8px; text-align: center; vertical-align: middle;">Nama Equipment</th>
                        <th style="border: 1px solid #000000; padding: 8px; text-align: center; width: 125px; vertical-align: middle;">No Equipment</th>
                        <th style="border: 1px solid #000000; padding: 8px; text-align: center; width: 110px; vertical-align: middle;">Cost Center</th>
                        <th style="border: 1px solid #000000; padding: 8px; text-align: center; width: 100px; vertical-align: middle;">Status Kendaraan</th>
                        <th style="border: 1px solid #000000; border-right: none; padding: 8px; text-align: center; width: 100px; vertical-align: middle;">Kepemilikan</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml || `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #888888; border-bottom: none;">Tidak ada data equipment ditemukan di sheet ini.</td></tr>`}
                </tbody>
            </table>

            <!-- Blank Row 18 (Spacing before penutup) -->
            <div style="height: 15px;"></div>

            <!-- Penutup Box (merged row 19-20) -->
            <div style="border-top: 1.5px solid #000000; border-bottom: 1.5px solid #000000; padding: 16px; text-align: justify; text-justify: inter-word; margin: 0;">
                Demikian Berita Acara ini dibuat dan sejak ditandatanganinya Berita Acara ini maka manajemen unit <strong>${formattedUnitName || unitName}</strong> bertanggung jawab atas keakuratan data tersebut diatas.
            </div>

            <!-- Spacer before signatures (equivalent to row 21-22 blank space) -->
            <div style="height: 25px;"></div>

            <!-- Signatures Block (merged row 23-30) -->
            <div style="padding: 0 30px 30px 30px; margin-top: auto; margin-bottom: 0;">
                <div style="display: flex; justify-content: space-around; text-align: center; width: 100%;">
                    <div style="min-width: 220px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 130px;">
                        <div>
                            <div style="font-weight: bold; font-size: 13px;">${sigBuat}</div>
                            <div style="font-size: 12px;">${jabatanBuat}</div>
                        </div>
                        <div style="width: 180px; font-weight: bold; font-size: 13px; padding-bottom: 2px;">
                            ${namaBuat}
                        </div>
                    </div>
                    <div style="min-width: 220px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 130px;">
                        <div>
                            <div style="font-weight: bold; font-size: 13px;">${sigKetahui}</div>
                            <div style="font-size: 12px;">${jabatanKetahui}</div>
                        </div>
                        <div style="width: 180px; font-weight: bold; font-size: 13px; padding-bottom: 2px;">
                            ${namaKetahui}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer text (outside sheet boundary, row 32) -->
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #002060; font-weight: bold; max-width: 800px; margin: 10px auto 0; padding-left: 2px; text-align: left;">
            AKHLAK-Amanah, Kompeten, Harmonis, Loyal, Adaptif, Kolaboratif-PTPN XIII Bangkit
        </div>
    `;
}

