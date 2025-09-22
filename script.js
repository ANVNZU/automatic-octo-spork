document.addEventListener('DOMContentLoaded', () => {
    const calendarViewBtn = document.getElementById('calendar-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const calendarView = document.getElementById('calendar-view');
    const listView = document.getElementById('list-view');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const currentMonthYearHeader = document.getElementById('current-month-year');
    const calendarGrid = document.querySelector('.calendar-grid');
    const eventList = document.getElementById('event-list');
    const selectedEventsList = document.getElementById('selected-events-list');

    const filterCheckboxes = {
        release: document.getElementById('filter-release'),
        birthday: document.getElementById('filter-birthday'),
        debut: document.getElementById('filter-debut'),
        live: document.getElementById('filter-live'),
        other: document.getElementById('filter-other')
    };

    let allEvents = []; // CSVから読み込まれ、計算されたすべてのイベント
    let currentMonth = new Date(); // 現在表示されているカレンダーの月

    let selectedEventIds = new Set(); // 選択されたイベントのIDを保持するSet

    // ====================================================================
    // ユーティリティ関数
    // ====================================================================

    /**
     * 日付をYYYY-MM-DD形式の文字列にフォーマット
     * @param {Date} date
     * @returns {string}
     */
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    /**
     * 日付をYYYY年MM月DD日の形式にフォーマット
     * @param {Date} date
     * @returns {string}
     */
    const formatJapaneseDate = (date) => {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        return `${y}年${m}月${d}日`;
    };

    /**
     * CSV文字列をパースしてオブジェクトの配列に変換
     * @param {string} csv
     * @returns {Array<Object>}
     */
    const parseCSV = (csv) => {
        const lines = csv.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(header => header.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',').map(value => value.trim());
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] || ''; // 値がない場合は空文字列
            });
            return obj;
        });
    };

    /**
     * イベントデータを計算し、記念日を追加する
     * @param {Array<Object>} rawEvents - CSVから読み込んだ生のイベントデータ
     * @returns {Array<Object>}
     */
    const calculateAnniversaries = (rawEvents) => {
        const processedEvents = [];
        let eventIdCounter = 0; // ユニークなイベントIDを生成

        rawEvents.forEach(event => {
            const baseDate = new Date(event.date);
            if (isNaN(baseDate.getTime())) {
                console.warn(`Invalid date for event: ${event.name} - ${event.date}`);
                return;
            }

            const eventType = event.type;
            const eventName = event.name;
            const eventMember = event.member;
            const eventNote = event.note;

            // 元のイベントを追加
            processedEvents.push({
                id: `event-${eventIdCounter++}`,
                date: baseDate,
                type: eventType,
                name: eventName,
                member: eventMember,
                note: eventNote,
                original: true,
                dayOffset: 0,
                yearOffset: 0
            });

            // 100日ごとの記念日 (リリース日, 誕生日のみ)
            if (eventType === 'release' || eventType === 'birthday') {
                for (let i = 1; i <= 20; i++) { // 約5年分 (365 * 5 / 100 = 18.25)
                    const dayOffset = i * 100;
                    const anniversaryDate = new Date(baseDate);
                    anniversaryDate.setDate(baseDate.getDate() + dayOffset);

                    processedEvents.push({
                        id: `event-${eventIdCounter++}`,
                        date: anniversaryDate,
                        type: eventType,
                        name: `${eventName} ${dayOffset}日記念`,
                        member: eventMember,
                        note: `（${formatJapaneseDate(baseDate)}から${dayOffset}日目）`,
                        original: false,
                        dayOffset: dayOffset,
                        yearOffset: 0
                    });
                }
            }

            // 1年ごとの記念日 (リリース日, 誕生日, デビュー記念日)
            if (eventType === 'release' || eventType === 'birthday' || eventType === 'debut') {
                const currentYear = new Date().getFullYear();
                for (let year = baseDate.getFullYear() + 1; year <= currentYear + 5; year++) { // 今年から5年先まで
                    const anniversaryDate = new Date(baseDate);
                    anniversaryDate.setFullYear(year);

                    // 閏年の日付調整 (例: 2/29が2/28になる)
                    if (anniversaryDate.getMonth() !== baseDate.getMonth() || anniversaryDate.getDate() !== baseDate.getDate()) {
                         // 2月29日生まれの人が閏年ではない年に誕生日を迎える場合など
                         // このプロジェクトでは、シンプルに日付をそのまま設定し、存在しない日付はJavaScriptが自動で調整する挙動に任せる
                         // 例: 2021/02/29 -> 2021/03/01 になるが、ここでは特に調整しない。
                         // 厳密な対応が必要な場合は、moment.jsなどのライブラリを検討
                    }

                    const yearOffset = year - baseDate.getFullYear();
                    if (yearOffset > 0) { // 0年記念日（元のイベント）は除外
                        processedEvents.push({
                            id: `event-${eventIdCounter++}`,
                            date: anniversaryDate,
                            type: eventType,
                            name: `${eventName} ${yearOffset}周年`,
                            member: eventMember,
                            note: `（${formatJapaneseDate(baseDate)}から${yearOffset}周年）`,
                            original: false,
                            dayOffset: 0,
                            yearOffset: yearOffset
                        });
                    }
                }
            }

        });
        return processedEvents;
    };

    /**
     * 表示するイベントをフィルタリングする
     * @returns {Array<Object>}
     */
    const getFilteredEvents = () => {
        const enabledTypes = Object.keys(filterCheckboxes).filter(type => filterCheckboxes[type].checked);
        return allEvents.filter(event => enabledTypes.includes(event.type));
    };

    /**
     * サイドバーの選択されたイベントリストを更新
     */
    const updateSelectedEventsList = () => {
        selectedEventsList.innerHTML = '';
        const selected = allEvents.filter(event => selectedEventIds.has(event.id));

        selected.sort((a, b) => a.date.getTime() - b.date.getTime()); // 日付でソート

        if (selected.length === 0) {
            selectedEventsList.innerHTML = '<li>選択された記念日はありません。</li>';
        } else {
            selected.forEach(event => {
                const li = document.createElement('li');
                const dateStr = formatJapaneseDate(event.date);
                let eventDisplay = `[${dateStr}] ${event.name}`;
                if (event.member) {
                    eventDisplay += ` (${event.member})`;
                }
                li.textContent = eventDisplay;
                selectedEventsList.appendChild(li);
            });
        }
    };

    /**
     * イベントを選択/非選択する
     * @param {string} eventId
     */
    const toggleEventSelection = (eventId) => {
        if (selectedEventIds.has(eventId)) {
            selectedEventIds.delete(eventId);
        } else {
            selectedEventIds.add(eventId);
        }
        updateSelectedEventsList();
        renderCalendar(currentMonth); // カレンダーを再描画して選択状態を反映
        renderListView(); // リストビューを再描画して選択状態を反映
    };

    // ====================================================================
    // カレンダービューの描画
    // ====================================================================

    /**
     * カレンダーをレンダリング
     * @param {Date} date - 表示する月のDateオブジェクト
     */
    const renderCalendar = (date) => {
        currentMonthYearHeader.textContent = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
        calendarGrid.querySelectorAll('.calendar-day').forEach(node => node.remove()); // 既存の日付セルをクリア

        const year = date.getFullYear();
        const month = date.getMonth();

        // 月の最初の日と最後の日
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // カレンダーの表示開始日 (その月の1日の前の日曜日)
        const startDay = new Date(firstDayOfMonth);
        startDay.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay()); // 日曜日に合わせる

        // カレンダーの表示終了日 (その月の最後の日以降の土曜日、最低6週分表示)
        const endDay = new Date(lastDayOfMonth);
        endDay.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay())); // 土曜日に合わせる
        
        // 最低6週表示のための調整
        let totalDays = Math.ceil((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (totalDays < 42) { // 6週 (42日) より少ない場合
            endDay.setDate(endDay.getDate() + (42 - totalDays));
        }

        const today = new Date();
        const todayStr = formatDate(today);

        const filteredEvents = getFilteredEvents();

        for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');

            const dayStr = formatDate(d);

            if (d.getMonth() !== month) {
                dayElement.classList.add('inactive');
            }
            if (dayStr === todayStr) {
                dayElement.classList.add('today');
            }
            if (d.getDay() === 0) { // Sunday
                dayElement.classList.add('sunday');
            } else if (d.getDay() === 6) { // Saturday
                dayElement.classList.add('saturday');
            }

            const dayNumber = document.createElement('div');
            dayNumber.classList.add('day-number');
            dayNumber.textContent = d.getDate();
            dayElement.appendChild(dayNumber);

            // この日のイベントを追加
            const eventsOnThisDay = filteredEvents.filter(event => formatDate(event.date) === dayStr);
            eventsOnThisDay.sort((a, b) => a.name.localeCompare(b.name, 'ja')); // 名前でソート

            eventsOnThisDay.forEach(event => {
                const eventDiv = document.createElement('div');
                eventDiv.classList.add('event');
                eventDiv.textContent = event.name;
                eventDiv.dataset.eventId = event.id; // イベントIDをデータ属性として追加

                if (selectedEventIds.has(event.id)) {
                    eventDiv.classList.add('selected');
                }

                eventDiv.addEventListener('click', (e) => {
                    e.stopPropagation(); // 親要素へのクリック伝播を防ぐ
                    toggleEventSelection(event.id);
                });
                dayElement.appendChild(eventDiv);
            });
            calendarGrid.appendChild(dayElement);
        }
    };

    // ====================================================================
    // リストビューの描画
    // ====================================================================

    /**
     * リストビューをレンダリング
     */
    const renderListView = () => {
        eventList.innerHTML = ''; // 既存のリストアイテムをクリア
        const filteredEvents = getFilteredEvents();

        // 今日の日付以降のイベントのみ表示（過去のイベントは含めない、または表示範囲を指定する）
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 時刻をリセット

        const futureEvents = filteredEvents.filter(event => event.date >= today);
        futureEvents.sort((a, b) => a.date.getTime() - b.date.getTime()); // 日付でソート

        if (futureEvents.length === 0) {
            const li = document.createElement('li');
            li.textContent = '表示するイベントがありません。';
            eventList.appendChild(li);
        } else {
            futureEvents.forEach(event => {
                const li = document.createElement('li');
                li.dataset.eventId = event.id;

                if (selectedEventIds.has(event.id)) {
                    li.classList.add('selected');
                }

                li.innerHTML = `
                    <div class="event-date">${formatJapaneseDate(event.date)}</div>
                    <div class="event-details">
                        <div class="event-title">${event.name}</div>
                        <div class="event-type">ジャンル: ${event.type} ${event.member ? `| メンバー: ${event.member}` : ''}</div>
                    </div>
                `;
                li.addEventListener('click', () => toggleEventSelection(event.id));
                eventList.appendChild(li);
            });
        }
    };


    // ====================================================================
    // イベントリスナー
    // ====================================================================

    // ビュー切り替えボタン
    calendarViewBtn.addEventListener('click', () => {
        calendarViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        calendarView.classList.add('active');
        listView.classList.remove('active');
        renderCalendar(currentMonth); // カレンダービューに切り替えたら再描画
    });

    listViewBtn.addEventListener('click', () => {
        listViewBtn.classList.add('active');
        calendarViewBtn.classList.remove('active');
        listView.classList.add('active');
        calendarView.classList.remove('active');
        renderListView(); // リストビューに切り替えたら再描画
    });

    // 月移動ボタン
    prevMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar(currentMonth);
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar(currentMonth);
    });

    // フィルターチェックボックス
    Object.values(filterCheckboxes).forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (calendarView.classList.contains('active')) {
                renderCalendar(currentMonth);
            } else {
                renderListView();
            }
        });
    });

    // ====================================================================
    // 初期化処理
    // ====================================================================

    /**
     * CSVファイルを読み込み、初期化処理を行う
     */
    const initialize = async () => {
        try {
            const response = await fetch('./data/niziu_events.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            const rawEvents = parseCSV(csvText);
            allEvents = calculateAnniversaries(rawEvents);

            // 初期表示
            renderCalendar(currentMonth);
            updateSelectedEventsList();

        } catch (error) {
            console.error('Error loading or parsing CSV:', error);
            const mainContent = document.querySelector('main.content');
            mainContent.innerHTML = '<p style="color: red;">イベントデータの読み込みに失敗しました。</p>';
        }
    };

    initialize();
});
