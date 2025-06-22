import { DataManager } from '@/services/DataManager';
import * as vscode from 'vscode';

export class ProjectManagerWebviewProvider {
    private static readonly viewType = 'projectManager.dashboard';
    private panel: vscode.WebviewPanel | undefined;
    private dataManager: DataManager;

    constructor(private context: vscode.ExtensionContext) {
        this.dataManager = DataManager.getInstance();
    }

    public async show(): Promise<void> {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            ProjectManagerWebviewProvider.viewType,
            'Project Manager Pro',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                    vscode.Uri.joinPath(this.context.extensionUri, 'dist')
                ]
            }
        );

        this.panel.iconPath = {
            light: vscode.Uri.joinPath(this.context.extensionUri, 'media', 'icon-light.svg'),
            dark: vscode.Uri.joinPath(this.context.extensionUri, 'media', 'icon-dark.svg')
        };

        this.panel.webview.html = await this.getWebviewContent();
        this.setupWebviewMessageHandling();

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        // Load initial data
        await this.sendDataToWebview();
    }

    private async getWebviewContent(): Promise<string> {
        const stylesUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles.css')
        );
        const scriptUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'script.js')
        );

        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${stylesUri}" rel="stylesheet">
        <title>Project Manager Pro</title>
      </head>
      <body>
        <div id="app">
          <header class="header">
            <div class="header-content">
              <div class="header-left">
                <h1 class="logo">
                  <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Project Manager Pro
                </h1>
                <div class="project-info">
                  <span id="project-name" class="project-name"></span>
                  <span id="last-updated" class="last-updated"></span>
                </div>
              </div>
              <div class="header-actions">
                <button id="add-item-btn" class="btn btn-primary">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  Add Item
                </button>
                <button id="export-btn" class="btn btn-secondary">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5-5 5 5m-5-5v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Export
                </button>
              </div>
            </div>
          </header>

          <nav class="tabs">
            <button class="tab active" data-tab="dashboard">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
              </svg>
              Dashboard
            </button>
            <button class="tab" data-tab="features">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Features <span id="features-count" class="count">0</span>
            </button>
            <button class="tab" data-tab="bugs">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M8 2v4m8-4v4M6 8h12l-1 12H7L6 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Bugs <span id="bugs-count" class="count">0</span>
            </button>
            <button class="tab" data-tab="tasks">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Tasks <span id="tasks-count" class="count">0</span>
            </button>
          </nav>

          <main class="main">
            <div id="dashboard-view" class="view active">
              <div class="dashboard-grid">
                <div class="stats-card">
                  <h3>Project Overview</h3>
                  <div id="project-stats" class="stats"></div>
                </div>
                <div class="activity-card">
                  <h3>Recent Activity</h3>
                  <div id="recent-activity" class="activity-list"></div>
                </div>
                <div class="priority-card">
                  <h3>High Priority Items</h3>
                  <div id="high-priority" class="priority-list"></div>
                </div>
              </div>
            </div>

            <div id="features-view" class="view">
              <div class="view-header">
                <h2>Features</h2>
                <div class="filters">
                  <select id="features-filter" class="filter-select">
                    <option value="">All Statuses</option>
                    <option value="backlog">Backlog</option>
                    <option value="planning">Planning</option>
                    <option value="in-progress">In Progress</option>
                    <option value="testing">Testing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div id="features-list" class="items-list"></div>
            </div>

            <div id="bugs-view" class="view">
              <div class="view-header">
                <h2>Bugs</h2>
                <div class="filters">
                  <select id="bugs-filter" class="filter-select">
                    <option value="">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="wont-fix">Won't Fix</option>
                  </select>
                </div>
              </div>
              <div id="bugs-list" class="items-list"></div>
            </div>

            <div id="tasks-view" class="view">
              <div class="view-header">
                <h2>Tasks</h2>
                <div class="filters">
                  <select id="tasks-filter" class="filter-select">
                    <option value="">All Statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div id="tasks-list" class="items-list"></div>
            </div>
          </main>
        </div>

        <!-- Modal for Add/Edit Item -->
        <div id="item-modal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h3 id="modal-title">Add New Item</h3>
              <button id="modal-close" class="btn-close">&times;</button>
            </div>
            <form id="item-form" class="modal-body">
              <div class="form-group">
                <label for="item-type">Type</label>
                <select id="item-type" name="type" required>
                  <option value="feature">Feature</option>
                  <option value="bug">Bug</option>
                  <option value="task">Task</option>
                </select>
              </div>
              <div class="form-group">
                <label for="item-title">Title</label>
                <input type="text" id="item-title" name="title" required maxlength="200">
              </div>
              <div class="form-group">
                <label for="item-description">Description</label>
                <textarea id="item-description" name="description" rows="4" maxlength="2000"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="item-status">Status</label>
                  <select id="item-status" name="status" required></select>
                </div>
                <div class="form-group">
                  <label for="item-priority">Priority</label>
                  <select id="item-priority" name="priority" required>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="item-assignee">Assignee</label>
                <input type="text" id="item-assignee" name="assignee">
              </div>
              <div class="form-group">
                <label for="item-tags">Tags (comma-separated)</label>
                <input type="text" id="item-tags" name="tags" placeholder="frontend, backend, urgent">
              </div>
              <div id="type-specific-fields"></div>
            </form>
            <div class="modal-footer">
              <button type="button" id="cancel-btn" class="btn btn-secondary">Cancel</button>
              <button type="submit" form="item-form" id="save-btn" class="btn btn-primary">Save</button>
            </div>
          </div>
        </div>

        <div id="loading" class="loading">
          <div class="spinner"></div>
          <span>Loading...</span>
        </div>

        <script src="${scriptUri}"></script>
      </body>
      </html>
    `;
    }

    private setupWebviewMessageHandling(): void {
        this.panel!.webview.onDidReceiveMessage(async message => {
            try {
                switch (message.command) {
                    case 'loadData':
                        await this.sendDataToWebview();
                        break;

                    case 'createItem':
                        await this.handleCreateItem(message.data);
                        break;

                    case 'updateItem':
                        await this.handleUpdateItem(message.data);
                        break;

                    case 'deleteItem':
                        await this.handleDeleteItem(message.data);
                        break;

                    case 'exportData':
                        await this.handleExportData();
                        break;

                    case 'importData':
                        await this.handleImportData();
                        break;

                    case 'showError':
                        vscode.window.showErrorMessage(message.data.message);
                        break;

                    case 'showSuccess':
                        vscode.window.showInformationMessage(message.data.message);
                        break;

                    default:
                        console.warn('Unknown message command:', message.command);
                }
            } catch (error) {
                console.error('Error handling webview message:', error);
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        });
    }

    private async sendDataToWebview(): Promise<void> {
        if (!this.panel) return;

        try {
            const data = await this.dataManager.loadData();
            this.panel.webview.postMessage({
                command: 'dataLoaded',
                data: data
            });
        } catch (error) {
            console.error('Error loading data:', error);
            this.panel.webview.postMessage({
                command: 'dataLoadError',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private async handleCreateItem(data: any): Promise<void> {
        try {
            const { type, ...itemData } = data;

            // Process tags from comma-separated string
            if (itemData.tags && typeof itemData.tags === 'string') {
                itemData.tags = itemData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
            }

            // Process type-specific fields
            if (type === 'feature' && itemData.acceptanceCriteria && typeof itemData.acceptanceCriteria === 'string') {
                itemData.acceptanceCriteria = itemData.acceptanceCriteria.split('\n').filter(Boolean);
            }

            if (type === 'bug' && itemData.stepsToReproduce && typeof itemData.stepsToReproduce === 'string') {
                itemData.stepsToReproduce = itemData.stepsToReproduce.split('\n').filter(Boolean);
            }

            if (type === 'task' && itemData.subtasks && typeof itemData.subtasks === 'string') {
                itemData.subtasks = itemData.subtasks.split('\n').filter(Boolean);
            }

            const newItem = await this.dataManager.createItem(type, itemData);

            this.panel?.webview.postMessage({
                command: 'itemCreated',
                data: newItem
            });

            await this.sendDataToWebview();
            vscode.window.showInformationMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} created successfully!`);

        } catch (error) {
            console.error('Error creating item:', error);
            vscode.window.showErrorMessage(`Failed to create item: ${error}`);
        }
    }

    private async handleUpdateItem(data: any): Promise<void> {
        try {
            const { type, id, ...updates } = data;

            // Process tags from comma-separated string
            if (updates.tags && typeof updates.tags === 'string') {
                updates.tags = updates.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
            }

            // Process type-specific fields
            if (type === 'feature' && updates.acceptanceCriteria && typeof updates.acceptanceCriteria === 'string') {
                updates.acceptanceCriteria = updates.acceptanceCriteria.split('\n').filter(Boolean);
            }

            if (type === 'bug' && updates.stepsToReproduce && typeof updates.stepsToReproduce === 'string') {
                updates.stepsToReproduce = updates.stepsToReproduce.split('\n').filter(Boolean);
            }

            if (type === 'task' && updates.subtasks && typeof updates.subtasks === 'string') {
                updates.subtasks = updates.subtasks.split('\n').filter(Boolean);
            }

            const updatedItem = await this.dataManager.updateItem(type, id, updates);

            if (updatedItem) {
                this.panel?.webview.postMessage({
                    command: 'itemUpdated',
                    data: updatedItem
                });

                await this.sendDataToWebview();
                vscode.window.showInformationMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`);
            } else {
                vscode.window.showErrorMessage('Item not found for update');
            }

        } catch (error) {
            console.error('Error updating item:', error);
            vscode.window.showErrorMessage(`Failed to update item: ${error}`);
        }
    }

    private async handleDeleteItem(data: any): Promise<void> {
        try {
            const { type, id } = data;

            const result = await vscode.window.showWarningMessage(
                `Are you sure you want to delete this ${type}?`,
                { modal: true },
                'Delete'
            );

            if (result === 'Delete') {
                const success = await this.dataManager.deleteItem(type, id);

                if (success) {
                    this.panel?.webview.postMessage({
                        command: 'itemDeleted',
                        data: { type, id }
                    });

                    await this.sendDataToWebview();
                    vscode.window.showInformationMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
                } else {
                    vscode.window.showErrorMessage('Item not found for deletion');
                }
            }

        } catch (error) {
            console.error('Error deleting item:', error);
            vscode.window.showErrorMessage(`Failed to delete item: ${error}`);
        }
    }

    private async handleExportData(): Promise<void> {
        try {
            const exportPath = await this.dataManager.exportData();
            const result = await vscode.window.showInformationMessage(
                `Data exported successfully to ${exportPath}`,
                'Open Folder',
                'Copy Path'
            );

            if (result === 'Open Folder') {
                await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(exportPath));
            } else if (result === 'Copy Path') {
                await vscode.env.clipboard.writeText(exportPath);
                vscode.window.showInformationMessage('Export path copied to clipboard');
            }

        } catch (error) {
            console.error('Error exporting data:', error);
            vscode.window.showErrorMessage(`Failed to export data: ${error}`);
        }
    }

    private async handleImportData(): Promise<void> {
        try {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON Files': ['json']
                },
                title: 'Select Project Data File to Import'
            });

            if (fileUri && fileUri[0]) {
                const result = await vscode.window.showWarningMessage(
                    'Importing will replace all current project data. This action cannot be undone.',
                    { modal: true },
                    'Import'
                );

                if (result === 'Import') {
                    await this.dataManager.importData(fileUri[0].fsPath);
                    await this.sendDataToWebview();
                    vscode.window.showInformationMessage('Data imported successfully!');
                }
            }

        } catch (error) {
            console.error('Error importing data:', error);
            vscode.window.showErrorMessage(`Failed to import data: ${error}`);
        }
    }

    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }
}