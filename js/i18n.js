// Словники та перемикання мови інтерфейсу
let currentLang = 'uk';

const translations = {
    uk: { title: "GeoSun Ltd.", subtitle: "Планування фрахту", clear: "Очистити", searchPlaceholder: "Пошук міста...", empty: "Оберіть точки на карті", start: "Завантаження", finish: "Вивантаження", stop: "Зупинка", border: "Кордон", km: "км", borderFound: "Кордон України", findBorder: "Обрати КПП", selectCountry: "Оберіть країну транзиту", back: "Назад", searching: "Розрахунок...", totalDistLabel: "Маршрут", pts: "точок", contactLbl: "Телефон або Email", submitBtn: "Надіслати запит", success: "Надіслано!", fillFields: "Вкажіть контакти", invalidFormat: "Невірний формат", countries: { pl: "Польща", sk: "Словаччина", hu: "Угорщина", ro: "Румунія", md: "Молдова" } },
    ru: { title: "GeoSun Ltd.", subtitle: "Планирование фрахта", clear: "Очистить", searchPlaceholder: "Поиск города...", empty: "Выберите точки на карте", start: "Загрузка", finish: "Выгрузка", stop: "Остановка", border: "Граница", km: "км", borderFound: "Граница Украины", findBorder: "Выбрать КПП", selectCountry: "Выберите страну транзита", back: "Назад", searching: "Расчет...", totalDistLabel: "Маршрут", pts: "точек", contactLbl: "Телефон или Email", submitBtn: "Отправить запрос", success: "Отправлено!", fillFields: "Укажите контакты", invalidFormat: "Неверный формат", countries: { pl: "Польша", sk: "Словакия", hu: "Венгрия", ro: "Румыния", md: "Молдова" } },
    en: { title: "GeoSun Ltd.", subtitle: "Freight Planning", clear: "Clear", searchPlaceholder: "Search city...", empty: "Select points on map", start: "Loading", finish: "Unloading", stop: "Stop", border: "Border", km: "km", borderFound: "UA Border", findBorder: "Select checkpoint", selectCountry: "Select transit country", back: "Back", searching: "Calculating...", totalDistLabel: "Route", pts: "points", contactLbl: "Phone or Email", submitBtn: "Send request", success: "Sent!", fillFields: "Provide contacts", invalidFormat: "Invalid format", countries: { pl: "Poland", sk: "Slovakia", hu: "Hungary", ro: "Romania", md: "Moldova" } }
};

function updateUILanguage() {
    const t = translations[currentLang];
    const elements = { 'txt-title': t.title, 'txt-subtitle': t.subtitle, 'btn-clear': t.clear, 'txt-empty': t.empty, 'txt-total-dist-label': t.totalDistLabel, 'lbl-contact': t.contactLbl, 'txt-submit-btn': t.submitBtn };
    for (let id in elements) { if(document.getElementById(id)) document.getElementById(id).innerText = elements[id]; }
    if(document.getElementById('searchInput')) document.getElementById('searchInput').placeholder = t.searchPlaceholder;
}

function setLanguage(lang) {
    currentLang = lang;
    ['uk', 'ru', 'en'].forEach(l => {
        const btn = document.getElementById(`lang-${l}`);
        if(btn) btn.className = `px-2 py-1 rounded transition-all ${l === lang ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`;
    });
    updateUILanguage();
    updateUI();
    if (typeof routingControl !== 'undefined' && routingControl) calculateRoute(); // routingControl оголошено в map-app.js
}
