/**
 * app.js
 * Core Navigation & State Management untuk MetalTools Lab
 */

const MetalToolsApp = (() => {
    const AppState = {
        studentName: "Siswa Praktikan",
        score: 0,
        ppeEquipped: [],
        jobCard: "",
        currentScene: "home",
        isK3Passed: false
    };

    let scenes = [];
    let navButtons = [];
    let modalK3 = null;
    let closeModalBtns = [];
    let k3Form = null;

    const showK3Warning = () => {
        if (modalK3 && typeof modalK3.showModal === 'function') {
            if (!modalK3.open) modalK3.showModal();
        } else {
            alert("PERHATIAN: Pengecekan K3 belum lengkap! Lengkapi APD terlebih dahulu.");
        }
    };

    const navigateTo = (sceneId) => {
        const targetScene = document.getElementById(`scene-${sceneId}`);

        if (!targetScene) {
            console.error(`[Navigasi Error] Scene dengan ID 'scene-${sceneId}' tidak ditemukan!`);
            return;
        }

        scenes.forEach(scene => {
            scene.classList.add('hidden');
            scene.classList.remove('is-active');
        });

        targetScene.classList.remove('hidden');
        targetScene.classList.add('is-active');

        AppState.currentScene = sceneId;

        navButtons.forEach(btn => {
            if (btn.getAttribute('data-scene') === sceneId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const content = document.querySelector('.content');
        if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /**
     * Verifikasi K3.
     * Ini yang sebelumnya tidak ada: tanpa preventDefault(), form melakukan
     * submit bawaan browser -> halaman reload -> seluruh state hilang.
     */
    const handleK3Submit = (event) => {
        event.preventDefault();

        const allApd = Array.from(k3Form.querySelectorAll('input[name="apd"]'));
        const checkedApd = allApd.filter(cb => cb.checked);

        // Syarat lulus dihitung dari jumlah checkbox yang benar-benar ada di DOM,
        // bukan angka 5 yang di-hardcode, supaya tidak pecah kalau APD ditambah.
        if (checkedApd.length < allApd.length) {
            showK3Warning();
            return;
        }

        AppState.ppeEquipped = checkedApd.map(cb => cb.value);
        const nameField = document.getElementById('student-name');
        AppState.studentName = (nameField && nameField.value.trim()) || 'Siswa Praktikan';
        const jobCardField = document.getElementById('job-card');
        AppState.jobCard = jobCardField ? jobCardField.value.trim() : "";
        AppState.isK3Passed = true;
        AppState.score += 25;

        setNavLockState();
        navigateTo('ukur');
    };

    /** Penanda visual: tahap terkunci sebelum K3 lulus. */
    const setNavLockState = () => {
        navButtons.forEach(btn => {
            const target = btn.getAttribute('data-scene');
            if (!target || target === 'home' || target === 'k3') return;
            if (btn.classList.contains('nav-link')) {
                const locked = !AppState.isK3Passed;
                btn.style.opacity = locked ? '0.55' : '';
                btn.title = locked ? 'Terkunci — selesaikan Pengecekan K3 terlebih dahulu' : '';
            }
        });
    };

    const init = () => {
        scenes = document.querySelectorAll('.scene');
        navButtons = document.querySelectorAll('button[data-scene], a[data-scene]');
        modalK3 = document.getElementById('k3-error-modal');
        closeModalBtns = document.querySelectorAll('[data-close-modal], .modal-close');
        k3Form = document.getElementById('k3-form');

        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.currentTarget.getAttribute('data-scene');

                if (targetId !== 'home' && targetId !== 'k3' && !AppState.isK3Passed) {
                    showK3Warning();
                    return;
                }

                navigateTo(targetId);
            });
        });

        if (k3Form) {
            k3Form.addEventListener('submit', handleK3Submit);
        } else {
            console.error("[Sistem] Form K3 (#k3-form) tidak ditemukan.");
        }

        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('dialog');
                if (modal && typeof modal.close === 'function') {
                    modal.close();
                }
            });
        });

        setNavLockState();
        console.log("[Sistem] MetalTools Lab berhasil diinisialisasi.");
    };

    document.addEventListener('DOMContentLoaded', init);

    return {
        getState: () => AppState,
        updateState: (key, value) => { AppState[key] = value; },
        addScore: (points) => { AppState.score += points; },
        navigateTo: navigateTo
    };
})();