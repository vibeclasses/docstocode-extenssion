export interface BaseItem {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignee?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Feature extends BaseItem {
    type: 'feature';
    status: 'backlog' | 'planning' | 'in-progress' | 'testing' | 'completed';
    epic?: string;
    storyPoints?: number;
    acceptanceCriteria: string[];
}

export interface Bug extends BaseItem {
    type: 'bug';
    status: 'open' | 'in-progress' | 'resolved' | 'closed' | 'wont-fix';
    severity: 'low' | 'medium' | 'high' | 'critical';
    reproducible: boolean;
    stepsToReproduce: string[];
    environment: string;
    resolution?: string;
}

export interface Task extends BaseItem {
    type: 'task';
    status: 'todo' | 'in-progress' | 'blocked' | 'completed';
    dueDate?: string;
    estimatedHours?: number;
    actualHours?: number;
    subtasks: string[];
}

export type ProjectItem = Feature | Bug | Task;

export interface ProjectData {
    features: Feature[];
    bugs: Bug[];
    tasks: Task[];
    metadata: {
        projectName: string;
        version: string;
        lastUpdated: string;
    };
}

// JSON Schema definitions for validation
export const BASE_ITEM_SCHEMA = {
    type: 'object',
    required: ['id', 'title', 'description', 'status', 'priority', 'tags', 'createdAt', 'updatedAt'],
    properties: {
        id: { type: 'string', minLength: 1 },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 2000 },
        priority: { enum: ['low', 'medium', 'high', 'critical'] },
        assignee: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
    }
};

export const FEATURE_SCHEMA = {
    ...BASE_ITEM_SCHEMA,
    properties: {
        ...BASE_ITEM_SCHEMA.properties,
        type: { const: 'feature' },
        status: { enum: ['backlog', 'planning', 'in-progress', 'testing', 'completed'] },
        epic: { type: 'string' },
        storyPoints: { type: 'number', minimum: 1, maximum: 21 },
        acceptanceCriteria: { type: 'array', items: { type: 'string' } }
    },
    required: [...BASE_ITEM_SCHEMA.required, 'type', 'acceptanceCriteria']
};

export const BUG_SCHEMA = {
    ...BASE_ITEM_SCHEMA,
    properties: {
        ...BASE_ITEM_SCHEMA.properties,
        type: { const: 'bug' },
        status: { enum: ['open', 'in-progress', 'resolved', 'closed', 'wont-fix'] },
        severity: { enum: ['low', 'medium', 'high', 'critical'] },
        reproducible: { type: 'boolean' },
        stepsToReproduce: { type: 'array', items: { type: 'string' } },
        environment: { type: 'string' },
        resolution: { type: 'string' }
    },
    required: [...BASE_ITEM_SCHEMA.required, 'type', 'severity', 'reproducible', 'stepsToReproduce', 'environment']
};

export const TASK_SCHEMA = {
    ...BASE_ITEM_SCHEMA,
    properties: {
        ...BASE_ITEM_SCHEMA.properties,
        type: { const: 'task' },
        status: { enum: ['todo', 'in-progress', 'blocked', 'completed'] },
        dueDate: { type: 'string', format: 'date' },
        estimatedHours: { type: 'number', minimum: 0 },
        actualHours: { type: 'number', minimum: 0 },
        subtasks: { type: 'array', items: { type: 'string' } }
    },
    required: [...BASE_ITEM_SCHEMA.required, 'type', 'subtasks']
};

export const PROJECT_DATA_SCHEMA = {
    type: 'object',
    required: ['features', 'bugs', 'tasks', 'metadata'],
    properties: {
        features: { type: 'array', items: FEATURE_SCHEMA },
        bugs: { type: 'array', items: BUG_SCHEMA },
        tasks: { type: 'array', items: TASK_SCHEMA },
        metadata: {
            type: 'object',
            required: ['projectName', 'version', 'lastUpdated'],
            properties: {
                projectName: { type: 'string', minLength: 1 },
                version: { type: 'string' },
                lastUpdated: { type: 'string', format: 'date-time' }
            }
        }
    }
};