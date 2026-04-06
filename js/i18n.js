// Словники та перемикання мови інтерфейсу
let currentLang = 'uk';

const translations = {
    uk: { title: "ТОВ Геосан", mapAttribution: "Геосан", docTitle: "Калькулятор фрахту — ТОВ Геосан", subtitle: "Планування фрахту", clear: "Очистити", searchPlaceholder: "Пошук ...", empty: "Введіть послідовно адреси або оберіть точки на карті", start: "Старт", finish: "Фініш", stop: "Зупинка", border: "Кордон", km: "км", borderFound: "Кордон України", findBorder: "Обрати КПП", selectCountry: "Оберіть країну транзиту", back: "Назад", moveUp: "Вгору в списку", moveDown: "Вниз в списку", searching: "Розрахунок...", totalDistLabel: "Маршрут", pts: "точок", contactLbl: "Телефон або Email", submitBtn: "Далі...", success: "Надіслано!", fillFields: "Вкажіть контакти", invalidFormat: "Невірний формат", requestTitle: "Маршрут", requestEmailLabel: "E-mail для зворотного зв'язку *", requestPhoneLabel: "Телефон для зворотного зв'язку *", requestDateLabel: "Бажана дата початку виконання маршруту", requestCommentLabel: "Коментарі до маршруту", backToMapBtn: "Повернутися до карти", requestSubmitBtn: "Надіслати запит", requestSubmitting: "Надсилання...", emailRequired: "Вкажіть коректний email", phoneRequired: "Вкажіть коректний номер телефону", routeRequired: "Додайте щонайменше дві точки маршруту", selectBorderRequired: "Оберіть пункт перетину кордону", countries: { pl: "Польща", sk: "Словаччина", hu: "Угорщина", ro: "Румунія", md: "Молдова" } },
    ru: { title: "ООО Геосан", mapAttribution: "Геосан", docTitle: "Калькулятор фрахта — ООО Геосан", subtitle: "Планирование фрахта", clear: "Очистить", searchPlaceholder: "Поиск ...", empty: "Введите последовательно адреса или выберите точки на карте", start: "Старт", finish: "Финиш", stop: "Остановка", border: "Граница", km: "км", borderFound: "Граница Украины", findBorder: "Выбрать КПП", selectCountry: "Выберите страну транзита", back: "Назад", moveUp: "Выше в списке", moveDown: "Ниже в списке", searching: "Расчет...", totalDistLabel: "Маршрут", pts: "точек", contactLbl: "Телефон или Email", submitBtn: "Далее...", success: "Отправлено!", fillFields: "Укажите контакты", invalidFormat: "Неверный формат", requestTitle: "Маршрут", requestEmailLabel: "E-mail для обратной связи *", requestPhoneLabel: "Телефон для обратной связи *", requestDateLabel: "Желаемая дата начала выполнения маршрута", requestCommentLabel: "Комментарии к маршруту", backToMapBtn: "Вернуться к карте", requestSubmitBtn: "Отправить запрос", requestSubmitting: "Отправка...", emailRequired: "Укажите корректный email", phoneRequired: "Укажите корректный номер телефона", routeRequired: "Добавьте минимум две точки маршрута", selectBorderRequired: "Выберите пункт перехода границы", countries: { pl: "Польша", sk: "Словакия", hu: "Венгрия", ro: "Румыния", md: "Молдова" } },
    en: { title: "GeoSan Ltd.", mapAttribution: "GeoSan", docTitle: "Freight Calculator — GeoSan Ltd.", subtitle: "Freight Planning", clear: "Clear", searchPlaceholder: "Search ...", empty: "Input address or select points on map", start: "Start", finish: "Finish", stop: "Stop", border: "Border", km: "km", borderFound: "UA Border", findBorder: "Select checkpoint", selectCountry: "Select transit country", back: "Back", moveUp: "Move up in list", moveDown: "Move down in list", searching: "Calculating...", totalDistLabel: "Route", pts: "points", contactLbl: "Phone or Email", submitBtn: "Next...", success: "Sent!", fillFields: "Provide contacts", invalidFormat: "Invalid format", requestTitle: "Route", requestEmailLabel: "Feedback e-mail *", requestPhoneLabel: "Feedback phone *", requestDateLabel: "Preferred route start date", requestCommentLabel: "Route comments", backToMapBtn: "Back to map", requestSubmitBtn: "Send request", requestSubmitting: "Sending...", emailRequired: "Enter a valid email", phoneRequired: "Enter a valid phone number", routeRequired: "Add at least two route points", selectBorderRequired: "Select border crossing checkpoint", countries: { pl: "Poland", sk: "Slovakia", hu: "Hungary", ro: "Romania", md: "Moldova" } }
};

function updateUILanguage() {
    const t = translations[currentLang];
    const elements = {
        'txt-title': t.title,
        'txt-subtitle': t.subtitle,
        'btn-clear': t.clear,
        'txt-empty': t.empty,
        'txt-total-dist-label': t.totalDistLabel,
        'lbl-contact': t.contactLbl,
        'txt-submit-btn': t.submitBtn,
        'request-title': t.requestTitle,
        'request-email-label': t.requestEmailLabel,
        'request-phone-label': t.requestPhoneLabel,
        'request-date-label': t.requestDateLabel,
        'request-comment-label': t.requestCommentLabel,
        'btn-back-to-map': t.backToMapBtn,
        'txt-request-submit-btn': t.requestSubmitBtn
    };
    for (let id in elements) { if(document.getElementById(id)) document.getElementById(id).innerText = elements[id]; }
    if(document.getElementById('searchInput')) document.getElementById('searchInput').placeholder = t.searchPlaceholder;
    if (t.docTitle) document.title = t.docTitle;
    if (typeof syncMapAttribution === 'function') syncMapAttribution();
    if (typeof updateRequestSubmitButtonState === 'function') updateRequestSubmitButtonState();
}

function setLanguage(lang) {
    currentLang = lang;
    const select = document.getElementById('lang-select');
    if (select) select.value = lang;
    updateUILanguage();
    updateUI();
    if (typeof routingControl !== 'undefined' && routingControl) calculateRoute(); // routingControl оголошено в map-app.js
}
