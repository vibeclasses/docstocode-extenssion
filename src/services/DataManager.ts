import {
    Bug,
    BUG_SCHEMA,
    Feature,
    FEATURE_SCHEMA,
    PROJECT_DATA_SCHEMA,
    ProjectData,
    ProjectItem,
    Task,
    TASK_SCHEMA
} from '@/schemas/project-schemas';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

export class DataManager {
    private static instance: DataManager;
    private ajv: Ajv;
    private projectPath: string;
    private dataPath: string;

    private constructor() {
        this.ajv = new Ajv({ allErrors: true });
        addFormats(this.ajv);

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        this.projectPath = workspaceFolder.uri.fsPath;
        this.dataPath = path.join(this.projectPath, '.project-manager');
    }

    public static getInstance(): DataManager {
        if (!DataManager.instance) {
            DataManager.instance = new DataManager();
        }
        return DataManager.instance;
    }

    public async initialize(): Promise<void> {
        try {
            await fs.access(this.dataPath);
        } catch {
            await fs.mkdir(this.dataPath, { recursive: true });
            await this.createInitialData();
        }
    }

    private async createInitialData(): Promise<void> {
        const initialData: ProjectData = {
            features: [],
            bugs: [],
            tasks: [],
            metadata: {
                projectName: path.basename(this.projectPath),
                version: '1.0.0',
                lastUpdated: new Date().toISOString()
            }
        };

        await this.saveData(initialData);
    }

    public async loadData(): Promise<ProjectData> {
        try {
            const dataFile = path.join(this.dataPath, 'project-data.json');
            const rawData = await fs.readFile(dataFile, 'utf-8');
            const data = JSON.parse(rawData) as ProjectData;

            if (!this.validateProjectData(data)) {
                throw new Error('Invalid project data format');
            }

            return data;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load project data: ${error}`);
            throw error;
        }
    }

    public async saveData(data: ProjectData): Promise<void> {
        try {
            if (!this.validateProjectData(data)) {
                throw new Error('Invalid project data format');
            }

            data.metadata.lastUpdated = new Date().toISOString();

            const dataFile = path.join(this.dataPath, 'project-data.json');
            await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8');

            // Create backup
            const backupFile = path.join(this.dataPath, `backup-${Date.now()}.json`);
            await fs.writeFile(backupFile, JSON.stringify(data, null, 2), 'utf-8');

            // Keep only last 5 backups
            await this.cleanupBackups();

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save project data: ${error}`);
            throw error;
        }
    }

    private async cleanupBackups(): Promise<void> {
        try {
            const files = await fs.readdir(this.dataPath);
            const backupFiles = files
                .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
                .sort((a, b) => b.localeCompare(a))
                .slice(5);

            for (const file of backupFiles) {
                await fs.unlink(path.join(this.dataPath, file));
            }
        } catch (error) {
            console.warn('Failed to cleanup backups:', error);
        }
    }

    private validateProjectData(data: any): data is ProjectData {
        const validate = this.ajv.compile(PROJECT_DATA_SCHEMA);
        const isValid = validate(data);

        if (!isValid) {
            console.error('Validation errors:', validate.errors);
            return false;
        }

        return true;
    }

    public validateItem(item: ProjectItem): boolean {
        let schema;
        switch (item.type) {
            case 'feature':
                schema = FEATURE_SCHEMA;
                break;
            case 'bug':
                schema = BUG_SCHEMA;
                break;
            case 'task':
                schema = TASK_SCHEMA;
                break;
            default:
                return false;
        }

        const validate = this.ajv.compile(schema);
        return validate(item);
    }

    // CRUD Operations
    public async createItem<T extends ProjectItem>(
        type: T['type'],
        itemData: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<T> {
        const data = await this.loadData();

        const item = {
            ...itemData,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as T;

        if (!this.validateItem(item)) {
            throw new Error('Invalid item data');
        }

        switch (type) {
            case 'feature':
                data.features.push(item as Feature);
                break;
            case 'bug':
                data.bugs.push(item as Bug);
                break;
            case 'task':
                data.tasks.push(item as Task);
                break;
        }

        await this.saveData(data);
        return item;
    }

    public async updateItem<T extends ProjectItem>(
        type: T['type'],
        id: string,
        updates: Partial<Omit<T, 'id' | 'type' | 'createdAt'>>
    ): Promise<T | null> {
        const data = await this.loadData();
        let collection: ProjectItem[];

        switch (type) {
            case 'feature':
                collection = data.features;
                break;
            case 'bug':
                collection = data.bugs;
                break;
            case 'task':
                collection = data.tasks;
                break;
            default:
                return null;
        }

        const itemIndex = collection.findIndex(item => item.id === id);
        if (itemIndex === -1) {
            return null;
        }

        const updatedItem = {
            ...collection[itemIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        } as T;

        if (!this.validateItem(updatedItem)) {
            throw new Error('Invalid updated item data');
        }

        collection[itemIndex] = updatedItem;
        await this.saveData(data);

        return updatedItem;
    }

    public async deleteItem(type: ProjectItem['type'], id: string): Promise<boolean> {
        const data = await this.loadData();
        let collection: ProjectItem[];

        switch (type) {
            case 'feature':
                collection = data.features;
                break;
            case 'bug':
                collection = data.bugs;
                break;
            case 'task':
                collection = data.tasks;
                break;
            default:
                return false;
        }

        const itemIndex = collection.findIndex(item => item.id === id);
        if (itemIndex === -1) {
            return false;
        }

        collection.splice(itemIndex, 1);
        await this.saveData(data);

        return true;
    }

    public async getItems<T extends ProjectItem>(type: T['type']): Promise<T[]> {
        const data = await this.loadData();

        switch (type) {
            case 'feature':
                return data.features as T[];
            case 'bug':
                return data.bugs as T[];
            case 'task':
                return data.tasks as T[];
            default:
                return [];
        }
    }

    public async getItem<T extends ProjectItem>(type: T['type'], id: string): Promise<T | null> {
        const items = await this.getItems(type);
        return items.find(item => item.id === id) as T || null;
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    public getDataPath(): string {
        return this.dataPath;
    }

    public async exportData(): Promise<string> {
        const data = await this.loadData();
        const exportPath = path.join(this.dataPath, `export-${Date.now()}.json`);
        await fs.writeFile(exportPath, JSON.stringify(data, null, 2), 'utf-8');
        return exportPath;
    }

    public async importData(filePath: string): Promise<void> {
        try {
            const rawData = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(rawData) as ProjectData;

            if (!this.validateProjectData(data)) {
                throw new Error('Invalid import data format');
            }

            await this.saveData(data);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to import data: ${error}`);
            throw error;
        }
    }
}