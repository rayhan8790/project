/**
 * app.js
 * Core Navigation & State Management untuk MetalTools Lab
 */

const MetalToolsApp = (() => {
    const AppState = {
        studentName: "Siswa Praktikan",
        score: 0,
        ppeEquipped: [],
        currentScene: "home",
        isK3Passed: false
    };

    let scenes = [];
    let navButtons = [];
    let modalK3 = null;
    let closeModalBtns = [];

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
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const init = () => {
        scenes = document.querySelectorAll('.scene');
        navButtons = document.querySelectorAll('button[data-scene], a[data-scene]');
        modalK3 = document.getElementById('k3-error-modal');
        closeModalBtns = document.querySelectorAll('[data-close-modal], .modal-close');

        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.currentTarget.getAttribute('data-scene');
                
                if (targetId !== 'home' && targetId !== 'k3' && !AppState.isK3Passed) {
                    if (modalK3 && typeof modalK3.showModal === 'function') {
                        modalK3.showModal();
                    } else {
                        alert("PERHATIAN: Pengecekan K3 belum lengkap! Lengkapi APD terlebih dahulu.");
                    }
                    return;
                }

                navigateTo(targetId);
            });
        });

        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('dialog');
                if (modal && typeof modal.close === 'function') {
                    modal.close();
                }
            });
        });

        console.log("[Sistem] MetalTools Lab berhasil diinisialisasi.");
    };

    document.addEventListener('DOMContentLoaded', init);

    return {
        getState: () => AppState,
        updateState: (key, value) => { AppState[key] = value; },
        navigateTo: navigateTo
    };
})();