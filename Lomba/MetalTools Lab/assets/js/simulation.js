/**
 * simulation.js
 * Versi Brute Force: Mengabaikan Router & Memaksa Tampilan Secara Manual
 */

(function() {
    const forceShowMeasurement = () => {
        // 1. Sembunyikan SEMUA halaman yang ada di aplikasi
        const allSections = document.querySelectorAll('section, .view, .page, main > div');
        allSections.forEach(section => {
            section.style.display = 'none';
        });

        // 2. Cari halaman Pengukuran dengan mencari elemen yang mengandung kata "ukur" atau "measurement"
        // Kita gunakan querySelectorAll untuk mencari ID/Class yang relevan
        const targets = document.querySelectorAll('[id*="ukur"], [class*="ukur"], [id*="measurement"], [id*="Measurement"]');
        
        let found = false;
        targets.forEach(target => {
            // Paksa tampil dengan CSS !important
            target.style.setProperty('display', 'block', 'important');
            target.classList.add('active');
            found = true;
        });

        if (!found) {
            console.error("Elemen Pengukuran tidak ditemukan. Coba refresh halaman.");
        } else {
            console.log("Halaman Pengukuran dipaksa tampil!");
            alert("Sistem berhasil dipintas! Memasuki Lab Pengukuran.");
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const k3Btn = document.querySelector('button[type="submit"]');
        if (k3Btn) {
            k3Btn.addEventListener('click', (e) => {
                // Biarkan validasi standar berjalan dulu
                const checked = document.querySelectorAll('input[type="checkbox"]:checked');
                if (checked.length < 5) return; 

                // Tunda 200ms agar aplikasi menyelesaikan animasi/prosesnya
                setTimeout(forceShowMeasurement, 200);
            });
        }
    });
})();