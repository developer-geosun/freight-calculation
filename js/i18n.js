// Словники та перемикання мови інтерфейсу
let currentLang = 'uk';

const translations = {
    uk: { title: "ТОВ Геосан", mapAttribution: "Геосан", docTitle: "Калькулятор фрахту — ТОВ Геосан", subtitle: "Планування фрахту", clear: "Очистити", searchPlaceholder: "Пошук міста...", empty: "Оберіть точки на карті", start: "Старт", finish: "Фініш", stop: "Зупинка", border: "Кордон", km: "км", borderFound: "Кордон України", findBorder: "Обрати КПП", selectCountry: "Оберіть країну транзиту", back: "Назад", moveUp: "Вгору в списку", moveDown: "Вниз в списку", searching: "Розрахунок...", totalDistLabel: "Маршрут", pts: "точок", contactLbl: "Телефон або Email", submitBtn: "Надіслати запит", success: "Надіслано!", fillFields: "Вкажіть контакти", invalidFormat: "Невірний формат", countries: { pl: "Польща", sk: "Словаччина", hu: "Угорщина", ro: "Румунія", md: "Молдова" } },
    ru: { title: "ООО Геосан", mapAttribution: "Геосан", docTitle: "Калькулятор фрахта — ООО Геосан", subtitle: "Планирование фрахта", clear: "Очистить", searchPlaceholder: "Поиск города...", empty: "Выберите точки на карте", start: "Старт", finish: "Финиш", stop: "Остановка", border: "Граница", km: "км", borderFound: "Граница Украины", findBorder: "Выбрать КПП", selectCountry: "Выберите страну транзита", back: "Назад", moveUp: "Выше в списке", moveDown: "Ниже в списке", searching: "Расчет...", totalDistLabel: "Маршрут", pts: "точек", contactLbl: "Телефон или Email", submitBtn: "Отправить запрос", success: "Отправлено!", fillFields: "Укажите контакты", invalidFormat: "Неверный формат", countries: { pl: "Польша", sk: "Словакия", hu: "Венгрия", ro: "Румыния", md: "Молдова" } },
    en: { title: "GeoSan Ltd.", mapAttribution: "GeoSan", docTitle: "Freight Calculator — GeoSan Ltd.", subtitle: "Freight Planning", clear: "Clear", searchPlaceholder: "Search city...", empty: "Select points on map", start: "Start", finish: "Finish", stop: "Stop", border: "Border", km: "km", borderFound: "UA Border", findBorder: "Select checkpoint", selectCountry: "Select transit country", back: "Back", moveUp: "Move up in list", moveDown: "Move down in list", searching: "Calculating...", totalDistLabel: "Route", pts: "points", contactLbl: "Phone or Email", submitBtn: "Send request", success: "Sent!", fillFields: "Provide contacts", invalidFormat: "Invalid format", countries: { pl: "Poland", sk: "Slovakia", hu: "Hungary", ro: "Romania", md: "Moldova" } }
};

function updateUILanguage() {
    const t = translations[currentLang];
    const elements = { 'txt-title': t.title, 'txt-subtitle': t.subtitle, 'btn-clear': t.clear, 'txt-empty': t.empty, 'txt-total-dist-label': t.totalDistLabel, 'lbl-contact': t.contactLbl, 'txt-submit-btn': t.submitBtn };
    for (let id in elements) { if(document.getElementById(id)) document.getElementById(id).innerText = elements[id]; }
    if(document.getElementById('searchInput')) document.getElementById('searchInput').placeholder = t.searchPlaceholder;
    if (t.docTitle) document.title = t.docTitle;
    if (typeof syncMapAttribution === 'function') syncMapAttribution();
}

function setLanguage(lang) {
    currentLang = lang;
    const select = document.getElementById('lang-select');
    if (select) select.value = lang;
    updateUILanguage();
    updateUI();
    if (typeof routingControl !== 'undefined' && routingControl) calculateRoute(); // routingControl оголошено в map-app.js
}
