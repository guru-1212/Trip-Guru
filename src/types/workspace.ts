export type WorkspaceType = 'trip' | 'roommate';

export interface WorkspaceRef {
  id: string;
  type: WorkspaceType;
}
