// src/extension.ts

import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import * as vscode from 'vscode';
import { ProjectManagerWebviewProvider } from '@/providers/WebviewProvider';
import { DataManager } from '@/services/DataManager';

let webviewProvider: ProjectManagerWebviewProvider | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // console.log('Project Manager Pro extension is being activated');

    // Check if .project-manager folder exists
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        // console.log('No workspace folder found, extension will not activate');
        return;
    }
    const projectManagerPath = path.join(workspaceFolder.uri.fsPath, '.project-manager');

    const access = promisify(fs.access);

    try {
        await access(projectManagerPath);
        // console.log('Project Manager folder detected, activating extension');
        // console.log('Project Manager folder detected, activating extension');

        // Set context for when clauses
        await vscode.commands.executeCommand('setContext', 'projectManagerActive', true);

        // Initialize data manager
        const dataManager = DataManager.getInstance();
        await dataManager.initialize();

        // Create webview provider
        webviewProvider = new ProjectManagerWebviewProvider(context);

        // Register commands
        const openDashboardCommand = vscode.commands.registerCommand(
            'projectManager.openDashboard',
            async () => {
                if (webviewProvider) {
                    await webviewProvider.show();
                }
            }
        );

        const createProjectCommand = vscode.commands.registerCommand(
            'projectManager.createProject',
            async () => {
                await createProjectManagerFolder();
            }
        );

        const exportDataCommand = vscode.commands.registerCommand(
            'projectManager.exportData',
            async () => {
                try {
                    const dataManager = DataManager.getInstance();
                    const exportPath = await dataManager.exportData();

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
                    vscode.window.showErrorMessage(`Export failed: ${error}`);
                }
            }
        );

        const importDataCommand = vscode.commands.registerCommand(
            'projectManager.importData',
            async () => {
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
                            const dataManager = DataManager.getInstance();
                            await dataManager.importData(fileUri[0].fsPath);
                            vscode.window.showInformationMessage('Data imported successfully!');
                        }
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Import failed: ${error}`);
                }
            }
        );

        // Register status bar item
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        statusBarItem.text = '$(project) Project Manager';
        statusBarItem.tooltip = 'Open Project Manager Dashboard';
        statusBarItem.command = 'projectManager.openDashboard';
        statusBarItem.show();

        // Add to subscriptions
        context.subscriptions.push(
            openDashboardCommand,
            createProjectCommand,
            exportDataCommand,
            importDataCommand,
            statusBarItem
        );

        // Watch for changes in the .project-manager folder
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(workspaceFolder, '.project-manager/**/*')
        );

        watcher.onDidChange(() => {
            // console.log('Project manager data changed');
            // Could refresh webview here if needed
        });

        context.subscriptions.push(watcher);

        // console.log('Project Manager Pro extension activated successfully');

        // Show welcome message on first activation
        const hasShownWelcome = context.globalState.get('projectManager.hasShownWelcome', false);
        if (!hasShownWelcome) {
            const result = await vscode.window.showInformationMessage(
                'Project Manager Pro is now active! Use Ctrl+Shift+P (Cmd+Shift+P on Mac) to open the dashboard.',
                'Open Dashboard',
                'Don\'t show again'
            );

            if (result === 'Open Dashboard') {
                await vscode.commands.executeCommand('projectManager.openDashboard');
            } else if (result === 'Don\'t show again') {
                await context.globalState.update('projectManager.hasShownWelcome', true);
            }
        }

    } catch (error) {
        // console.log('Project Manager folder not found, extension will remain dormant');

        // Offer to create the project manager folder
        const result = await vscode.window.showInformationMessage(
            'No Project Manager configuration found. Would you like to initialize Project Manager for this workspace?',
            'Initialize',
            'Not now'
        );

        if (result === 'Initialize') {
            await createProjectManagerFolder();
            // Restart extension activation
            await activate(context);
        }
    }
}

async function createProjectManagerFolder(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        try {
            const projectManagerPath = path.join(workspaceFolder.uri.fsPath, '.project-manager');
            const mkdir = promisify(fs.mkdir);
            await mkdir(projectManagerPath, { recursive: true });

            // Create initial project data
            const dataManager = DataManager.getInstance();
            await dataManager.initialize();

            vscode.window.showInformationMessage(
                'Project Manager initialized successfully! Use Ctrl+Shift+P to open the dashboard.',
                'Open Dashboard'
            ).then(result => {
                if (result === 'Open Dashboard') {
                    vscode.commands.executeCommand('projectManager.openDashboard');
                }
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize Project Manager: ${error}`);
        }
    }

    export function deactivate(): void {
        // console.log('Project Manager Pro extension is being deactivated');

        if (webviewProvider) {
            webviewProvider.dispose();
            webviewProvider = undefined;
        }
    }