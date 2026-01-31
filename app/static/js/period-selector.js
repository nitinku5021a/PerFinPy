/**
 * Period selector: quick options (All time, YTD, Current month) and custom From/To calendar.
 * Builds URLs with period param and preserves other query params (e.g. show_zero, account_id).
 */
(function () {
    'use strict';

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const WDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function parseCustomPeriod(periodStr) {
        if (!periodStr || !periodStr.startsWith('custom_')) return null;
        const parts = periodStr.split('_');
        if (parts.length < 3) return null;
        const y1 = parseInt(parts[1].slice(0, 4), 10);
        const m1 = parseInt(parts[1].slice(4, 6), 10) - 1;
        const d1 = parseInt(parts[1].slice(6, 8), 10);
        const y2 = parseInt(parts[2].slice(0, 4), 10);
        const m2 = parseInt(parts[2].slice(4, 6), 10) - 1;
        const d2 = parseInt(parts[2].slice(6, 8), 10);
        return { from: new Date(y1, m1, d1), to: new Date(y2, m2, d2) };
    }

    function customPeriodString(fromDate, toDate) {
        const f = fromDate;
        const t = toDate;
        const y1 = f.getFullYear();
        const m1 = String(f.getMonth() + 1).padStart(2, '0');
        const d1 = String(f.getDate()).padStart(2, '0');
        const y2 = t.getFullYear();
        const m2 = String(t.getMonth() + 1).padStart(2, '0');
        const d2 = String(t.getDate()).padStart(2, '0');
        return 'custom_' + y1 + m1 + d1 + '_' + y2 + m2 + d2;
    }

    function todayStart() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function getExtraParams(el) {
        try {
            const raw = el.getAttribute('data-extra-params');
            if (!raw) return {};
            const obj = JSON.parse(raw);
            const out = {};
            for (const k of Object.keys(obj)) {
                if (k !== 'period' && k !== 'page') out[k] = obj[k];
            }
            return out;
        } catch (_) {
            return {};
        }
    }

    function buildUrl(baseUrl, period, extra) {
        const params = new URLSearchParams(extra);
        params.set('period', period);
        const qs = params.toString();
        return baseUrl + (qs ? '?' + qs : '');
    }

    function renderCalendar(gridEl, year, month, selectedDate, panel, minDate, maxDate) {
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const startPad = first.getDay();
        const daysInMonth = last.getDate();
        let html = '<table class="period-calendar-table"><thead><tr>';
        WDAY.forEach(function (w) { html += '<th>' + w + '</th>'; });
        html += '</tr></thead><tbody><tr>';
        let dayCount = 0;
        for (let i = 0; i < startPad; i++) {
            const prevMonth = new Date(year, month, -startPad + i + 1);
            const d = prevMonth.getDate();
            const cls = 'other-month';
            const data = prevMonth.getFullYear() + '-' + String(prevMonth.getMonth() + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            html += '<td class="' + cls + '"><button type="button" class="period-calendar-day" data-date="' + data + '" data-panel="' + panel + '">' + d + '</button></td>';
            dayCount++;
        }
        for (let d = 1; d <= daysInMonth; d++) {
            if (dayCount > 0 && dayCount % 7 === 0) html += '</tr><tr>';
            const cls = selectedDate && year === selectedDate.getFullYear() && month === selectedDate.getMonth() && d === selectedDate.getDate() ? 'selected' : '';
            const data = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            html += '<td class="' + cls + '"><button type="button" class="period-calendar-day" data-date="' + data + '" data-panel="' + panel + '">' + d + '</button></td>';
            dayCount++;
        }
        const nextMonthStart = new Date(year, month + 1, 1);
        let nextPad = 7 - (dayCount % 7);
        if (nextPad === 7) nextPad = 0;
        for (let i = 0; i < nextPad; i++) {
            const d = i + 1;
            const cls = 'other-month';
            const data = nextMonthStart.getFullYear() + '-' + String(nextMonthStart.getMonth() + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            html += '<td class="' + cls + '"><button type="button" class="period-calendar-day" data-date="' + data + '" data-panel="' + panel + '">' + d + '</button></td>';
        }
        html += '</tr></tbody></table>';
        gridEl.innerHTML = html;
    }

    function init() {
        const wrap = document.querySelector('.period-selector-wrap');
        if (!wrap) return;

        const baseUrl = wrap.getAttribute('data-base-url') || '';
        const currentPeriod = wrap.getAttribute('data-period') || 'all';
        const displayBtn = document.getElementById('periodDateDisplay');
        const popover = document.getElementById('periodCalendarPopover');
        const fromGrid = document.getElementById('periodFromCalendar');
        const toGrid = document.getElementById('periodToCalendar');
        const fromLabel = document.getElementById('periodFromMonthLabel');
        const toLabel = document.getElementById('periodToMonthLabel');
        const applyBtn = document.getElementById('periodCalendarApply');
        const cancelBtn = document.getElementById('periodCalendarCancel');

        if (!displayBtn || !popover || !fromGrid || !toGrid) return;

        let fromDate = null;
        let toDate = null;
        let fromView = { year: new Date().getFullYear(), month: new Date().getMonth() };
        let toView = { year: new Date().getFullYear(), month: new Date().getMonth() };

        const parsed = parseCustomPeriod(currentPeriod);
        if (parsed) {
            fromDate = parsed.from;
            toDate = parsed.to;
            fromView = { year: fromDate.getFullYear(), month: fromDate.getMonth() };
            toView = { year: toDate.getFullYear(), month: toDate.getMonth() };
        } else {
            const t = todayStart();
            fromDate = new Date(t.getFullYear(), t.getMonth(), 1);
            toDate = new Date(t);
            fromView = { year: fromDate.getFullYear(), month: fromDate.getMonth() };
            toView = { year: toDate.getFullYear(), month: toDate.getMonth() };
        }

        function updateMonthLabels() {
            fromLabel.textContent = MONTHS[fromView.month] + ' ' + fromView.year;
            toLabel.textContent = MONTHS[toView.month] + ' ' + toView.year;
        }

        function renderBoth() {
            renderCalendar(fromGrid, fromView.year, fromView.month, fromDate, 'from', null, toDate || null);
            renderCalendar(toGrid, toView.year, toView.month, toDate, 'to', fromDate || null, null);
            updateMonthLabels();
        }

        displayBtn.addEventListener('click', function () {
            const isHidden = popover.hidden;
            if (isHidden) {
                popover.hidden = false;
                displayBtn.setAttribute('aria-expanded', 'true');
                renderBoth();
            } else {
                popover.hidden = true;
                displayBtn.setAttribute('aria-expanded', 'false');
            }
        });

        cancelBtn.addEventListener('click', function () {
            popover.hidden = true;
            displayBtn.setAttribute('aria-expanded', 'false');
        });

        applyBtn.addEventListener('click', function () {
            if (!fromDate || !toDate) return;
            if (fromDate > toDate) {
                var tmp = fromDate; fromDate = toDate; toDate = tmp;
            }
            const period = customPeriodString(fromDate, toDate);
            const extra = getExtraParams(wrap);
            const url = buildUrl(baseUrl, period, extra);
            window.location.href = url;
        });

        wrap.addEventListener('click', function (e) {
            const dayBtn = e.target.closest('.period-calendar-day');
            if (dayBtn) {
                const panel = dayBtn.getAttribute('data-panel');
                const dateStr = dayBtn.getAttribute('data-date');
                const parts = dateStr.split('-');
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                if (panel === 'from') {
                    fromDate = d;
                    if (toDate && d > toDate) toDate = d;
                    fromView = { year: d.getFullYear(), month: d.getMonth() };
                } else {
                    toDate = d;
                    if (fromDate && d < fromDate) fromDate = d;
                    toView = { year: d.getFullYear(), month: d.getMonth() };
                }
                renderBoth();
                return;
            }
            const navBtn = e.target.closest('.period-calendar-nav-btn');
            if (navBtn) {
                const panel = navBtn.getAttribute('data-panel');
                const dir = navBtn.getAttribute('data-dir');
                const view = panel === 'from' ? fromView : toView;
                if (dir === 'prev') {
                    view.month--;
                    if (view.month < 0) { view.month = 11; view.year--; }
                } else if (dir === 'next') {
                    view.month++;
                    if (view.month > 11) { view.month = 0; view.year++; }
                } else if (dir === 'year-prev') { view.year--; }
                else if (dir === 'year-next') { view.year++; }
                renderBoth();
                return;
            }
            const quickBtn = e.target.closest('.period-calendar-quick-btn');
            if (quickBtn) {
                const t = todayStart();
                if (quickBtn.hasAttribute('data-from')) {
                    const fromOffset = parseInt(quickBtn.getAttribute('data-from'), 10);
                    const toOffset = parseInt(quickBtn.getAttribute('data-to'), 10);
                    const fromD = new Date(t);
                    fromD.setDate(fromD.getDate() + fromOffset);
                    const toD = new Date(t);
                    toD.setDate(toD.getDate() + toOffset);
                    fromDate = fromD;
                    toDate = toD;
                } else if (quickBtn.hasAttribute('data-fy')) {
                    const fy = quickBtn.getAttribute('data-fy');
                    const y = t.getFullYear();
                    if (fy === 'current') {
                        fromDate = new Date(y, 3, 1);   // Apr 1
                        toDate = new Date(y + 1, 2, 31); // Mar 31
                    } else {
                        fromDate = new Date(y - 1, 3, 1);
                        toDate = new Date(y, 2, 31);
                    }
                }
                fromView = { year: fromDate.getFullYear(), month: fromDate.getMonth() };
                toView = { year: toDate.getFullYear(), month: toDate.getMonth() };
                renderBoth();
            }
        });

        document.addEventListener('click', function (e) {
            if (popover.hidden) return;
            if (wrap.contains(e.target) || e.target === displayBtn) return;
            popover.hidden = true;
            displayBtn.setAttribute('aria-expanded', 'false');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
