export interface AuthConfig {
  ssoEnabled: boolean;
  localEnabled: boolean;
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  role: 'COLLABORATOR' | 'TRAINER' | 'MANAGER' | 'DIRECTION' | 'ADMIN';
  provider: 'LOCAL' | 'ENTRA';
}
