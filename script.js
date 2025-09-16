document.addEventListener('DOMContentLoaded', () => {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthYear = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const calendarViewTab = document.getElementById('calendar-view-tab');
    const listViewTab = document.getElementById('list-view-tab');
    const calendarView = document.getElementById('calendar-view');
    const listView = document.getElementById('list-view');
    const eventListContainer = document.getElementById('event-list');
    const filterCheckboxes = document.querySelectorAll('.filter-container input[type="checkbox"]');

    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let events = [];
    let selectedEventId = null;

    // Mapping for member names to colors (placeholder)
    const memberColors = {
        'MAKO': '#FFC0CB',
        'RIO': '#FFA500',
        'MAYA': '#87CEEB',
        'RIKU': '#FFFF00',
        'AYAKA': '#AFEEEE',
        'MAYUKA': '#90EE90',
        'RIMA': '#FFB6C1',
        'MIIHI': '#FF1493',
        'NINA': '#0000FF'
    };

    // --- CSV Parsing and Data Generation ---
    async function loadEvents() {
        const response = await fetch('data.csv');
        const text = await response.text();
        const rows = text.split('\n').slice(1).filter(row => row.trim() !== '');
        events = [];

        rows.forEach(row => {
            const columns = row.split(',').map(col => col.trim());

            // A: メンバー誕生日の日付, B: メンバー名, C: メンバーカラー
            if (columns[0]) {
                const date = new Date(columns[0]);
                const name = columns[1];
                const color = columns[2] || memberColors[name];
                
                // Add check for valid date
                if (!isNaN(date.getTime())) {
                    addAnniversaries(date, 'birthday', name, color, null);
                }
            }

            // D: 楽曲リリース記念日の日付, E: 楽曲名
            if (columns[3]) {
                const date = new Date(columns[3]);
                const title = columns[4];
                
                // Add check for valid date
                if (!isNaN(date.getTime())) {
                    addAnniversaries(date, 'release', title, null, null);
                }
            }

            // F: メンバーの日の日付, G: メンバー名, H: 絵文字
            if (columns[5]) {
                const date = new Date(columns[5]);
                const name = columns[6];
                const emoji = columns[7];
                
                // Add check for valid date
                if (!isNaN(date.getTime())) {
                    events.push({
                        id: `member-day-${date.toISOString()}-${name}`,
                        date,
                        type: 'member-day',
                        title: `${name}の日`,
                        emoji: emoji,
                        category: 'member-day',
                    });
                }
            }

            // I: ライブ実施日の日付, J: 会場名
            if (columns[8]) {
                const date = new Date(columns[8]);
                const venue = columns[9];
                
                // Add check for valid date
                if (!isNaN(date.getTime())) {
                    events.push({
                        id: `live-${date.toISOString()}-${venue}`,
                        date,
                        type: 'live',
                        title: `ライブ (${venue})`,
                        category: 'live',
                    });
                }
            }
        });

        // Add dummy holidays for 'その他・祝日'
        addDummyHolidays();
        
        events.sort((a, b) => a.date - b.date);
        
        renderCalendar();
        renderList();
    }
    
    function addAnniversaries(baseDate, type, title, color, details) {
        const baseTimestamp = baseDate.getTime();
        
        // Add the base event itself
        events.push({
            id: `${type}-base-${baseDate.toISOString()}`,
            date: baseDate,
            type: type,
            title: title,
            color: color,
            details: details,
            category: type
        });
        
        for (let i = 0; i < 50; i++) { // Generate anniversaries up to 50 years/10000 days
            const anniversaryYears = i + 1;
            const anniversaryDays = (i + 1) * 100;

            // Yearly anniversaries
            const yearDate = new Date(baseDate.getFullYear() + anniversaryYears, baseDate.getMonth(), baseDate.getDate());
            if (!isNaN(yearDate.getTime())) {
                events.push({
                    id: `${type}-year-${anniversaryYears}-${baseDate.toISOString()}`,
                    date: yearDate,
                    type: type,
                    title: `${title} ${anniversaryYears}周年`,
                    color: color,
                    details: details,
                    category: type
                });
            }

            // 100-day anniversaries
            const dayDate = new Date(baseTimestamp + anniversaryDays * 24 * 60 * 60 * 1000);
            if (!isNaN(dayDate.getTime())) {
                events.push({
                    id: `${type}-day-${anniversaryDays}-${baseDate.toISOString()}`,
                    date: dayDate,
                    type: type,
                    title: `${title} ${anniversaryDays}日記念`,
                    color: color,
                    details: details,
                    category: type
                });
            }
        }
    }

    function addDummyHolidays() {
        const holidays = [
            { date: '2025-01-01', title: '元日' },
            { date: '2025-01-13', title: '成人の日' },
            { date: '2025-02-11', title: '建国記念の日' },
            { date: '2025-02-23', title: '天皇誕生日' },
            { date: '2025-03-20', title: '春分の日' },
            { date: '2025-04-29', title: '昭和の日' },
            { date: '2025-05-03', title: '憲法記念日' },
            { date: '2025-05-04', title: 'みどりの日' },
            { date: '2025-05-05', title: 'こどもの日' },
            { date: '2025-07-21', title: '海の日' },
            { date: '2025-08-11', title: '山の日' },
            { date: '2025-09-15', title: '敬老の日' },
            { date: '2025-09-23', title: '秋分の日' },
            { date: '2025-10-13', title: 'スポーツの日' },
            { date: '2025-11-03', title: '文化の日' },
            { date: '2025-11-23', title: '勤労感謝の日' }
        ];

        holidays.forEach(holiday => {
            const date = new Date(holiday.date);
            if (!isNaN(date.getTime())) {
                events.push({
                    id: `holiday-${holiday.date}`,
                    date: date,
                    type: 'other',
                    title: holiday.title,
                    category: 'other'
                });
            }
        });
    }

    // --- Rendering Functions ---
    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const startDayOfWeek = firstDayOfMonth.getDay();
        const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

        currentMonthYear.textContent = `${currentYear} ${new Date(currentYear, currentMonth).toLocaleString('en-US', { month: 'long' })}`;

        // Render previous month's days
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day-cell', 'inactive');
            dayCell.innerHTML = `<span class="day-number">${lastDayOfPrevMonth - i}</span>`;
            calendarGrid.appendChild(dayCell);
        }

        // Render current month's days
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day-cell');
            dayCell.innerHTML = `<span class="day-number">${i}</span>`;
            
            const eventsForDay = getFilteredEvents().filter(event => 
                event.date.getFullYear() === currentYear &&
                event.date.getMonth() === currentMonth &&
                event.date.getDate() === i
            );
            
            if (eventsForDay.length > 0) {
                const eventsDiv = document.createElement('div');
                eventsDiv.classList.add('events');
                
                eventsForDay.forEach(event => {
                    const eventItem = document.createElement('div');
                    eventItem.classList.add('event-item', event.type);
                    eventItem.setAttribute('data-event-id', event.id);

                    if (event.type === 'member-day') {
                        eventItem.innerHTML = event.emoji;
                        eventItem.style.color = '#e74c3c'; // Ensure heart is red
                    } else if (event.type === 'birthday' && event.color) {
                        eventItem.style.backgroundColor = event.color;
                        eventItem.textContent = event.title;
                    } else {
                        eventItem.textContent = event.title;
                    }
                    eventsDiv.appendChild(eventItem);
                });
                dayCell.appendChild(eventsDiv);
            }

            if (selectedEventId) {
                const dayEvent = eventsForDay.find(e => e.id === selectedEventId);
                if (dayEvent) {
                    dayCell.classList.add('selected');
                }
            }

            dayCell.addEventListener('click', () => {
                const eventId = dayCell.querySelector('.event-item')?.dataset.eventId;
                if (eventId) {
                    toggleSelected(eventId);
                }
            });

            calendarGrid.appendChild(dayCell);
        }

        // Render next month's days
        const totalCells = calendarGrid.children.length;
        const remainingCells = 42 - totalCells; // 6 rows * 7 days
        for (let i = 1; i <= remainingCells; i++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day-cell', 'inactive');
            dayCell.innerHTML = `<span class="day-number">${i}</span>`;
            calendarGrid.appendChild(dayCell);
        }
    }

    function renderList() {
        eventListContainer.innerHTML = '';
        const filteredEvents = getFilteredEvents();
        
        let groupedEvents = {};
        filteredEvents.forEach(event => {
            const dateStr = event.date.toDateString();
            if (!groupedEvents[dateStr]) {
                groupedEvents[dateStr] = [];
            }
            groupedEvents[dateStr].push(event);
        });

        for (const dateStr in groupedEvents) {
            const eventGroup = document.createElement('div');
            eventGroup.classList.add('event-group');

            const dateHeader = document.createElement('div');
            dateHeader.classList.add('event-date');
            dateHeader.textContent = new Date(dateStr).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
            eventGroup.appendChild(dateHeader);

            groupedEvents[dateStr].forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.classList.add('event-item');
                eventItem.setAttribute('data-event-id', event.id);

                const title = document.createElement('div');
                title.classList.add('event-title');
                title.textContent = event.title;
                eventItem.appendChild(title);

                const details = document.createElement('div');
                details.classList.add('event-details');
                
                const typeSpan = document.createElement('span');
                typeSpan.classList.add('event-type', event.type);
                typeSpan.textContent = getEventTypeDisplayName(event.type);
                details.appendChild(typeSpan);

                eventItem.appendChild(details);
                eventGroup.appendChild(eventItem);

                if (selectedEventId === event.id) {
                    eventItem.classList.add('selected');
                }
            });
            eventListContainer.appendChild(eventGroup);
        }
    }

    function getEventTypeDisplayName(type) {
        switch (type) {
            case 'release': return '楽曲リリース';
            case 'birthday': return 'メンバー誕生日';
            case 'member-day': return 'メンバーの日';
            case 'live': return 'ライブ';
            case 'other': return 'その他・祝日';
            default: return 'その他';
        }
    }

    function getFilteredEvents() {
        const filters = {
            release: document.getElementById('release-filter').checked,
            birthday: document.getElementById('birthday-filter').checked,
            'member-day': document.getElementById('member-day-filter').checked,
            live: document.getElementById('live-filter').checked,
            other: document.getElementById('other-filter').checked
        };
        return events.filter(event => filters[event.category]);
    }

    function toggleSelected(eventId) {
        if (selectedEventId === eventId) {
            selectedEventId = null;
        } else {
            selectedEventId = eventId;
        }
        
        // Update both views
        renderCalendar();
        renderList();
    }

    // --- Event Listeners ---
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    calendarViewTab.addEventListener('click', () => {
        calendarViewTab.classList.add('active');
        listViewTab.classList.remove('active');
        calendarView.classList.add('active');
        listView.classList.remove('active');
    });

    listViewTab.addEventListener('click', () => {
        listViewTab.classList.add('active');
        calendarViewTab.classList.remove('active');
        calendarView.classList.remove('active');
        listView.classList.add('active');
    });

    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            renderCalendar();
            renderList();
        });
    });

    // Initial load
    loadEvents();
});
