// Карта, маршрутизація, точки, пошук, відправка заявки
var map, routingControl, baseTileLayer;
var waypointMarkers = [];
var segmentDistances = [];
var debounceTimer;
var isCalculating = false;
var currentTotalDist = 0;
/** Поточні результати геопошуку та індекс підсвіченого рядка (клавіші ↑/↓) */
var searchResultsItems = [];
var searchHighlightIndex = -1;
/** true під час відправки заявки — кнопка лишається disabled */
var isSubmitting = false;

/** Чи відповідає рядок формату телефону або email */
function isValidContact(contact) {
    const c = (contact || '').trim();
    if (!c) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) || /^\+?[\d\s\-()]{7,20}$/.test(c);
}

/** Увімкнути кнопку лише за валідного контакту (і не під час відправки) */
function updateSubmitButtonState() {
    const input = document.getElementById('contactInput');
    const btn = document.getElementById('btn-submit');
    if (!btn) return;
    if (isSubmitting) {
        btn.disabled = true;
        return;
    }
    btn.disabled = !isValidContact(input ? input.value : '');
}

/** Оновлення підпису © на тайлах залежно від мови */
function syncMapAttribution() {
    if (!map || !baseTileLayer) return;
    const t = translations[currentLang];
    const next = '&copy; ' + (t.mapAttribution || 'GeoSan');
    const prev = baseTileLayer.options.attribution;
    if (prev === next) return;
    const ac = map.attributionControl;
    if (ac) {
        if (prev) ac.removeAttribution(prev);
        ac.addAttribution(next);
    }
    baseTileLayer.options.attribution = next;
}

window.onload = () => {
    map = L.map('map', { zoomControl: false }).setView([50.4501, 30.5234], 6);
    baseTileLayer = L.tileLayer(CARTO_TILE_LAYER_URL, { attribution: '&copy; Геосан' }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    map.on('click', (e) => addWaypoint(e.latlng));
    setupSearch('searchInput', 'searchResults');
    setLanguage('uk');
    const contactInput = document.getElementById('contactInput');
    if (contactInput) {
        contactInput.addEventListener('input', updateSubmitButtonState);
        contactInput.addEventListener('paste', () => setTimeout(updateSubmitButtonState, 0));
    }
    updateSubmitButtonState();
    window.addEventListener('resize', () => { setTimeout(() => map.invalidateSize(), 300); });
};

function toggleSidebar() { if (window.innerWidth < 768) document.getElementById('sidebar').classList.toggle('expanded'); }

function setupSearch(inputId, resultsId) {
    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        searchHighlightIndex = -1;
        const query = input.value.trim();
        if (query.length < 3) {
            results.classList.add('hidden');
            searchResultsItems = [];
            return;
        }
        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`${NOMINATIM_SEARCH_URL}?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=${currentLang}&addressdetails=1`);
                const data = await res.json();
                showSearchResults(data, results, input);
            } catch (err) {}
        }, 500);
    });
    input.addEventListener('keydown', (e) => {
        if (results.classList.contains('hidden') || searchResultsItems.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            searchHighlightIndex = Math.min(searchHighlightIndex + 1, searchResultsItems.length - 1);
            if (searchHighlightIndex < 0) searchHighlightIndex = 0;
            updateSearchResultsHighlight(results);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            searchHighlightIndex = Math.max(searchHighlightIndex - 1, -1);
            updateSearchResultsHighlight(results);
        } else if (e.key === 'Enter' && searchHighlightIndex >= 0) {
            e.preventDefault();
            applySearchSelection(searchResultsItems[searchHighlightIndex], results, input);
        } else if (e.key === 'Escape') {
            results.classList.add('hidden');
            searchHighlightIndex = -1;
        }
    });
}

function updateSearchResultsHighlight(container) {
    const children = container.children;
    const active = 'p-3 cursor-pointer text-sm border-b border-slate-50 last:border-none bg-blue-100';
    const idle = 'p-3 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-none';
    for (let i = 0; i < children.length; i++) {
        children[i].className = i === searchHighlightIndex ? active : idle;
    }
    if (searchHighlightIndex >= 0 && children[searchHighlightIndex]) {
        children[searchHighlightIndex].scrollIntoView({ block: 'nearest' });
    }
}

function applySearchSelection(item, container, input) {
    input.value = '';
    container.classList.add('hidden');
    searchResultsItems = [];
    searchHighlightIndex = -1;
    addWaypoint(L.latLng(item.lat, item.lon), item.display_name, item.address?.country_code);
}

function showSearchResults(data, container, input) {
    container.innerHTML = '';
    searchResultsItems = [];
    searchHighlightIndex = -1;
    if (!data || data.length === 0) { container.classList.add('hidden'); return; }
    searchResultsItems = data;
    data.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'p-3 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-none';
        div.innerText = item.display_name;
        div.onmouseenter = () => {
            searchHighlightIndex = idx;
            updateSearchResultsHighlight(container);
        };
        div.onclick = () => applySearchSelection(item, container, input);
        container.appendChild(div);
    });
    container.classList.remove('hidden');
}

async function addWaypoint(latlng, knownAddress = null, country = null, atIndex = null, isBorder = false) {
    isCalculating = true;
    const res = knownAddress && country ? { display_name: knownAddress, address: { country_code: country } } : await getAddressFull(latlng);
    const waypointObj = { marker: L.marker(latlng, { draggable: true }).addTo(map), address: res.display_name, country: res.address?.country_code?.toLowerCase() || null, isBorder };
    if (atIndex !== null) waypointMarkers.splice(atIndex, 0, waypointObj); else waypointMarkers.push(waypointObj);
    waypointObj.marker.on('dragend', async () => {
        isCalculating = true;
        const updated = await getAddressFull(waypointObj.marker.getLatLng());
        waypointObj.address = updated.display_name;
        waypointObj.country = updated.address?.country_code?.toLowerCase() || null;
        calculateRoute();
    });
    refreshMarkerIcons();
    updateUI();
    calculateRoute();
    if (waypointMarkers.length === 1 && window.innerWidth < 768) document.getElementById('sidebar').classList.add('expanded');
}

async function getAddressFull(latlng) {
    try {
        const res = await fetch(`${NOMINATIM_REVERSE_URL}?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}&accept-language=${currentLang}&addressdetails=1`);
        const data = await res.json();
        return data;
    } catch (err) { return { display_name: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`, address: {} }; }
}

function removeWaypoint(index) {
    if (waypointMarkers[index].marker) map.removeLayer(waypointMarkers[index].marker);
    waypointMarkers.splice(index, 1);
    segmentDistances = [];
    refreshMarkerIcons();
    calculateRoute();
}

/** Зміна порядку звичайної точки в списку (обмін з сусідом); КПП не рухаємо */
function moveWaypoint(index, delta) {
    const j = index + delta;
    if (j < 0 || j >= waypointMarkers.length) return;
    if (waypointMarkers[index].isBorder) return;
    [waypointMarkers[index], waypointMarkers[j]] = [waypointMarkers[j], waypointMarkers[index]];
    segmentDistances = [];
    isCalculating = true;
    refreshMarkerIcons();
    updateUI();
    calculateRoute();
}

function refreshMarkerIcons() {
    waypointMarkers.forEach((obj, i) => {
        obj.marker.setIcon(L.divIcon({ className: obj.isBorder ? 'border-icon-marker' : 'number-icon', html: `<span>${i + 1}</span>`, iconSize: [28, 28] }));
    });
}

function clearAllPoints() {
    waypointMarkers.forEach(obj => { if(obj.marker) map.removeLayer(obj.marker); });
    waypointMarkers = []; segmentDistances = [];
    if (routingControl) { try { map.removeControl(routingControl); } catch(e){} routingControl = null; }
    updateUI();
}

function updateUI() {
    const container = document.getElementById('pointsContainer');
    if(!container) return;
    container.innerHTML = '';
    const t = translations[currentLang];
    if (waypointMarkers.length === 0) {
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('routeInfo').classList.add('hidden');
        updateSubmitButtonState();
        return;
    }
    document.getElementById('emptyState').classList.add('hidden');
    const lastIdx = waypointMarkers.length - 1;
    waypointMarkers.forEach((obj, i) => {
        const label = i === 0 ? t.start : (i === lastIdx ? t.finish : (obj.isBorder ? t.border : t.stop));
        const pointDiv = document.createElement('div');
        pointDiv.className = `flex items-center gap-3 p-3 rounded-xl group relative z-10 shadow-sm border mb-2 ${obj.isBorder ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`;
        const numBadge = `<div class="flex-none w-6 h-6 ${obj.isBorder ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">${i + 1}</div>`;
        // Стрілки зліва над/під номером; КПП без перестановки — лише бейдж по центру колонки
        const leftCol = obj.isBorder
            ? `<div class="flex flex-col items-center justify-center shrink-0 w-9">${numBadge}</div>`
            : `<div class="flex flex-col items-center shrink-0 w-9 gap-0.5">
                <button type="button" onclick="moveWaypoint(${i}, -1)" title="${t.moveUp}" aria-label="${t.moveUp}" ${i === 0 ? 'disabled' : ''} class="p-0.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-50 disabled:opacity-25 disabled:pointer-events-none transition-colors leading-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>
                </button>
                ${numBadge}
                <button type="button" onclick="moveWaypoint(${i}, 1)" title="${t.moveDown}" aria-label="${t.moveDown}" ${i === lastIdx ? 'disabled' : ''} class="p-0.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-50 disabled:opacity-25 disabled:pointer-events-none transition-colors leading-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                </button>
            </div>`;
        pointDiv.innerHTML = `
            ${leftCol}
            <div class="flex-1 min-w-0">
                <p class="text-[8px] uppercase font-bold tracking-wider ${obj.isBorder ? 'text-green-600' : 'text-slate-400'}">${label}</p>
                <p class="text-[12px] text-slate-700 font-semibold break-words leading-tight">${obj.address || ''}</p>
                <p class="text-[9px] font-mono mt-0.5 ${obj.isBorder ? 'text-green-600' : 'text-blue-600'}">${obj.marker.getLatLng().lat.toFixed(5)}, ${obj.marker.getLatLng().lng.toFixed(5)}</p>
            </div>
            <div class="flex items-center shrink-0 self-center">
                <button type="button" onclick="removeWaypoint(${i})" class="p-2 text-slate-300 hover:text-red-500 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
            </div>
        `;
        container.appendChild(pointDiv);
        if (i < waypointMarkers.length - 1) {
            const dist = segmentDistances[i];
            const connector = document.createElement('div');
            connector.className = "segment-connector";
            connector.innerHTML = dist ? `<div class="distance-pill"><span>${(dist/1000).toFixed(1)} ${t.km}</span></div>` : (isCalculating ? `<div class="distance-pill opacity-50"><span class="animate-pulse">...</span></div>` : '');
            container.appendChild(connector);

            const c1 = obj.country;
            const c2 = waypointMarkers[i+1].country;
            if (c1 && c2 && c1 !== c2 && !obj.isBorder && !waypointMarkers[i+1].isBorder) {
                if (c1 === 'ua' || c2 === 'ua') {
                    const borderUI = document.createElement('div');
                    borderUI.className = "border-line-box";
                    borderUI.innerHTML = `
                        <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-2 relative shadow-sm mb-2">
                            <button onclick="toggleBorderDropdown(${i})" class="w-full flex items-center justify-between text-left px-1">
                                <span class="text-[9px] font-bold text-green-600 uppercase tracking-tighter">${t.borderFound}</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-green-500"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <div id="dropdown-border-${i}" class="hidden mt-2 bg-white rounded-lg border border-emerald-100 flex flex-col max-h-64 overflow-y-auto custom-scrollbar"></div>
                        </div>
                    `;
                    container.appendChild(borderUI);
                }
            }
        }
    });
    updateSubmitButtonState();
}

function toggleBorderDropdown(idx) {
    const list = document.getElementById(`dropdown-border-${idx}`);
    if (!list) return;
    const willOpen = list.classList.contains('hidden');
    list.classList.toggle('hidden');
    if (willOpen) {
        renderBorderCountryPicker(idx);
    } else {
        list.innerHTML = '';
    }
}

/** Крок 1: країна транзиту (завжди перед вибором КПП) */
function renderBorderCountryPicker(idx) {
    const list = document.getElementById(`dropdown-border-${idx}`);
    if (!list) return;
    list.innerHTML = '';
    const t = translations[currentLang];
    const hint = document.createElement('div');
    hint.className = 'p-2 text-[9px] font-bold text-slate-400 uppercase';
    hint.innerText = t.selectCountry;
    list.appendChild(hint);
    Object.keys(checkpointsData).forEach(code => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-2 hover:bg-emerald-50 text-[11px] border-b border-emerald-100 last:border-none';
        btn.innerText = t.countries[code] || code.toUpperCase();
        btn.onclick = () => renderBorderCheckpointList(idx, code);
        list.appendChild(btn);
    });
}

/** Крок 2: пункт перетину кордону для обраної країни */
function renderBorderCheckpointList(idx, country) {
    const list = document.getElementById(`dropdown-border-${idx}`);
    if (!list || !checkpointsData[country]) return;
    list.innerHTML = '';
    const t = translations[currentLang];
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'w-full text-left p-2 text-[10px] font-bold text-green-600 uppercase border-b border-emerald-100 hover:bg-emerald-50';
    backBtn.innerText = t.back;
    backBtn.onclick = () => renderBorderCountryPicker(idx);
    list.appendChild(backBtn);
    checkpointsData[country].forEach(p => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-full text-left p-2 hover:bg-emerald-50 text-[11px] border-b border-emerald-100 last:border-none';
        btn.innerText = p.name[currentLang] || p.name.en;
        btn.onclick = () => addWaypoint(L.latLng(p.lat, p.lng), p.name[currentLang], country, idx + 1, true);
        list.appendChild(btn);
    });
}

function calculateRoute() {
    const infoEl = document.getElementById('routeInfo');
    if (waypointMarkers.length < 2) {
        if (routingControl) { try { map.removeControl(routingControl); } catch(e){} routingControl = null; }
        if (infoEl) infoEl.classList.add('hidden');
        updateUI(); return;
    }
    const wpts = waypointMarkers.map(obj => obj.marker.getLatLng());
    if (!routingControl) {
        routingControl = L.Routing.control({ waypoints: wpts, createMarker: () => null, lineOptions: { styles: [{ color: '#2563eb', weight: 5, opacity: 0.7 }] }, router: L.Routing.osrmv1({ serviceUrl: OSRM_SERVICE_URL, language: currentLang }), fitSelectedRoutes: false, show: false }).addTo(map);
        routingControl.on('routesfound', (e) => {
            const r = e.routes[0]; isCalculating = false; segmentDistances = [];
            if (r.waypointIndices) {
                for (let i = 0; i < r.waypointIndices.length - 1; i++) {
                    let d = 0;
                    for (let j = r.waypointIndices[i]; j < r.waypointIndices[i+1]; j++) { if(r.coordinates[j] && r.coordinates[j+1]) d += r.coordinates[j].distanceTo(r.coordinates[j+1]); }
                    segmentDistances.push(d);
                }
            }
            currentTotalDist = segmentDistances.reduce((a, b) => a + b, 0);
            if(document.getElementById('totalDistance')) document.getElementById('totalDistance').innerText = (currentTotalDist / 1000).toFixed(1) + ` ${translations[currentLang].km}`;
            if(document.getElementById('routePointsCount')) document.getElementById('routePointsCount').innerText = `${waypointMarkers.length} ${translations[currentLang].pts}`;
            if(infoEl) infoEl.classList.remove('hidden');
            updateUI();
            const padding = window.innerWidth < 768 ? [20, 20] : [50, 50];
            const offset = window.innerWidth < 768 ? [0, 0] : [380, 0];
            map.fitBounds(L.latLngBounds(r.coordinates), { padding: padding, paddingTopLeft: offset, animate: true });
        });
    } else { routingControl.setWaypoints(wpts); }
}

async function sendToGoogleSheets() {
    const input = document.getElementById('contactInput');
    const contact = input ? input.value.trim() : '';
    const t = translations[currentLang];
    input.classList.remove('input-error');
    if (!isValidContact(contact)) { input.classList.add('input-error'); showToast(t.invalidFormat); return; }
    isSubmitting = true;
    updateSubmitButtonState();
    const data = { timestamp: new Date().toLocaleString(), contact, distance: (currentTotalDist/1000).toFixed(1) + " km", route: waypointMarkers.map((m, i) => `${i+1}. ${m.address}`).join(' -> ') };
    if (!WEB_APP_URL) {
        console.log(data);
        setTimeout(() => {
            showToast(t.success);
            isSubmitting = false;
            updateSubmitButtonState();
        }, 1000);
        return;
    }
    try { await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) }); showToast(t.success); input.value = ''; }
    catch (err) { showToast("Error"); }
    finally { isSubmitting = false; updateSubmitButtonState(); }
}

function showToast(m) {
    const t = document.getElementById('toast');
    if(t) { document.getElementById('toastMessage').innerText = m; t.classList.remove('opacity-0'); setTimeout(() => { t.classList.add('opacity-0'); }, 3000); }
}
