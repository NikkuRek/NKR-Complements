class DatePicker {
    constructor(id, containerSelector) {
        this.id = id;
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error(`DatePicker container not found: ${containerSelector}`);
            return;
        }

        window.datePickers = window.datePickers || {};
        window.datePickers[id] = this;

        this.selectedDate = null;
        this.currentDate = new Date();
        this.displayMonth = this.currentDate.getMonth();
        this.displayYear = this.currentDate.getFullYear();

        this.monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        this._createHTML();
        this._initElements();
        this._addEventListeners();
        this.renderCalendar();
    }

    _createHTML() {
        const componentHTML = `
            <div class="relative w-full mt-1" id="date-picker-component-${this.id}">
                <div class="relative group">
                    <input
                        type="text"
                        id="${this.id}"
                        readonly
                        placeholder="DD / MM / AAAA"
                        class="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer transition-all hover:bg-slate-900 font-medium text-slate-200 placeholder-slate-600 text-sm"
                    >
                    <div class="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors">
                        <i class="ph ph-calendar-blank text-lg"></i>
                    </div>
                </div>
                <div id="calendar-dropdown-${this.id}" class="hidden absolute top-full left-0 mt-2 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-3 fade-in">
                    <div class="flex items-center justify-between mb-3">
                        <button id="prev-month-${this.id}" class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors">
                            <i class="ph ph-caret-left text-base"></i>
                        </button>
                        <div class="font-semibold text-slate-100 text-sm" id="current-month-year-${this.id}"></div>
                        <button id="next-month-${this.id}" class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors">
                            <i class="ph ph-caret-right text-base"></i>
                        </button>
                    </div>
                    <div class="grid grid-cols-7 mb-2 text-center">
                        <div class="text-xs font-semibold text-slate-500">Do</div>
                        <div class="text-xs font-semibold text-slate-500">Lu</div>
                        <div class="text-xs font-semibold text-slate-500">Ma</div>
                        <div class="text-xs font-semibold text-slate-500">Mi</div>
                        <div class="text-xs font-semibold text-slate-500">Ju</div>
                        <div class="text-xs font-semibold text-slate-500">Vi</div>
                        <div class="text-xs font-semibold text-slate-500">Sa</div>
                    </div>
                    <div class="grid grid-cols-7 gap-1" id="calendar-days-${this.id}"></div>
                </div>
            </div>
        `;
        this.container.insertAdjacentHTML('beforeend', componentHTML);
    }

    _initElements() {
        this.component = document.getElementById(`date-picker-component-${this.id}`);
        this.dateInput = document.getElementById(this.id);
        this.calendarDropdown = document.getElementById(`calendar-dropdown-${this.id}`);
        this.currentMonthYearEl = document.getElementById(`current-month-year-${this.id}`);
        this.calendarDaysEl = document.getElementById(`calendar-days-${this.id}`);
        this.prevBtn = document.getElementById(`prev-month-${this.id}`);
        this.nextBtn = document.getElementById(`next-month-${this.id}`);
    }

    _addEventListeners() {
        this.prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.displayMonth--;
            if (this.displayMonth < 0) {
                this.displayMonth = 11;
                this.displayYear--;
            }
            this.renderCalendar();
        });

        this.nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.displayMonth++;
            if (this.displayMonth > 11) {
                this.displayMonth = 0;
                this.displayYear++;
            }
            this.renderCalendar();
        });

        this.dateInput.addEventListener('click', () => {
            this.calendarDropdown.classList.toggle('hidden');
            if (!this.calendarDropdown.classList.contains('hidden')) {
                if (this.selectedDate) {
                    this.displayMonth = this.selectedDate.getMonth();
                    this.displayYear = this.selectedDate.getFullYear();
                } else { // If no date is selected, show current month
                    const today = new Date();
                    this.displayMonth = today.getMonth();
                    this.displayYear = today.getFullYear();
                }
                this.renderCalendar();
            }
        });

        document.addEventListener('click', (e) => {
            if (this.component && !this.component.contains(e.target)) {
                this.calendarDropdown.classList.add('hidden');
            }
        });
    }

    formatDate(date) {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    isSameDay(d1, d2) {
        return d1 && d2 &&
               d1.getDate() === d2.getDate() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getFullYear() === d2.getFullYear();
    }

    renderCalendar() {
        this.currentMonthYearEl.textContent = `${this.monthNames[this.displayMonth]} ${this.displayYear}`;
        this.calendarDaysEl.innerHTML = '';

        const firstDayOfMonth = new Date(this.displayYear, this.displayMonth, 1).getDay();
        const daysInMonth = new Date(this.displayYear, this.displayMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(this.displayYear, this.displayMonth, 0).getDate();

        for (let i = 0; i < firstDayOfMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.textContent = daysInPrevMonth - firstDayOfMonth + 1 + i;
            dayDiv.className = "h-7 w-7 flex items-center justify-center text-slate-700 text-xs pointer-events-none";
            this.calendarDaysEl.appendChild(dayDiv);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayBtn = document.createElement('button');
            dayBtn.textContent = day;
            dayBtn.type = 'button';
            
            const dateToCheck = new Date(this.displayYear, this.displayMonth, day);
            const isToday = this.isSameDay(dateToCheck, new Date());
            const isSelected = this.isSameDay(dateToCheck, this.selectedDate);

            let classes = "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 hover:bg-slate-800 hover:text-blue-400 focus:outline-none";

            if (isSelected) {
                classes += " bg-blue-600 text-white shadow-md hover:bg-blue-500 hover:text-white transform scale-105";
            } else if (isToday) {
                classes += " text-blue-400 border border-blue-500/50 font-bold bg-blue-900/20";
            } else {
                classes += " text-slate-300";
            }

            dayBtn.className = classes;

            dayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedDate = new Date(this.displayYear, this.displayMonth, day);
                
                const displayDay = String(this.selectedDate.getDate()).padStart(2, '0');
                const displayMonth = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
                const displayYear = this.selectedDate.getFullYear();
                this.dateInput.value = `${displayDay}/${displayMonth}/${displayYear}`;

                // Set a data attribute with the ISO date for easy access from other scripts
                this.dateInput.dataset.isoDate = this.formatDate(this.selectedDate);

                this.dateInput.dispatchEvent(new Event('change', { bubbles: true }));

                this.renderCalendar();
                setTimeout(() => {
                    this.calendarDropdown.classList.add('hidden');
                }, 150);
            });

            this.calendarDaysEl.appendChild(dayBtn);
        }
    }

    getValue() {
        return this.formatDate(this.selectedDate);
    }
    
    setValue(isoDate) {
        if (isoDate) {
            const date = new Date(isoDate); // ISO format YYYY-MM-DD is parsed correctly
            // Check for invalid date
            if (!isNaN(date.getTime())) {
                // Adjust for timezone offset to avoid date shifts
                const userTimezoneOffset = date.getTimezoneOffset() * 60000;
                this.selectedDate = new Date(date.getTime() + userTimezoneOffset);

                const displayDay = String(this.selectedDate.getDate()).padStart(2, '0');
                const displayMonth = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
                const displayYear = this.selectedDate.getFullYear();
                this.dateInput.value = `${displayDay}/${displayMonth}/${displayYear}`;
                this.dateInput.dataset.isoDate = this.formatDate(this.selectedDate);
            } else {
                 this.selectedDate = null;
                this.dateInput.value = '';
                this.dateInput.dataset.isoDate = '';
            }
        } else {
            this.selectedDate = null;
            this.dateInput.value = '';
            this.dateInput.dataset.isoDate = '';
        }
        this.renderCalendar();
    }
}
