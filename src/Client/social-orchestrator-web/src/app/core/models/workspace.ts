export enum WorkspaceRole {
    Owner = 1,
    Admin = 2,
    Member = 3
}

export interface WorkspaceSummary {
    id: string;
    name: string;
    slug: string;
    timeZone: string;
    role: WorkspaceRole;
}

export interface CreateWorkspaceRequest {
    name: string;
    timeZone?: string;
}
