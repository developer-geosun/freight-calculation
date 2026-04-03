// Карта, маршрутизація, точки, пошук, відправка заявки
var map, routingControl;
var waypointMarkers = [];
var segmentDistances = [];
var debounceTimer;
var isCalculating = false;
var currentTotalDist = 0;
/** Поточні результати геопошуку та індекс підсвіченого рядка (клавіші ↑/↓) */
var searchResultsItems = [];
var searchHighlightIndex = -1;

window.onload = () => {
    map = L.map('map', { zoomControl: false }).setView([50.4501, 30.5234], 6);
    L.tileLayer(CARTO_TILE_LAYER_URL, { attribution: '&copy; GeoSun' }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    map.on('click', (e) => addWaypoint(e.latlng));
    setupSearch('searchInput', 'searchResults');
    setLanguage('uk');
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
        return;
    }
    document.getElementById('emptyState').classList.add('hidden');
    waypointMarkers.forEach((obj, i) => {
        const label = i === 0 ? t.start : (i === waypointMarkers.length - 1 ? t.finish : (obj.isBorder ? t.border : t.stop));
        const pointDiv = document.createElement('div');
        pointDiv.className = `flex items-center gap-3 p-3 rounded-xl group relative z-10 shadow-sm border mb-2 ${obj.isBorder ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`;
        pointDiv.innerHTML = `
            <div class="flex-none w-6 h-6 ${obj.isBorder ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">${i + 1}</div>
            <div class="flex-1 min-w-0">
                <p class="text-[8px] uppercase font-bold tracking-wider ${obj.isBorder ? 'text-green-600' : 'text-slate-400'}">${label}</p>
                <p class="text-[12px] text-slate-700 font-semibold break-words leading-tight">${obj.address || ''}</p>
                <p class="text-[9px] text-slate-400 font-mono mt-0.5">${obj.marker.getLatLng().lat.toFixed(5)}, ${obj.marker.getLatLng().lng.toFixed(5)}</p>
            </div>
            <button onclick="removeWaypoint(${i})" class="p-2 text-slate-300 hover:text-red-500 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
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
                    const target = c1 === 'ua' ? c2 : c1;
                    const isNeighbor = !!checkpointsData[target];
                    const borderUI = document.createElement('div');
                    borderUI.className = "border-line-box";
                    borderUI.innerHTML = `
                        <div class="bg-blue-50/50 border border-blue-100 rounded-xl p-2 relative shadow-sm mb-2">
                            <button onclick="toggleBorderDropdown(${i}, '${target}', ${isNeighbor})" class="w-full flex items-center justify-between text-left px-1">
                                <span class="text-[9px] font-bold text-blue-700 uppercase tracking-tighter">${t.borderFound}</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-blue-400"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <div id="dropdown-border-${i}" class="hidden mt-2 bg-white rounded-lg border border-blue-50 overflow-hidden flex flex-col max-h-32 overflow-y-auto custom-scrollbar"></div>
                        </div>
                    `;
                    container.appendChild(borderUI);
                }
            }
        }
    });
}

function toggleBorderDropdown(idx, country, isNeighbor) {
    const list = document.getElementById(`dropdown-border-${idx}`);
    if(!list) return;
    list.classList.toggle('hidden');
    if(list.innerHTML === '') {
        if(isNeighbor) {
            checkpointsData[country].forEach(p => {
                const btn = document.createElement('button');
                btn.className = "w-full text-left p-2 hover:bg-blue-50 text-[11px] border-b border-blue-50 last:border-none";
                btn.innerText = p.name[currentLang] || p.name['en'];
                btn.onclick = () => addWaypoint(L.latLng(p.lat, p.lng), p.name[currentLang], country, idx + 1, true);
                list.appendChild(btn);
            });
        } else {
            const t = translations[currentLang];
            list.innerHTML = `<div class="p-2 text-[9px] font-bold text-slate-400 uppercase">${t.selectCountry}</div>`;
            Object.keys(checkpointsData).forEach(code => {
                const btn = document.createElement('button');
                btn.className = "w-full text-left p-2 hover:bg-blue-50 text-[11px] border-b border-blue-50 last:border-none";
                btn.innerText = t.countries[code] || code.toUpperCase();
                btn.onclick = () => { list.innerHTML = ''; toggleBorderDropdown(idx, code, true); };
                list.appendChild(btn);
            });
        }
    }
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
    if(!contact || (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && !/^\+?[\d\s\-()]{7,20}$/.test(contact))) { input.classList.add('input-error'); showToast(t.invalidFormat); return; }
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    const data = { timestamp: new Date().toLocaleString(), contact, distance: (currentTotalDist/1000).toFixed(1) + " km", route: waypointMarkers.map((m, i) => `${i+1}. ${m.address}`).join(' -> ') };
    if(!WEB_APP_URL) { console.log(data); setTimeout(() => { showToast(t.success); btn.disabled = false; }, 1000); return; }
    try { await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) }); showToast(t.success); input.value = ''; }
    catch (err) { showToast("Error"); } finally { btn.disabled = false; }
}

function showToast(m) {
    const t = document.getElementById('toast');
    if(t) { document.getElementById('toastMessage').innerText = m; t.classList.remove('opacity-0'); setTimeout(() => { t.classList.add('opacity-0'); }, 3000); }
}

function addCurrentLocation() {
    if (!navigator.geolocation) return;
    const btn = document.getElementById('btnLocation');
    btn.classList.add('animate-pulse');
    navigator.geolocation.getCurrentPosition(p => {
        btn.classList.remove('animate-pulse');
        const ll = L.latLng(p.coords.latitude, p.coords.longitude);
        map.setView(ll, 12);
        addWaypoint(ll);
    }, () => { btn.classList.remove('animate-pulse'); });
}
