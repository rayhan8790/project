/**
 * simulation.js
 * Logika interaktif + penggerak visual SVG tiap tahap.
 *
 * CATATAN: versi awal berisi hack "brute force" yang memaksa scene tampil lewat
 * inline style. Cara itu mematikan router di app.js dan tidak pernah menandai K3
 * lulus. Navigasi kini sepenuhnya ditangani app.js.
 */

(function () {
    const state = {
        caliper: 0,
        weldingGauge: 0,
        tools: [],
        cut: null
    };

    const fmt = (v, d) => v.toFixed(d).replace('.', ',');
    const el = (id) => document.getElementById(id);
    const svgNS = 'http://www.w3.org/2000/svg';

    const svgEl = (tag, attrs) => {
        const node = document.createElementNS(svgNS, tag);
        Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
        return node;
    };

    /* =====================================================================
       TAHAP 02 — PENGUKURAN
       ===================================================================== */

    const CAL = { x0: 72, pxPerMm: 3.2, max: 150 };   // 150 mm -> 480 px

    /** Skala 1 mm pada batang + skala nonius pada rahang geser. */
    const buildCaliperScale = () => {
        const scale = el('cal-scale');
        const vernier = el('cal-vernier');
        if (!scale || !vernier) return;

        for (let mm = 0; mm <= CAL.max; mm++) {
            const x = CAL.x0 + mm * CAL.pxPerMm;
            const major = mm % 10 === 0;
            const medium = mm % 5 === 0;
            scale.appendChild(svgEl('line', {
                x1: x, y1: 76, x2: x, y2: major ? 90 : medium ? 85 : 81,
                stroke: '#39454e', 'stroke-width': major ? 1.6 : 0.9
            }));
            if (major && mm % 20 === 0) {
                const t = svgEl('text', {
                    x: x, y: 99, fill: '#2b3841', 'font-size': 9,
                    'font-family': 'Inter, Arial, sans-serif', 'text-anchor': 'middle'
                });
                t.textContent = mm;
                scale.appendChild(t);
            }
        }

        // 10 garis nonius (0,9 mm) di badan rahang geser
        for (let i = 0; i <= 10; i++) {
            const x = 8 + i * (0.9 * CAL.pxPerMm);
            vernier.appendChild(svgEl('line', { x1: x, y1: 92, x2: x, y2: i % 5 === 0 ? 104 : 99 }));
        }
    };

    const renderCaliper = (mm) => {
        const slider = el('cal-slider');
        if (!slider) return;

        const w = mm * CAL.pxPerMm;
        const edge = CAL.x0 + w;
        slider.setAttribute('transform', `translate(${w}, 0)`);

        const part = el('cal-part');
        part.setAttribute('width', Math.max(w, 0));
        part.setAttribute('opacity', mm > 0.05 ? 1 : 0);

        el('cal-dim-line').setAttribute('x2', edge);
        el('cal-dim-b').setAttribute('x1', edge);
        el('cal-dim-b').setAttribute('x2', edge);

        const label = el('cal-dim-label');
        label.textContent = `${fmt(mm, 2)} mm`;
        // jaga label tetap di dalam kanvas
        label.setAttribute('x', Math.min(CAL.x0 + w / 2 - 34, 520));
    };

    const WELD = { pxPerMm: 8.5, baseY: 150, leftX: 200, rightX: 244 };

    const renderWeldGauge = (mm) => {
        const left = el('weld-left');
        if (!left) return;

        const leg = mm * WELD.pxPerMm;
        const { baseY, leftX, rightX } = WELD;
        const bulge = leg * 0.14;   // muka las sedikit cembung, bukan cekung

        left.setAttribute('d',
            `M ${leftX} ${baseY} L ${leftX - leg} ${baseY} Q ${leftX - leg * 0.5 - bulge} ${baseY - leg * 0.5 - bulge} ${leftX} ${baseY - leg} Z`);
        el('weld-right').setAttribute('d',
            `M ${rightX} ${baseY} L ${rightX + leg} ${baseY} Q ${rightX + leg * 0.5 + bulge} ${baseY - leg * 0.5 - bulge} ${rightX} ${baseY - leg} Z`);

        // garis kaki teoretis (yang dibaca gauge) + throat tegak lurus dari akar
        el('weld-blade').setAttribute('points', `${leftX - leg},${baseY} ${leftX},${baseY - leg}`);
        const throat = el('weld-throat-line');
        throat.setAttribute('x2', leftX - leg * 0.5);
        throat.setAttribute('y2', baseY - leg * 0.5);

        el('weld-dim-v').setAttribute('y2', baseY - leg);
        el('weld-dim-v-top').setAttribute('y1', baseY - leg);
        el('weld-dim-v-top').setAttribute('y2', baseY - leg);
        el('weld-dim-h').setAttribute('x2', leftX - leg);
        el('weld-dim-h-end').setAttribute('x1', leftX - leg);
        el('weld-dim-h-end').setAttribute('x2', leftX - leg);

        el('weld-label').textContent = `kaki las ${fmt(mm, 1)} mm`;
        el('weld-throat').textContent = fmt(mm * 0.707, 1);   // throat = 0,707 x kaki (las sudut sama kaki)
    };

    const initMeasurement = () => {
        const cSlider = el('caliper-slider');
        const cRead = el('caliper-reading');
        const wSlider = el('welding-slider');
        const wRead = el('welding-reading');

        buildCaliperScale();

        if (cSlider && cRead) {
            const sync = () => {
                state.caliper = parseFloat(cSlider.value);
                cRead.textContent = `${fmt(state.caliper, 2)} mm`;
                renderCaliper(state.caliper);
            };
            cSlider.addEventListener('input', sync);
            sync();
        }

        if (wSlider && wRead) {
            const sync = () => {
                state.weldingGauge = parseFloat(wSlider.value);
                wRead.textContent = `${fmt(state.weldingGauge, 1)} mm`;
                renderWeldGauge(state.weldingGauge);
            };
            wSlider.addEventListener('input', sync);
            sync();
        }
    };

    /* =====================================================================
       TAHAP 03 — PERKAKAS
       ===================================================================== */

    const TOOL_ICON = {
        'Gerinda Tangan 4 Inch': 'tool-grinder',
        'Kunci Pas Set': 'tool-wrench',
        'Mistar Baja 30cm': 'tool-rule'
    };

    const renderWorkbench = (zone) => {
        if (state.tools.length === 0) {
            zone.innerHTML = '<div><strong>Meja Kerja Virtual</strong><span>Seret atau klik perkakas untuk meletakkannya di sini</span></div>';
            return;
        }

        const slots = state.tools.map((name, i) => {
            const icon = TOOL_ICON[name] || 'tool-wrench';
            const y = 74 + i * 46;
            return `<use href="#${icon}" x="26" y="${y}" width="140" height="70"/>
                    <text x="180" y="${y + 40}" fill="#e8ecee" font-family="Inter, Arial, sans-serif" font-size="13">${name}</text>`;
        }).join('');

        zone.innerHTML = `<div class="bench-wrap">
            <svg class="viz viz-bench" viewBox="0 0 400 230" role="img" aria-label="Perkakas yang diletakkan di meja kerja">
                <rect x="8" y="8" width="384" height="52" fill="#1d2b36" stroke="#3b4a56"/>
                <g fill="#0f1620">
                    <circle cx="40" cy="24" r="4"/><circle cx="70" cy="24" r="4"/><circle cx="100" cy="24" r="4"/>
                    <circle cx="40" cy="44" r="4"/><circle cx="70" cy="44" r="4"/><circle cx="100" cy="44" r="4"/>
                </g>
                <text x="130" y="38" fill="#b8c1c6" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700">MEJA KERJA — ALAT SIAP PAKAI</text>
                <rect x="8" y="62" width="384" height="160" fill="#2c3a45" stroke="#3b4a56"/>
                ${slots}
            </svg>
        </div>`;
    };

    const initTools = () => {
        const zone = el('workbench');
        const info = el('tool-info');
        const buttons = document.querySelectorAll('#tool-list .tool');
        if (!zone || buttons.length === 0) return;

        // meja kerja punya isi terstruktur, bukan grid tengah
        zone.style.display = 'block';
        zone.style.padding = '.75rem';

        const addTool = (name) => {
            if (!name || state.tools.includes(name)) return;
            state.tools.push(name);
            renderWorkbench(zone);
            const btn = document.querySelector(`#tool-list .tool[data-tool="${name}"]`);
            if (btn) btn.classList.add('is-picked');
        };

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (info && btn.dataset.desc) info.textContent = `${btn.dataset.tool} — ${btn.dataset.desc}`;
                addTool(btn.dataset.tool);
            });
            btn.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', btn.dataset.tool || '');
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            addTool(e.dataTransfer.getData('text/plain'));
        });

        renderWorkbench(zone);
    };

    /* =====================================================================
       TAHAP 04 — PEMOTONGAN PLASMA (visual + animasi + bunyi)
       ===================================================================== */

    /**
     * PERINGATAN: seluruh angka di bawah adalah heuristik pembelajaran supaya
     * simulasi memberi umpan balik — BUKAN data dari standar, WPS, atau cutting
     * chart produsen. Ganti dengan tabel mesin yang Anda pakai sebelum dinilai.
     */
    const IDEAL = { currentMin: 55, currentMax: 85, speedMin: 350, speedMax: 700 };
    const PLATE_MM = 10;

    // Zona 1 = tampak samping (arah potong). Zona 2 = potongan melintang.
    const Z1 = { top: 140, bottom: 210, x0: 78, x1: 592, lengthMm: 250 };
    const PL = { cx: 320, top: 288, bottom: 358, pxPerMm: 7, nozzleY: 118 };

    const gradeCut = (current, speed) => {
        const notes = [];
        let score = 100;

        if (current < IDEAL.currentMin) { score -= 30; notes.push('Arus terlalu rendah: potongan berisiko tidak tembus penuh.'); }
        else if (current > IDEAL.currentMax) { score -= 20; notes.push('Arus terlalu tinggi: kerf melebar dan consumable cepat habis.'); }

        if (speed < IDEAL.speedMin) { score -= 25; notes.push('Kecepatan terlalu lambat: dross menumpuk di bawah dan zona panas melebar.'); }
        else if (speed > IDEAL.speedMax) { score -= 25; notes.push('Kecepatan terlalu cepat: busur tertinggal, tepi miring atau gagal tembus.'); }

        if (notes.length === 0) notes.push('Kombinasi arus dan kecepatan berada di rentang latihan yang wajar.');

        const label = score >= 85 ? 'Baik' : score >= 60 ? 'Perlu Perbaikan' : 'Tidak Memenuhi';
        return { score: Math.max(score, 0), label, notes };
    };

    /** Turunan geometri potongan dari parameter (ilustratif). */
    const cutGeometry = (amp, speed) => {
        const kerf = 1.0 + (amp - 20) / 100 * 2.4;                     // mm
        const lag = Math.max(0, (speed - IDEAL.speedMax) / 300);        // busur tertinggal
        const bevelDeg = Math.min(1.5 + lag * 9, 12);                   // derajat
        const slow = Math.max(0, (IDEAL.speedMin - speed) / 250);
        const hot = Math.max(0, (amp - IDEAL.currentMax) / 35);
        const dross = Math.min(slow * 0.75 + hot * 0.35, 1);            // 0..1
        const haz = Math.min(slow * 0.6 + hot * 0.4, 1);
        const noPenetration = amp < IDEAL.currentMin - 12 || speed > IDEAL.speedMax + 220;
        return { kerf, bevelDeg, dross, haz, lag, noPenetration };
    };

    /* ---------------------------------------------------------------
       BUNYI — disintesis Web Audio API, tanpa file audio eksternal.
       AudioContext baru dibuat setelah klik pengguna (aturan autoplay).
       --------------------------------------------------------------- */
    const Sfx = (() => {
        let ctx = null, master = null, noiseBuf = null, live = null;
        let muted = false;
        let volume = 0.45;   // 0..1; nilai wajar untuk speaker laptop

        const supported = () => typeof (window.AudioContext || window.webkitAudioContext) === 'function';

        const ensure = () => {
            if (!supported()) return null;
            if (!ctx) {
                const Ctor = window.AudioContext || window.webkitAudioContext;
                ctx = new Ctor();
                master = ctx.createGain();
                master.gain.value = muted ? 0 : volume;
                master.connect(ctx.destination);
            }
            if (ctx.state === 'suspended') ctx.resume();
            return ctx;
        };

        const noise = () => {
            if (!noiseBuf) {
                const len = ctx.sampleRate * 2;
                noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
                const d = noiseBuf.getChannelData(0);
                for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            }
            const src = ctx.createBufferSource();
            src.buffer = noiseBuf;
            src.loop = true;
            return src;
        };

        /** Letupan busur pilot saat penyalaan. */
        const pilot = () => {
            if (!ensure()) return;
            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1400, t);
            osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);
            g.gain.setValueAtTime(0.13, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
            osc.connect(g).connect(master);
            osc.start(t); osc.stop(t + 0.16);
        };

        /** Desis busur berkelanjutan; nada mengikuti arus, getar mengikuti laju. */
        const startArc = (amp, speed) => {
            if (!ensure()) return;
            stopArc(0.02);
            const t = ctx.currentTime;

            const hiss = noise();
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 700 + amp * 12;
            bp.Q.value = 0.7;
            const hissGain = ctx.createGain();
            hissGain.gain.setValueAtTime(0, t);
            hissGain.gain.linearRampToValueAtTime(0.05 + (amp / 120) * 0.11, t + 0.12);

            const rumble = ctx.createOscillator();
            rumble.type = 'sawtooth';
            rumble.frequency.value = 62 + amp * 0.25;
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 220;
            const rumbleGain = ctx.createGain();
            rumbleGain.gain.setValueAtTime(0, t);
            rumbleGain.gain.linearRampToValueAtTime(0.05, t + 0.15);

            // getar amplitudo: makin lambat laju, makin terasa denyutnya
            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 6 + (1000 - speed) / 120;
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 0.028;
            lfo.connect(lfoGain).connect(hissGain.gain);

            hiss.connect(bp).connect(hissGain).connect(master);
            rumble.connect(lp).connect(rumbleGain).connect(master);
            hiss.start(t); rumble.start(t); lfo.start(t);
            live = { hiss, rumble, lfo, hissGain, rumbleGain };
        };

        const stopArc = (fade = 0.18) => {
            if (!ctx || !live) return;
            const t = ctx.currentTime;
            const { hiss, rumble, lfo, hissGain, rumbleGain } = live;
            [hissGain, rumbleGain].forEach(g => {
                g.gain.cancelScheduledValues(t);
                g.gain.setValueAtTime(g.gain.value, t);
                g.gain.linearRampToValueAtTime(0.0001, t + fade);
            });
            [hiss, rumble, lfo].forEach(n => { try { n.stop(t + fade + 0.02); } catch (_) {} });
            live = null;
        };

        /** Bunyi logam saat pemotongan selesai. */
        const clank = () => {
            if (!ensure()) return;
            const t = ctx.currentTime + 0.05;
            const src = noise();
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 2400;
            bp.Q.value = 7;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.11, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            src.connect(bp).connect(g).connect(master);
            src.start(t); src.stop(t + 0.32);
        };

        /* ---- bunyi antarmuka: nada pendek, semuanya disintesis ---- */

        /** Nada pendek. `at` = offset detik dari sekarang, `glide` = frekuensi tujuan. */
        const blip = (freq, dur, type, vol, at = 0, glide = null) => {
            if (!ensure()) return;
            const t = ctx.currentTime + at;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(vol, t + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            osc.connect(g).connect(master);
            osc.start(t); osc.stop(t + dur + 0.02);
        };

        /** Letupan noise terfilter — memberi kesan mekanis pada bunyi klik. */
        const burst = (freq, q, dur, vol, at = 0) => {
            if (!ensure()) return;
            const t = ctx.currentTime + at;
            const src = noise();
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = freq;
            bp.Q.value = q;
            const g = ctx.createGain();
            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(bp).connect(g).connect(master);
            src.start(t); src.stop(t + dur + 0.02);
        };

        // pembatas agar klik cepat berturut-turut tidak menumpuk jadi bising
        const lastAt = {};
        const throttled = (name, minGap, fn) => {
            const now = performance.now();
            if (lastAt[name] && now - lastAt[name] < minGap) return;
            lastAt[name] = now;
            fn();
        };

        /** Klik tombol umum. */
        const click = () => throttled('click', 40, () => {
            burst(1800, 2.2, 0.035, 0.05);
            blip(160, 0.055, 'sine', 0.035);
        });

        /** Perpindahan menu / scene — lebih ringan dan lebih tinggi. */
        const clack = () => throttled('clack', 40, () => {
            burst(2700, 3, 0.028, 0.042);
            blip(340, 0.05, 'triangle', 0.026);
        });

        /** Centang APD: nada naik saat dicentang, turun saat dilepas. */
        const tick = (on) => throttled('tick', 30, () => {
            blip(on ? 1180 : 720, 0.05, 'square', 0.028);
        });

        /** Konfirmasi berhasil — dua nada naik. */
        const chime = () => throttled('chime', 200, () => {
            blip(660, 0.11, 'triangle', 0.05, 0);
            blip(880, 0.16, 'triangle', 0.045, 0.09);
        });

        /** Penolakan / tindakan terkunci. */
        const buzz = () => throttled('buzz', 200, () => {
            blip(190, 0.2, 'square', 0.05, 0, 110);
        });

        const applyGain = () => {
            if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02);
        };

        const setMuted = (v) => { muted = v; applyGain(); };

        /** ratio 0..1 */
        const setVolume = (ratio) => {
            volume = Math.min(Math.max(ratio, 0), 1);
            applyGain();
        };

        let broken = false;
        /**
         * Pembungkus pelindung. Bila AudioContext gagal dibuat (mesin tanpa
         * perangkat audio, browser menolak, dsb.) bunyinya dilewati saja —
         * animasi visual tidak boleh ikut mati karenanya.
         */
        const safe = (fn) => (...args) => {
            if (broken) return;
            try {
                fn(...args);
            } catch (err) {
                broken = true;
                console.warn('[Bunyi] dinonaktifkan, audio tidak tersedia:', err && err.message);
                const btn = document.getElementById('sound-toggle');
                if (btn) { btn.disabled = true; btn.textContent = '🔇 Audio tidak tersedia'; }
            }
        };

        return {
            click: safe(click),
            clack: safe(clack),
            tick: safe(tick),
            chime: safe(chime),
            buzz: safe(buzz),
            pilot: safe(pilot),
            startArc: safe(startArc),
            stopArc: safe(stopArc),
            clank: safe(clank),
            setMuted: safe(setMuted),
            setVolume: safe(setVolume),
            isMuted: () => muted,
            getVolume: () => volume,
            supported: () => { try { return supported() && !broken; } catch (_) { return false; } }
        };
    })();

    /* ---------------------------------------------------------------
       Gambar keadaan potongan
       --------------------------------------------------------------- */

    /** Zona 1: celah terpotong sampai posisi torch (progress 0..1). */
    const renderSlot = (progress, g) => {
        const { top, bottom, x0, x1 } = Z1;
        const x = x0 + (x1 - x0) * progress;
        const depth = g.noPenetration ? (bottom - top) * 0.62 : (bottom - top);
        const yEnd = top + depth;

        el('pl-torch').setAttribute('transform', `translate(${x.toFixed(1)},0)`);
        el('pl-slot').setAttribute('d', `M ${x0} ${top} H ${x} V ${yEnd} H ${x0} Z`);
        el('pl-slot-edge').setAttribute('x1', x);
        el('pl-slot-edge').setAttribute('x2', x);
        el('pl-slot-edge').setAttribute('y2', yEnd);

        // garis drag: makin cepat laju, makin miring ke belakang
        const drag = el('pl-drag');
        drag.innerHTML = '';
        const lagPx = 6 + g.lag * 34;
        for (let px = x0 + 14; px < x - 4; px += 18) {
            drag.appendChild(svgEl('path', {
                d: `M ${px} ${top} Q ${px - lagPx * 0.4} ${top + depth * 0.55} ${px - lagPx} ${yEnd}`
            }));
        }

        // dross menumpuk di sepanjang tepi bawah yang sudah terpotong
        const dross = el('pl-dross-side');
        dross.innerHTML = '';
        if (!g.noPenetration && g.dross > 0.08) {
            for (let px = x0 + 10; px < x - 4; px += 16) {
                const r = 2.5 + g.dross * 4.5 + (px % 3);
                dross.appendChild(svgEl('ellipse', { cx: px, cy: bottom + 2, rx: r, ry: r * 0.65 }));
            }
        }
        return x;
    };

    /** Percikan di titik busur (koordinat relatif terhadap torch). */
    const renderSparks = (amp, active, g) => {
        const box = el('pl-sparks');
        box.innerHTML = '';
        if (!active) return;
        const yTop = Z1.bottom + 6;   // tepat di bawah pelat
        const n = Math.round((amp / 120) * 8) + 2;
        for (let i = 0; i < n; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const jitter = Math.random();
            if (g.noPenetration) {
                // tidak tembus: percikan menyemprot balik ke atas pelat
                box.appendChild(svgEl('line', {
                    x1: side * 4, y1: PL.nozzleY + 20, x2: side * (10 + jitter * 22),
                    y2: PL.nozzleY - 6 - jitter * 26, opacity: 0.8
                }));
            } else {
                box.appendChild(svgEl('line', {
                    x1: side * 3, y1: yTop, x2: side * (6 + jitter * 16),
                    y2: yTop + 14 + jitter * 22, opacity: 0.85
                }));
            }
        }
    };

    /** Zona 2: potongan melintang + telemetri. */
    const renderCrossSection = (amp, speed) => {
        const g = cutGeometry(amp, speed);
        const halfTop = (g.kerf * PL.pxPerMm) / 2;
        const bevelPx = Math.tan(g.bevelDeg * Math.PI / 180) * (PL.bottom - PL.top);
        const halfBottom = Math.max(halfTop - bevelPx, 1.2);
        const { cx, top, bottom } = PL;

        el('pl-plate-l').setAttribute('d', `M 56 ${top} H ${cx - halfTop} L ${cx - halfBottom} ${bottom} H 56 Z`);
        el('pl-plate-r').setAttribute('d', `M 604 ${top} H ${cx + halfTop} L ${cx + halfBottom} ${bottom} H 604 Z`);

        // jika tidak tembus, sisakan jembatan material di dasar celah
        let bridge = document.getElementById('pl-bridge');
        if (g.noPenetration) {
            if (!bridge) {
                bridge = svgEl('path', { id: 'pl-bridge', fill: 'url(#hatch-part)', stroke: '#39454e', 'stroke-width': 1.5 });
                el('pl-plate-r').after(bridge);
            }
            bridge.setAttribute('d', `M ${cx - halfBottom - 2} ${bottom - 22} H ${cx + halfBottom + 2} L ${cx + halfBottom + 2} ${bottom} H ${cx - halfBottom - 2} Z`);
            bridge.setAttribute('opacity', 1);
        } else if (bridge) {
            bridge.setAttribute('opacity', 0);
        }

        const hazW = 8 + g.haz * 26;
        el('pl-haz-l').setAttribute('d', `M ${cx - halfTop} ${top} L ${cx - halfBottom} ${bottom} L ${cx - halfBottom - hazW} ${bottom} L ${cx - halfTop - hazW} ${top} Z`);
        el('pl-haz-r').setAttribute('d', `M ${cx + halfTop} ${top} L ${cx + halfBottom} ${bottom} L ${cx + halfBottom + hazW} ${bottom} L ${cx + halfTop + hazW} ${top} Z`);
        el('pl-haz-l').setAttribute('opacity', 0.3 + g.haz * 0.7);
        el('pl-haz-r').setAttribute('opacity', 0.3 + g.haz * 0.7);

        const dross = el('pl-dross');
        dross.innerHTML = '';
        const blobs = Math.round(g.dross * 7);
        for (let i = 0; i < blobs; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const r = 3 + (i % 3) + g.dross * 3;
            dross.appendChild(svgEl('ellipse', {
                cx: cx + side * (halfBottom + 4 + Math.floor(i / 2) * 9),
                cy: bottom + 3 + (i % 2) * 2, rx: r, ry: r * 0.7
            }));
        }

        el('pl-kerf-dim').setAttribute('x1', cx - halfTop);
        el('pl-kerf-dim').setAttribute('x2', cx + halfTop);
        el('pl-kerf-a').setAttribute('x1', cx - halfTop);
        el('pl-kerf-a').setAttribute('x2', cx - halfTop);
        el('pl-kerf-b').setAttribute('x1', cx + halfTop);
        el('pl-kerf-b').setAttribute('x2', cx + halfTop);
        el('pl-kerf-label').textContent = `kerf ${fmt(g.kerf, 1)} mm`;

        // busur & panah arah
        const arcHalf = 5 + (amp / 120) * 11;
        el('pl-arc').setAttribute('d',
            `M -7 ${PL.nozzleY} L 7 ${PL.nozzleY} L ${arcHalf} ${Z1.top} L ${-arcHalf} ${Z1.top} Z`);
        el('pl-arc-glow').setAttribute('rx', arcHalf + 10);
        const arrowLen = 60 + (speed / 1000) * 130;
        el('pl-travel').setAttribute('x2', Z1.x0 + arrowLen);
        el('pl-travel-head').setAttribute('points',
            `${Z1.x0 + arrowLen - 8},24 ${Z1.x0 + arrowLen + 2},30 ${Z1.x0 + arrowLen - 8},36`);
        el('pl-travel-label').setAttribute('x', Z1.x0 + arrowLen + 12);
        el('pl-travel-label').textContent = `${speed} mm/menit`;

        // telemetri
        const grade = gradeCut(amp, speed);
        const drossLabel = g.dross < 0.15 ? 'Minimal' : g.dross < 0.5 ? 'Sedang' : 'Berat';
        const set = (id, text, cls) => {
            const node = el(id);
            if (!node) return;
            node.textContent = text;
            node.className = cls || '';
        };
        set('tm-kerf', `${fmt(g.kerf, 1)} mm`);
        set('tm-bevel', `${fmt(g.bevelDeg, 1)}°`, g.bevelDeg > 6 ? 'bad' : g.bevelDeg > 3.5 ? 'warn' : '');
        set('tm-dross', drossLabel, g.dross >= 0.5 ? 'bad' : g.dross >= 0.15 ? 'warn' : '');
        set('tm-grade', g.noPenetration ? 'Tidak tembus' : grade.label,
            grade.score < 60 || g.noPenetration ? 'bad' : grade.score < 85 ? 'warn' : '');

        return { geometry: g, grade };
    };

    /* ---------------------------------------------------------------
       Animasi pemotongan
       --------------------------------------------------------------- */
    const cutAnim = { raf: null, running: false, done: false };

    const setStatus = (text, tone) => {
        const node = el('pl-status');
        if (!node) return;
        node.textContent = text;
        node.setAttribute('fill', tone === 'bad' ? '#ff8f8f' : tone === 'ok' ? '#9cffb7' : '#8b98a1');
    };

    const setProgress = (ratio) => {
        const node = el('cut-progress');
        if (node) node.textContent = `${Math.round(ratio * 100)}%`;
    };

    const resetCut = (amp, speed) => {
        if (cutAnim.raf) cancelAnimationFrame(cutAnim.raf);
        cutAnim.raf = null;
        cutAnim.running = false;
        cutAnim.done = false;
        Sfx.stopArc(0.08);
        const g = cutGeometry(amp, speed);
        renderSlot(0, g);
        renderSparks(amp, false, g);
        el('viz-plasma').classList.remove('is-cutting');
        setStatus('siap — tekan Mulai Pemotongan');
        setProgress(0);
        const startBtn = el('cut-start');
        if (startBtn) startBtn.disabled = false;
    };

    /** Jalankan animasi; mengembalikan Promise yang selesai saat potongan tuntas. */
    const runCut = (amp, speed) => new Promise((resolve) => {
        if (cutAnim.running) { resolve(false); return; }
        const g = cutGeometry(amp, speed);
        const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // waktu nyata = panjang / laju; dipercepat ~6x lalu dibatasi 2,5–7 detik
        const realSec = (Z1.lengthMm / speed) * 60;
        const duration = reduced ? 600 : Math.min(Math.max(realSec / 6, 2.5), 7) * 1000;

        cutAnim.running = true;
        cutAnim.done = false;
        const startBtn = el('cut-start');
        if (startBtn) startBtn.disabled = true;

        el('viz-plasma').classList.add('is-cutting');
        setStatus(g.noPenetration ? 'busur menyala — tidak menembus pelat' : 'memotong…', g.noPenetration ? 'bad' : null);

        const t0 = performance.now();
        const step = (now) => {
            const ratio = Math.min((now - t0) / duration, 1);
            renderSlot(ratio, g);
            renderSparks(amp, true, g);
            setProgress(ratio);
            if (ratio < 1) {
                cutAnim.raf = requestAnimationFrame(step);
                return;
            }
            cutAnim.raf = null;
            cutAnim.running = false;
            cutAnim.done = true;
            renderSparks(amp, false, g);
            el('viz-plasma').classList.remove('is-cutting');
            Sfx.stopArc();
            Sfx.clank();
            setStatus(g.noPenetration
                ? 'selesai — pelat TIDAK tembus, ulangi dengan parameter lain'
                : 'pemotongan selesai — periksa tepi dan dross',
                g.noPenetration ? 'bad' : 'ok');
            if (startBtn) startBtn.disabled = false;
            resolve(true);
        };
        cutAnim.raf = requestAnimationFrame(step);

        // bunyi menyusul setelah loop animasi terpasang
        Sfx.pilot();
        Sfx.startArc(amp, speed);
    });

    const initCutting = () => {
        const form = el('cutting-form');
        const current = el('current');
        const speed = el('speed');
        const currentOut = el('current-output');
        const speedOut = el('speed-output');
        if (!current || !speed) return;

        const params = () => [parseInt(current.value, 10), parseInt(speed.value, 10)];

        const sync = () => {
            const [amp, mmMin] = params();
            if (currentOut) currentOut.textContent = amp;
            if (speedOut) speedOut.textContent = mmMin;
            renderCrossSection(amp, mmMin);
            // mengubah parameter membatalkan potongan sebelumnya
            if (!cutAnim.running) resetCut(amp, mmMin);
        };
        current.addEventListener('input', sync);
        speed.addEventListener('input', sync);
        sync();

        const startBtn = el('cut-start');
        if (startBtn) startBtn.addEventListener('click', () => {
            try {
                const [amp, mmMin] = params();
                resetCut(amp, mmMin);
                runCut(amp, mmMin);
            } catch (err) {
                console.error('[Pemotongan] gagal dijalankan:', err);
                setStatus('animasi gagal dijalankan — periksa konsol browser', 'bad');
                startBtn.disabled = false;
                cutAnim.running = false;
            }
        });

        const resetBtn = el('cut-reset');
        if (resetBtn) resetBtn.addEventListener('click', () => resetCut(...params()));

        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();   // tanpa ini halaman reload dan state hilang
            const [amp, mmMin] = params();
            // pastikan siswa melihat proses potongnya sebelum masuk evaluasi
            if (!cutAnim.done && !cutAnim.running) {
                resetCut(amp, mmMin);
                await runCut(amp, mmMin);
            } else if (cutAnim.running) {
                return;
            }
            const inspection = el('inspection');
            const out = renderCrossSection(amp, mmMin);
            state.cut = {
                amp, mmMin,
                inspection: inspection ? inspection.value.trim() : '',
                geometry: out.geometry,
                grade: out.grade
            };
            renderResults(state.cut);
            MetalToolsApp.navigateTo('hasil');
        });
    };

    /* =====================================================================
       TAHAP 05 — EVALUASI
       ===================================================================== */

    const renderResults = (data) => {
        const box = el('results');
        if (!box) return;

        const app = MetalToolsApp.getState();
        const total = Math.round((app.score + data.grade.score) / 1.25);
        const icons = state.tools.map(t =>
            `<svg viewBox="0 0 120 60" style="width:74px;height:37px" aria-hidden="true"><use href="#${TOOL_ICON[t] || 'tool-wrench'}"/></svg>`).join('');

        box.innerHTML = `
            <div class="dashboard-grid">
                <div class="col-6 panel" style="border-top-color: var(--navy);">
                    <h3 style="margin-top:0;color:var(--navy)">Hasil Pengukuran</h3>
                    <div class="digital-readout" style="margin:.75rem 0"><span>${fmt(state.caliper, 2)}</span><small>jangka sorong (mm)</small></div>
                    <div class="digital-readout"><span>${fmt(state.weldingGauge, 1)}</span><small>kaki las (mm)</small></div>
                    <p style="color:var(--steel-700);font-size:.85rem;margin-bottom:0">Throat teoretis ${fmt(state.weldingGauge * 0.707, 1)} mm (0,707 × kaki las).</p>
                </div>

                <div class="col-6 panel" style="border-top-color: var(--steel-700);">
                    <h3 style="margin-top:0;color:var(--navy)">Perkakas Terpakai</h3>
                    <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin:.5rem 0">${icons || '<em style="color:var(--danger)">Belum ada perkakas dipilih</em>'}</div>
                    ${state.tools.length ? `<ul class="bench-list">${state.tools.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
                    <p style="color:var(--steel-700);font-size:.85rem;margin-bottom:0">APD terpasang: ${app.ppeEquipped.length} item — ${app.ppeEquipped.join(', ') || '-'}</p>
                </div>

                <div class="col-12 panel" style="border-top-color: var(--safety);">
                    <h3 style="margin-top:0;color:var(--navy)">Hasil Pemotongan Plasma</h3>
                    <div class="telemetry" style="background:var(--steel-900);padding:.5rem;border-radius:5px">
                        <div><span>Arus</span><strong>${data.amp} A</strong></div>
                        <div><span>Kecepatan</span><strong>${data.mmMin} mm/mnt</strong></div>
                        <div><span>Lebar kerf</span><strong>${fmt(data.geometry.kerf, 1)} mm</strong></div>
                        <div><span>Kemiringan tepi</span><strong>${fmt(data.geometry.bevelDeg, 1)}°</strong></div>
                        <div><span>Tebal pelat</span><strong>${PLATE_MM} mm</strong></div>
                        <div><span>Mutu</span><strong>${data.geometry.noPenetration ? 'Tidak tembus' : data.grade.label}</strong></div>
                    </div>
                    <h4 style="margin:.9rem 0 .3rem;color:var(--navy)">Umpan balik parameter</h4>
                    <ul style="line-height:1.6;color:var(--steel-700);margin-top:0">${data.grade.notes.map(n => `<li>${n}</li>`).join('')}</ul>
                    <h4 style="margin:.9rem 0 .3rem;color:var(--navy)">Catatan inspeksi siswa</h4>
                    <p style="color:var(--steel-700);margin-top:0">${data.inspection || '(tidak ada catatan)'}</p>
                    <p style="margin:.9rem 0 .35rem;font-weight:700;color:var(--navy)">Skor akhir indikatif: ${total}/100</p>
                    <div class="score-bar"><i style="width:${total}%"></i></div>
                    <p style="color:var(--steel-500);font-size:.78rem;margin-bottom:0">Skor dan geometri potongan bersifat ilustratif untuk latihan, bukan hasil pengujian menurut standar.</p>
                </div>
            </div>`;

        fillReportHeader();
    };

    /* =====================================================================
       LAPORAN — cetak / simpan sebagai PDF lewat dialog cetak browser
       ===================================================================== */

    const reportStamp = () => {
        const d = new Date();
        try {
            return d.toLocaleString('id-ID', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (_) {
            return d.toISOString().slice(0, 16).replace('T', ' ');
        }
    };

    /** Mengisi kop laporan yang hanya tampil saat dicetak. */
    const fillReportHeader = () => {
        const app = MetalToolsApp.getState();
        const set = (id, text) => { const n = el(id); if (n) n.textContent = text; };
        set('rp-name', app.studentName || '(nama belum diisi)');
        set('rp-job', app.jobCard || '(job card belum diisi)');
        set('rp-date', reportStamp());

        const btn = el('print-report');
        if (btn) {
            btn.disabled = false;
            btn.removeAttribute('title');
        }
    };

    const slug = (s) => (s || 'siswa').normalize('NFKD')
        .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'siswa';

    const initReport = () => {
        const btn = el('print-report');
        const hint = el('print-hint');
        if (!btn) return;

        btn.addEventListener('click', () => {
            if (!state.cut) {
                if (hint) {
                    hint.textContent = 'Laporan belum bisa dicetak: selesaikan tahap Pemotongan Plasma terlebih dahulu.';
                    hint.style.color = 'var(--danger)';
                }
                return;
            }

            // nama berkas bawaan pada dialog cetak diambil dari judul dokumen
            const app = MetalToolsApp.getState();
            const iso = new Date().toISOString().slice(0, 10);
            const prevTitle = document.title;
            document.title = `Laporan-MetalToolsLab-${slug(app.studentName)}-${iso}`;

            const restore = () => {
                document.title = prevTitle;
                window.removeEventListener('afterprint', restore);
            };
            window.addEventListener('afterprint', restore);
            setTimeout(restore, 60000);   // jaring pengaman bila afterprint tidak terpicu

            fillReportHeader();   // segarkan cap waktu tepat sebelum cetak
            window.print();
        });
    };


    /** Hentikan busur bila siswa pindah scene atau tab disembunyikan. */
    const initAudioGuards = () => {
        const stop = () => {
            if (cutAnim.raf) cancelAnimationFrame(cutAnim.raf);
            cutAnim.raf = null;
            cutAnim.running = false;
            Sfx.stopArc(0.06);
        };
        document.querySelectorAll('[data-scene]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.getAttribute('data-scene') !== 'potong') stop();
            });
        });
        document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    };

    /* =====================================================================
       BUNYI ANTARMUKA — satu pendengar global untuk seluruh tombol
       ===================================================================== */

    /**
     * Dipasang sebagai listener global (fase capture) sehingga tetap berbunyi
     * walau handler lain memindahkan scene atau mengganti isi DOM. Bunyi dipilih
     * dari hasil yang akan terjadi, bukan hanya dari jenis elemennya.
     */
    const initUiSounds = () => {
        const toggle = el('sound-toggle');
        if (toggle) {
            if (!Sfx.supported()) {
                toggle.disabled = true;
                toggle.textContent = '🔇 Audio tidak tersedia';
                toggle.setAttribute('aria-pressed', 'false');
            } else {
                toggle.addEventListener('click', () => {
                    const nextMuted = !Sfx.isMuted();
                    Sfx.setMuted(nextMuted);
                    toggle.setAttribute('aria-pressed', String(!nextMuted));
                    toggle.textContent = nextMuted ? '🔇 Suara mati' : '🔊 Suara';
                    if (!nextMuted) Sfx.click();   // beri umpan balik saat dinyalakan
                });
            }
        }

        const vol = el('sound-volume');
        if (vol) {
            if (!Sfx.supported()) {
                vol.disabled = true;
            } else {
                vol.value = String(Math.round(Sfx.getVolume() * 100));
                vol.addEventListener('input', () => {
                    Sfx.setVolume(Number(vol.value) / 100);
                    if (toggle && Sfx.isMuted()) {
                        Sfx.setMuted(false);
                        toggle.setAttribute('aria-pressed', 'true');
                        toggle.textContent = '🔊 Suara';
                    }
                });
                // contoh bunyi saat pengguna melepas geseran
                vol.addEventListener('change', () => Sfx.click());
            }
        }

        // centang APD memakai event change agar status akhirnya akurat
        document.addEventListener('change', (e) => {
            const t = e.target;
            if (t && t.type === 'checkbox') Sfx.tick(t.checked);
        }, true);

        document.addEventListener('click', (e) => {
            const btn = e.target.closest && e.target.closest('button');
            if (!btn || btn.disabled || btn === toggle) return;

            // 1. verifikasi K3: berhasil bila seluruh APD tercentang
            if (btn.type === 'submit' && btn.closest('#k3-form')) {
                const form = btn.closest('#k3-form');
                const all = form.querySelectorAll('input[name="apd"]');
                const checked = form.querySelectorAll('input[name="apd"]:checked');
                (checked.length === all.length ? Sfx.chime : Sfx.buzz)();
                return;
            }

            // 2. navigasi antar scene: terkunci selama K3 belum lulus
            const scene = btn.getAttribute('data-scene');
            if (scene) {
                const passed = MetalToolsApp.getState().isK3Passed;
                if (scene !== 'home' && scene !== 'k3' && !passed) Sfx.buzz();
                else Sfx.clack();
                return;
            }

            // 3. tombol lain: klik biasa (bunyi busur plasma ditangani terpisah)
            Sfx.click();
        }, true);
    };

    document.addEventListener('DOMContentLoaded', () => {
        initMeasurement();
        initTools();
        initCutting();
        initReport();
        initUiSounds();
        initAudioGuards();
    });
})();