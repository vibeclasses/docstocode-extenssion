import { ProjectManagerWebviewProvider } from '@/providers/WebviewProvider';
import { DataManager } from '@/services/DataManager';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';

let webviewProvider: ProjectManagerWebviewProvider | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {

    // Check if .docsToCode folder exists
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }
    const projectManagerPath = path.join(workspaceFolder.uri.fsPath, '.docsTocode');

    const access = promisify(fs.access);

    try {
        await access(projectManagerPath);

        await vscode.commands.executeCommand('setContext', 'projectManagerActive', true);

        const dataManager = DataManager.getInstance();
        await dataManager.initialize();

        webviewProvider = new ProjectManagerWebviewProvider(context);

        const openDashboardCommand = vscode.commands.registerCommand(
            'docstocode.openDashboard',
            async () => {
                if (webviewProvider) {
                    await webviewProvider.show();
                }
            }
        );

        const createProjectCommand = vscode.commands.registerCommand(
            'docstocode.createProject',
            async () => {
                await createProjectManagerFolder();
            }
        );

        const exportDataCommand = vscode.commands.registerCommand(
            'docstocode.exportData',
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
            'docstocode.importData',
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
        statusBarItem.text = '$(project) DocsToCode UI';
        statusBarItem.tooltip = 'Open Project Manager Dashboard';
        statusBarItem.command = 'docstocode.openDashboard';
        statusBarItem.show();

        // Add to subscriptions
        context.subscriptions.push(
            openDashboardCommand,
            createProjectCommand,
            exportDataCommand,
            importDataCommand,
            statusBarItem
        );

        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(workspaceFolder, '.docsTocode/**/*')
        );

        watcher.onDidChange(() => {
            // console.log('Project manager data changed');
            // Could refresh webview here if needed
        });

        context.subscriptions.push(watcher);

        // console.log('Project Manager Pro extension activated successfully');

        // Show welcome message on first activation
        const hasShownWelcome = context.globalState.get('docstocode.hasShownWelcome', false);
        if (!hasShownWelcome) {
            const result = await vscode.window.showInformationMessage(
                'DocsToCode is now active! Use Ctrl+Shift+D (Cmd+Shift+D on Mac) to open the dashboard.',
                'Open Dashboard',
                'Don\'t show again'
            );

            if (result === 'Open Dashboard') {
                await vscode.commands.executeCommand('docstocode.openDashboard');
            } else if (result === 'Don\'t show again') {
                await context.globalState.update('docstocode.hasShownWelcome', true);
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
        return;
    }
    try {
        const projectManagerPath = path.join(workspaceFolder.uri.fsPath, '.docsToCode');
        const mkdir = promisify(fs.mkdir);
        await mkdir(projectManagerPath, { recursive: true });

        // Create initial project data
        const dataManager = DataManager.getInstance();
        await dataManager.initialize();

        vscode.window.showInformationMessage(
            'Project Manager initialized successfully! Use Ctrl+Shift+P to open the dashboard.',
            'Open Dashboard'
        ).then((result: string | undefined) => {
            if (result === 'Open Dashboard') {
                vscode.commands.executeCommand('docstocode.openDashboard');
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