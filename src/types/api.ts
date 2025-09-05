// Типы для аутентификации
export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface UserRegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  message: string;
}

// Типы для проектов
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface ProjectResponse {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

// Типы для pipeline
export interface CreatePipelineRequest {
  name: string;
  color: string;
  sort_order?: number;
}

export interface UpdatePipelineRequest {
  name?: string;
  color?: string;
  sort_order?: number;
}

export interface PipelineResponse {
  id: number;
  name: string;
  color: string;
  project_id: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Типы для статусов
export interface CreateStatusRequest {
  name: string;
  color: string;
  sort_order?: number;
}

export interface UpdateStatusRequest {
  name?: string;
  color?: string;
  sort_order?: number;
}

export interface StatusResponse {
  id: number;
  name: string;
  color: string;
  pipeline_id: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Типы для карточек
export interface CreateCardRequest {
  title: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  sort_order?: number;
}

export interface MoveCardRequest {
  status_id: number;
  sort_order?: number;
}

export interface BulkCardSortRequest {
  cards: {
    id: number;
    sort_order: number;
  }[];
}

export interface CardResponse {
  id: number;
  title: string;
  description?: string;
  status_id: number;
  user_id: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineCardsResponse {
  pipeline_id: number;
  pipeline_name: string;
  cards: CardResponse[];
}

// Типы для Yandex API
export interface BackupSettingsRequest {
  enabled: boolean;
  interval_minutes: number;
}

export interface BackupSettingsResponse {
  id: number;
  enabled: boolean;
  interval_minutes: number;
  last_backup: string;
  next_backup: string;
}

export interface BackupStatusResponse {
  is_configured: boolean;
  is_enabled: boolean;
  last_backup: string;
  next_backup: string;
  backup_count: number;
  interval_minutes: number;
}

export interface YandexAuthUrlResponse {
  auth_url: string;
}

// Поиск карточек
export interface CardSearchRequest {
  query: string;
  page?: number;
  page_size?: number;
}

export interface CardSearchResult {
  id: number;
  title: string;
  description: string;
  status_id: number;
  user_id: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  project_id: number;
  project_name: string;
  pipeline_id: number;
  pipeline_name: string;
  status_name: string;
  match_fragment: string;
  match_field: string;
}

export interface CardSearchResponse {
  cards: CardSearchResult[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Типы для API ответов
export interface ApiError {
  message: string;
  status: number;
}
