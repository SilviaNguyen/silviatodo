// renderer.js

const { ipcRenderer } = require('electron');
const Store = require('electron-store');
const store = new Store();

window.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const closeBtn = document.getElementById('close-btn');
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');

    // Navigation elements
    const navListViewBtn = document.getElementById('nav-list-view');
    const navCalendarViewBtn = document.getElementById('nav-calendar-view');

    const listView = document.getElementById('list-view');
    const calendarView = document.getElementById('calendar-view');

    const todoInput = document.getElementById('todo-input');
    const dueDateInput = document.getElementById('due-date-input');
    const priorityInput = document.getElementById('priority-input');
    const todoList = document.getElementById('todo-list');

    // LẤY NÚT THÊM MỚI
    const addTodoBtn = document.getElementById('add-todo-btn');

    const weekRangeHeader = document.getElementById('week-range-header');
    const weeklyGrid = document.getElementById('weekly-calendar-grid');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');

    let currentDate = new Date(); // The date to determine the current week

    // --- Window Controls ---
    closeBtn.addEventListener('click', () => ipcRenderer.send('close-app'));
    minimizeBtn.addEventListener('click', () => ipcRenderer.send('minimize-app'));
    maximizeBtn.addEventListener('click', () => ipcRenderer.send('maximize-app'));

    // --- Data Persistence ---
    const saveTodos = () => {
        const todos = [];
        document.querySelectorAll('#todo-list li').forEach(li => {
            if (li.dataset.id) {
                todos.push({
                    id: li.dataset.id,
                    text: li.querySelector('.task-text').textContent,
                    completed: li.classList.contains('completed'),
                    dueDate: li.dataset.dueDate || '',
                    priority: li.dataset.priority || 'p2'
                });
            }
        });
        store.set('todos', todos);
        renderWeeklyCalendar(); // Cập nhật lịch mỗi khi lưu
    };

    // --- UI Rendering ---
    const createTodoElement = (todo) => {
        const li = document.createElement('li');
        li.dataset.id = todo.id;
        li.dataset.dueDate = todo.dueDate || '';
        li.dataset.priority = todo.priority || 'p2';
        li.classList.add('priority-' + (todo.priority || 'p2'));
        if (todo.completed) li.classList.add('completed');

        const taskContent = document.createElement('div');
        taskContent.classList.add('task-content');
        const taskSpan = document.createElement('span');
        taskSpan.classList.add('task-text');
        taskSpan.textContent = todo.text;
        taskContent.appendChild(taskSpan);

        if (todo.dueDate) {
            const dueDateSpan = document.createElement('span');
            dueDateSpan.classList.add('due-date');
            try {
                const [year, month, day] = todo.dueDate.split('-');
                dueDateSpan.textContent = `Due: ${day}/${month}/${year}`;
            } catch (e) {
                dueDateSpan.textContent = `Due: Invalid Date`;
            }
            taskContent.appendChild(dueDateSpan);
        }
        li.appendChild(taskContent);

        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('buttons-container');

        const completeBtn = document.createElement('button');
        completeBtn.innerHTML = '<i class="fas fa-check"></i>';
        completeBtn.classList.add('action-btn', 'complete-btn');
        completeBtn.title = 'Complete';
        buttonsContainer.appendChild(completeBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.classList.add('action-btn', 'delete-btn');
        deleteBtn.title = 'Delete';
        buttonsContainer.appendChild(deleteBtn);

        li.appendChild(buttonsContainer);
        return li;
    };

    const loadTodos = () => {
        todoList.innerHTML = '';
        const todos = store.get('todos') || [];

        // Sắp xếp: công việc chưa hoàn thành (false=0) lên trước, đã hoàn thành (true=1) xuống dưới
        todos.sort((a, b) => a.completed - b.completed);

        todos.forEach(todo => {
            const todoElement = createTodoElement(todo);
            todoList.appendChild(todoElement);
        });
    };

    // --- Weekly Calendar Logic ---
    const renderWeeklyCalendar = () => {
        weeklyGrid.innerHTML = '';
        const todos = store.get('todos') || [];
        const week = getWeek(currentDate);

        const start = week[0];
        const end = week[6];
        weekRangeHeader.textContent = `${start.getDate()} ${start.toLocaleString('en-us', { month: 'short' })} - ${end.getDate()} ${end.toLocaleString('en-us', { month: 'short' })}, ${end.getFullYear()}`;

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        week.forEach((day, index) => {
            const dayColumn = document.createElement('div');
            dayColumn.classList.add('day-column');

            const dayHeader = document.createElement('div');
            dayHeader.classList.add('day-header');
            dayHeader.innerHTML = `<span>${dayNames[index]}</span><span class="day-number">${day.getDate()}</span>`;
            if (isToday(day)) {
                dayHeader.querySelector('.day-number').classList.add('today');
            }
            dayColumn.appendChild(dayHeader);

            const tasksContainer = document.createElement('div');
            tasksContainer.classList.add('calendar-tasks');

            const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
            const tasksForDay = todos.filter(t => t.dueDate === dateStr && !t.completed);

            tasksForDay.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.classList.add('calendar-task', `priority-${task.priority}`);
                taskElement.textContent = task.text;
                tasksContainer.appendChild(taskElement);
            });

            dayColumn.appendChild(tasksContainer);
            weeklyGrid.appendChild(dayColumn);
        });
    };

    const getWeek = (date) => {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Get Sunday
        const week = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            week.push(day);
        }
        return week;
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // --- Event Handlers ---
    const addTodo = () => {
        const todoText = todoInput.value.trim();
        if (todoText !== '') {
            const newTodo = {
                id: Date.now().toString(),
                text: todoText,
                completed: false,
                dueDate: dueDateInput.value,
                priority: priorityInput.value
            };
            const todoElement = createTodoElement(newTodo);
            todoList.prepend(todoElement); // Thêm vào đầu danh sách
            todoInput.value = '';
            dueDateInput.value = '';
            priorityInput.value = 'p2';
            saveTodos();
            loadTodos(); // Tải lại để đảm bảo thứ tự đúng
        }
    };

    const handleListClick = (event) => {
        const target = event.target;
        const listItem = target.closest('li');
        if (!listItem) return;

        if (target.matches('.task-text')) {
            target.contentEditable = 'true';
            target.focus();
            target.addEventListener('blur', () => {
                target.contentEditable = 'false';
                // Cập nhật text trong store
                const todoId = listItem.dataset.id;
                const todos = store.get('todos') || [];
                const todoToUpdate = todos.find(t => t.id === todoId);
                if (todoToUpdate) {
                    todoToUpdate.text = target.textContent;
                    store.set('todos', todos);
                }
            }, { once: true });
            target.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    target.blur();
                }
            });
            return;
        }

        const actionBtn = target.closest('.action-btn');
        if (!actionBtn) return;

        let needsResort = false;

        if (actionBtn.classList.contains('complete-btn')) {
            listItem.classList.toggle('completed');
            needsResort = true;
        } else if (actionBtn.classList.contains('delete-btn')) {
            listItem.remove();
        }

        saveTodos();

        if (needsResort) {
            loadTodos(); // Tải lại để sắp xếp
        }
    };

    const switchView = (viewToShow) => {
        if (viewToShow === 'list') {
            listView.classList.add('active');
            calendarView.classList.remove('active');
            navListViewBtn.classList.add('active');
            navCalendarViewBtn.classList.remove('active');
        } else {
            listView.classList.remove('active');
            calendarView.classList.add('active');
            navListViewBtn.classList.remove('active');
            navCalendarViewBtn.classList.add('active');
            renderWeeklyCalendar();
        }
    };

    navListViewBtn.addEventListener('click', () => switchView('list'));
    navCalendarViewBtn.addEventListener('click', () => switchView('calendar'));

    prevWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 7);
        renderWeeklyCalendar();
    });

    nextWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 7);
        renderWeeklyCalendar();
    });

    // --- Initialization ---
    // THÊM SỰ KIỆN CLICK CHO NÚT MỚI
    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodo(); });
    todoList.addEventListener('click', handleListClick);

    loadTodos();
    renderWeeklyCalendar();
});
