(function () {
    'use strict';

    // VS Code API
    const vscode = acquireVsCodeApi();

    // Application state
    let currentData = null;
    let currentTab = 'dashboard';
    let editingItem = null;

    // DOM elements
    const elements = {
        // Navigation
        tabs: document.querySelectorAll('.tab'),
        views: document.querySelectorAll('.view'),

        // Header
        projectName: document.getElementById('project-name'),
        lastUpdated: document.getElementById('last-updated'),
        addItemBtn: document.getElementById('add-item-btn'),
        exportBtn: document.getElementById('export-btn'),

        // Counts
        featuresCount: document.getElementById('features-count'),
        bugsCount: document.getElementById('bugs-count'),
        tasksCount: document.getElementById('tasks-count'),

        // Lists
        featuresList: document.getElementById('features-list'),
        bugsList: document.getElementById('bugs-list'),
        tasksList: document.getElementById('tasks-list'),

        // Dashboard
        projectStats: document.getElementById('project-stats'),
        recentActivity: document.getElementById('recent-activity'),
        highPriority: document.getElementById('high-priority'),

        // Filters
        featuresFilter: document.getElementById('features-filter'),
        bugsFilter: document.getElementById('bugs-filter'),
        tasksFilter: document.getElementById('tasks-filter'),

        // Modal
        modal: document.getElementById('item-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalClose: document.getElementById('modal-close'),
        itemForm: document.getElementById('item-form'),
        cancelBtn: document.getElementById('cancel-btn'),
        saveBtn: document.getElementById('save-btn'),

        // Form fields
        itemType: document.getElementById('item-type'),
        itemTitle: document.getElementById('item-title'),
        itemDescription: document.getElementById('item-description'),
        itemStatus: document.getElementById('item-status'),
        itemPriority: document.getElementById('item-priority'),
        itemAssignee: document.getElementById('item-assignee'),
        itemTags: document.getElementById('item-tags'),
        typeSpecificFields: document.getElementById('type-specific-fields'),

        // Loading
        loading: document.getElementById('loading')
    };

    // Initialize the application
    function init() {
        setupEventListeners();
        setupMessageHandler();
        loadData();
    }

    // Event listeners
    function setupEventListeners() {
        // Tab navigation
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                switchTab(tabName);
            });
        });

        // Header actions
        elements.addItemBtn.addEventListener('click', () => openModal());
        elements.exportBtn.addEventListener('click', () => exportData());

        // Modal controls
        elements.modalClose.addEventListener('click', () => closeModal());
        elements.cancelBtn.addEventListener('click', () => closeModal());
        elements.itemForm.addEventListener('submit', handleFormSubmit);

        // Form type change
        elements.itemType.addEventListener('change', updateFormFields);

        // Filters
        elements.featuresFilter.addEventListener('change', () => filterItems('features'));
        elements.bugsFilter.addEventListener('change', () => filterItems('bugs'));
        elements.tasksFilter.addEventListener('change', () => filterItems('tasks'));

        // Click outside modal to close
        elements.modal.addEventListener('click', (e) => {
            if (e.target === elements.modal) {
                closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    // Message handler for VS Code communication
    function setupMessageHandler() {
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'dataLoaded':
                    currentData = message.data;
                    updateUI();
                    hideLoading();
                    break;

                case 'dataLoadError':
                    showError('Failed to load project data: ' + message.error);
                    hideLoading();
                    break;

                case 'itemCreated':
                case 'itemUpdated':
                case 'itemDeleted':
                    // Data will be refreshed automatically
                    closeModal();
                    break;

                default:
                    console.warn('Unknown message:', message);
            }
        });
    }

    // Load data from extension
    function loadData() {
        showLoading();
        vscode.postMessage({ command: 'loadData' });
    }

    // Update the entire UI with current data
    function updateUI() {
        if (!currentData) return;

        updateHeader();
        updateCounts();
        updateDashboard();
        updateLists();
    }

    // Update header information
    function updateHeader() {
        elements.projectName.textContent = currentData.metadata.projectName;
        elements.lastUpdated.textContent = `Last updated: ${formatDate(currentData.metadata.lastUpdated)}`;
    }

    // Update item counts
    function updateCounts() {
        elements.featuresCount.textContent = currentData.features.length;
        elements.bugsCount.textContent = currentData.bugs.length;
        elements.tasksCount.textContent = currentData.tasks.length;
    }

    // Update dashboard statistics
    function updateDashboard() {
        updateProjectStats();
        updateRecentActivity();
        updateHighPriority();
    }

    // Update project statistics
    function updateProjectStats() {
        const stats = calculateStats();

        elements.projectStats.innerHTML = `
      <div class="stat-item">
        <span class="stat-number">${stats.totalItems}</span>
        <span class="stat-label">Total Items</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${stats.completed}</span>
        <span class="stat-label">Completed</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${stats.inProgress}</span>
        <span class="stat-label">In Progress</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${stats.highPriority}</span>
        <span class="stat-label">High Priority</span>
      </div>
    `;
    }

    // Calculate project statistics
    function calculateStats() {
        const allItems = [
            ...currentData.features,
            ...currentData.bugs,
            ...currentData.tasks
        ];

        return {
            totalItems: allItems.length,
            completed: allItems.filter(item =>
                ['completed', 'resolved', 'closed'].includes(item.status)
            ).length,
            inProgress: allItems.filter(item =>
                item.status === 'in-progress'
            ).length,
            highPriority: allItems.filter(item =>
                ['high', 'critical'].includes(item.priority)
            ).length
        };
    }

    // Update recent activity
    function updateRecentActivity() {
        const allItems = [
            ...currentData.features,
            ...currentData.bugs,
            ...currentData.tasks
        ];

        const recentItems = allItems
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 5);

        if (recentItems.length === 0) {
            elements.recentActivity.innerHTML = '<p class="empty-state">No recent activity</p>';
            return;
        }

        elements.recentActivity.innerHTML = recentItems.map(item => `
      <div class="activity-item">
        <svg class="activity-icon" viewBox="0 0 24 24" fill="none">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="activity-content">
          <div class="activity-title">${escapeHtml(item.title)}</div>
          <div class="activity-time">${formatRelativeTime(item.updatedAt)}</div>
        </div>
      </div>
    `).join('');
    }

    // Update high priority items
    function updateHighPriority() {
        const allItems = [
            ...currentData.features,
            ...currentData.bugs,
            ...currentData.tasks
        ];

        const highPriorityItems = allItems
            .filter(item => ['high', 'critical'].includes(item.priority))
            .filter(item => !['completed', 'resolved', 'closed'].includes(item.status))
            .sort((a, b) => {
                const priorityOrder = { critical: 0, high: 1 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            })
            .slice(0, 5);

        if (highPriorityItems.length === 0) {
            elements.highPriority.innerHTML = '<p class="empty-state">No high priority items</p>';
            return;
        }

        elements.highPriority.innerHTML = highPriorityItems.map(item => `
      <div class="priority-item" onclick="editItem('${item.type}', '${item.id}')">
        <div class="priority-content">
          <div class="priority-title">${escapeHtml(item.title)}</div>
          <div class="priority-meta">
            <span class="priority-type">${item.type}</span>
            <span class="priority-badge ${item.priority}">${item.priority}</span>
          </div>
        </div>
      </div>
    `).join('');
    }

    // Update item lists
    function updateLists() {
        updateItemList('features', currentData.features, elements.featuresList);
        updateItemList('bugs', currentData.bugs, elements.bugsList);
        updateItemList('tasks', currentData.tasks, elements.tasksList);
    }

    // Update a specific item list
    function updateItemList(type, items, container) {
        if (items.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3>No ${type} yet</h3>
          <p>Create your first ${type.slice(0, -1)} to get started</p>
        </div>
      `;
            return;
        }

        container.innerHTML = items.map(item => createItemCard(item)).join('');
    }

    // Create an item card HTML
    function createItemCard(item) {
        const typeSpecificInfo = getTypeSpecificInfo(item);

        return `
      <div class="item-card">
        <div class="item-header">
          <h3 class="item-title">${escapeHtml(item.title)}</h3>
          <span class="item-type ${item.type}">${item.type}</span>
        </div>
        
        <p class="item-description">${escapeHtml(item.description)}</p>
        
        ${typeSpecificInfo}
        
        <div class="item-meta">
          <span class="status-badge ${item.status}">${item.status.replace('-', ' ')}</span>
          <span class="priority-badge ${item.priority}">${item.priority}</span>
          
          ${item.assignee ? `<span class="assignee">👤 ${escapeHtml(item.assignee)}</span>` : ''}
          
          ${item.tags.length > 0 ? `
            <div class="tags">
              ${item.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}
          
          <div class="item-actions">
            <button class="btn btn-secondary" onclick="editItem('${item.type}', '${item.id}')">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Edit
            </button>
            <button class="btn btn-danger" onclick="deleteItem('${item.type}', '${item.id}')">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
    }

    // Get type-specific information for display
    function getTypeSpecificInfo(item) {
        switch (item.type) {
            case 'feature':
                return `
          ${item.epic ? `<p><strong>Epic:</strong> ${escapeHtml(item.epic)}</p>` : ''}
          ${item.storyPoints ? `<p><strong>Story Points:</strong> ${item.storyPoints}</p>` : ''}
          ${item.acceptanceCriteria.length > 0 ? `
            <div>
              <strong>Acceptance Criteria:</strong>
              <ul>
                ${item.acceptanceCriteria.map(criteria => `<li>${escapeHtml(criteria)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        `;

            case 'bug':
                return `
          <p><strong>Severity:</strong> <span class="priority-badge ${item.severity}">${item.severity}</span></p>
          <p><strong>Reproducible:</strong> ${item.reproducible ? 'Yes' : 'No'}</p>
          <p><strong>Environment:</strong> ${escapeHtml(item.environment)}</p>
          ${item.stepsToReproduce.length > 0 ? `
            <div>
              <strong>Steps to Reproduce:</strong>
              <ol>
                ${item.stepsToReproduce.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
              </ol>
            </div>
          ` : ''}
          ${item.resolution ? `<p><strong>Resolution:</strong> ${escapeHtml(item.resolution)}</p>` : ''}
        `;

            case 'task':
                return `
          ${item.dueDate ? `<p><strong>Due Date:</strong> ${formatDate(item.dueDate)}</p>` : ''}
          ${item.estimatedHours ? `<p><strong>Estimated Hours:</strong> ${item.estimatedHours}</p>` : ''}
          ${item.actualHours ? `<p><strong>Actual Hours:</strong> ${item.actualHours}</p>` : ''}
          ${item.subtasks.length > 0 ? `
            <div>
              <strong>Subtasks:</strong>
              <ul>
                ${item.subtasks.map(subtask => `<li>${escapeHtml(subtask)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        `;

            default:
                return '';
        }
    }

    // Tab switching
    function switchTab(tabName) {
        // Update active tab
        elements.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update active view
        elements.views.forEach(view => {
            view.classList.toggle('active', view.id === `${tabName}-view`);
        });

        currentTab = tabName;
    }

    // Filter items in lists
    function filterItems(type) {
        const filter = elements[`${type}Filter`].value;
        const items = currentData[type];

        const filteredItems = filter ?
            items.filter(item => item.status === filter) :
            items;

        updateItemList(type, filteredItems, elements[`${type}List`]);
    }

    // Modal operations
    function openModal(item = null) {
        editingItem = item;

        if (item) {
            elements.modalTitle.textContent = `Edit ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`;
            populateForm(item);
        } else {
            elements.modalTitle.textContent = 'Add New Item';
            elements.itemForm.reset();
            elements.itemType.value = 'feature';
            updateFormFields();
        }

        elements.modal.classList.add('active');
    }

    function closeModal() {
        elements.modal.classList.remove('active');
        editingItem = null;
        elements.itemForm.reset();
    }

    // Populate form with item data
    function populateForm(item) {
        elements.itemType.value = item.type;
        elements.itemTitle.value = item.title;
        elements.itemDescription.value = item.description;
        elements.itemPriority.value = item.priority;
        elements.itemAssignee.value = item.assignee || '';
        elements.itemTags.value = item.tags.join(', ');

        updateFormFields();

        elements.itemStatus.value = item.status;

        // Populate type-specific fields
        const typeFields = elements.typeSpecificFields;
        switch (item.type) {
            case 'feature':
                typeFields.querySelector('#epic')?.setvalue = item.epic || '';
                typeFields.querySelector('#story-points')?.setvalue = item.storyPoints || '';
                typeFields.querySelector('#acceptance-criteria')?.setvalue = item.acceptanceCriteria.join('\n');
                break;

            case 'bug':
                typeFields.querySelector('#severity').value = item.severity;
                typeFields.querySelector('#reproducible').checked = item.reproducible;
                typeFields.querySelector('#environment').value = item.environment;
                typeFields.querySelector('#steps-to-reproduce').value = item.stepsToReproduce.join('\n');
                typeFields.querySelector('#resolution').value = item.resolution || '';
                break;

            case 'task':
                typeFields.querySelector('#due-date').value = item.dueDate || '';
                typeFields.querySelector('#estimated-hours').value = item.estimatedHours || '';
                typeFields.querySelector('#actual-hours').value = item.actualHours || '';
                typeFields.querySelector('#subtasks').value = item.subtasks.join('\n');
                break;
        }
    }

    // Update form fields based on selected type
    function updateFormFields() {
        const type = elements.itemType.value;
        updateStatusOptions(type);
        updateTypeSpecificFields(type);
    }

    // Update status options based on type
    function updateStatusOptions(type) {
        const statusOptions = {
            feature: ['backlog', 'planning', 'in-progress', 'testing', 'completed'],
            bug: ['open', 'in-progress', 'resolved', 'closed', 'wont-fix'],
            task: ['todo', 'in-progress', 'blocked', 'completed']
        };

        const currentValue = elements.itemStatus.value;
        elements.itemStatus.innerHTML = statusOptions[type]
            .map(status => `<option value="${status}">${status.replace('-', ' ')}</option>`)
            .join('');

        // Restore value if it's valid for the new type
        if (statusOptions[type].includes(currentValue)) {
            elements.itemStatus.value = currentValue;
        }
    }

    // Update type-specific form fields
    function updateTypeSpecificFields(type) {
        const typeFields = elements.typeSpecificFields;

        switch (type) {
            case 'feature':
                typeFields.innerHTML = `
          <h4>Feature Details</h4>
          <div class="form-group">
            <label for="epic">Epic</label>
            <input type="text" id="epic" name="epic">
          </div>
          <div class="form-group">
            <label for="story-points">Story Points</label>
            <input type="number" id="story-points" name="storyPoints" min="1" max="21">
          </div>
          <div class="form-group">
            <label for="acceptance-criteria">Acceptance Criteria (one per line)</label>
            <textarea id="acceptance-criteria" name="acceptanceCriteria" rows="4" placeholder="Enter acceptance criteria, one per line"></textarea>
          </div>
        `;
                break;

            case 'bug':
                typeFields.innerHTML = `
          <h4>Bug Details</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="severity">Severity</label>
              <select id="severity" name="severity" required>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div class="form-group">
              <label for="reproducible">
                <input type="checkbox" id="reproducible" name="reproducible">
                Reproducible
              </label>
            </div>
          </div>
          <div class="form-group">
            <label for="environment">Environment</label>
            <input type="text" id="environment" name="environment" required placeholder="e.g., Chrome 98, iOS 15.2, Windows 11">
          </div>
          <div class="form-group">
            <label for="steps-to-reproduce">Steps to Reproduce (one per line)</label>
            <textarea id="steps-to-reproduce" name="stepsToReproduce" rows="4" required placeholder="1. Open the application&#10;2. Click on...&#10;3. Expected vs actual result"></textarea>
          </div>
          <div class="form-group">
            <label for="resolution">Resolution</label>
            <textarea id="resolution" name="resolution" rows="2" placeholder="How was this bug resolved?"></textarea>
          </div>
        `;
                break;

            case 'task':
                typeFields.innerHTML = `
          <h4>Task Details</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="due-date">Due Date</label>
              <input type="date" id="due-date" name="dueDate">
            </div>
            <div class="form-group">
              <label for="estimated-hours">Estimated Hours</label>
              <input type="number" id="estimated-hours" name="estimatedHours" min="0" step="0.5">
            </div>
          </div>
          <div class="form-group">
            <label for="actual-hours">Actual Hours</label>
            <input type="number" id="actual-hours" name="actualHours" min="0" step="0.5">
          </div>
          <div class="form-group">
            <label for="subtasks">Subtasks (one per line)</label>
            <textarea id="subtasks" name="subtasks" rows="4" placeholder="Enter subtasks, one per line"></textarea>
          </div>
        `;
                break;

            default:
                typeFields.innerHTML = '';
        }
    }

    // Handle form submission
    function handleFormSubmit(e) {
        e.preventDefault();

        const formData = new FormData(elements.itemForm);
        const data = {};

        // Convert FormData to object
        for (const [key, value] of formData.entries()) {
            if (key === 'reproducible') {
                data[key] = value === 'on';
            } else if (key === 'storyPoints' || key === 'estimatedHours' || key === 'actualHours') {
                data[key] = value ? parseFloat(value) : undefined;
            } else {
                data[key] = value || undefined;
            }
        }

        // Handle tags
        data.tags = data.tags || '';

        // Handle type-specific arrays
        const type = data.type;
        if (type === 'feature' && data.acceptanceCriteria) {
            data.acceptanceCriteria = data.acceptanceCriteria;
        }
        if (type === 'bug' && data.stepsToReproduce) {
            data.stepsToReproduce = data.stepsToReproduce;
        }
        if (type === 'task' && data.subtasks) {
            data.subtasks = data.subtasks;
        }

        // Remove undefined values
        Object.keys(data).forEach(key => {
            if (data[key] === undefined || data[key] === '') {
                delete data[key];
            }
        });

        showLoading();

        if (editingItem) {
            data.id = editingItem.id;
            vscode.postMessage({
                command: 'updateItem',
                data: data
            });
        } else {
            vscode.postMessage({
                command: 'createItem',
                data: data
            });
        }
    }

    // Global functions for item actions
    window.editItem = function (type, id) {
        const items = currentData[type + 's'] || [];
        const item = items.find(i => i.id === id);
        if (item) {
            openModal(item);
        }
    };

    window.deleteItem = function (type, id) {
        if (confirm(`Are you sure you want to delete this ${type}?`)) {
            showLoading();
            vscode.postMessage({
                command: 'deleteItem',
                data: { type, id }
            });
        }
    };

    // Export data
    function exportData() {
        vscode.postMessage({ command: 'exportData' });
    }

    // Utility functions
    function showLoading() {
        elements.loading.classList.add('active');
    }

    function hideLoading() {
        elements.loading.classList.remove('active');
    }

    function showError(message) {
        vscode.postMessage({
            command: 'showError',
            data: { message }
        });
    }

    function showSuccess(message) {
        vscode.postMessage({
            command: 'showSuccess',
            data: { message }
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    function formatRelativeTime(dateString) {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            if (diffDays > 0) {
                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            } else if (diffHours > 0) {
                return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else if (diffMinutes > 0) {
                return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
            } else {
                return 'Just now';
            }
        } catch {
            return dateString;
        }
    }

    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N: New item
        if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !elements.modal.classList.contains('active')) {
            e.preventDefault();
            openModal();
        }

        // Ctrl/Cmd + E: Export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !elements.modal.classList.contains('active')) {
            e.preventDefault();
            exportData();
        }

        // Tab navigation with numbers
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const tabs = ['dashboard', 'features', 'bugs', 'tasks'];
            const tabIndex = parseInt(e.key) - 1;
            if (tabs[tabIndex]) {
                switchTab(tabs[tabIndex]);
            }
        }
    });

    // Accessibility improvements
    function setupAccessibility() {
        // Add ARIA labels
        elements.addItemBtn.setAttribute('aria-label', 'Add new item');
        elements.exportBtn.setAttribute('aria-label', 'Export project data');
        elements.modalClose.setAttribute('aria-label', 'Close modal');

        // Add keyboard navigation for tabs
        elements.tabs.forEach((tab, index) => {
            tab.setAttribute('tabindex', '0');
            tab.setAttribute('role', 'tab');
            tab.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    tab.click();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const direction = e.key === 'ArrowLeft' ? -1 : 1;
                    const nextIndex = (index + direction + elements.tabs.length) % elements.tabs.length;
                    elements.tabs[nextIndex].focus();
                }
            });
        });

        // Modal focus management
        const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

        elements.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const focusable = elements.modal.querySelectorAll(focusableElements);
                const firstFocusable = focusable[0];
                const lastFocusable = focusable[focusable.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
    }

    // Performance optimization: Debounce filter updates
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Debounced filter function
    const debouncedFilter = debounce((type) => {
        filterItems(type);
    }, 300);

    // Update filter event listeners to use debounced version
    function setupDebouncedFilters() {
        elements.featuresFilter.removeEventListener('change', () => filterItems('features'));
        elements.bugsFilter.removeEventListener('change', () => filterItems('bugs'));
        elements.tasksFilter.removeEventListener('change', () => filterItems('tasks'));

        elements.featuresFilter.addEventListener('change', () => debouncedFilter('features'));
        elements.bugsFilter.addEventListener('change', () => debouncedFilter('bugs'));
        elements.tasksFilter.addEventListener('change', () => debouncedFilter('tasks'));
    }

    // Initialize the application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            setupAccessibility();
            setupDebouncedFilters();
        });
    } else {
        init();
        setupAccessibility();
        setupDebouncedFilters();
    }

})();