import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  UserLoginRequest,
  UserRegisterRequest,
  AuthResponse,
  UserResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectResponse,
  CreatePipelineRequest,
  UpdatePipelineRequest,
  PipelineResponse,
  CreateStatusRequest,
  UpdateStatusRequest,
  StatusResponse,
  CreateCardRequest,
  UpdateCardRequest,
  MoveCardRequest,
  BulkCardSortRequest,
  CardResponse,
  PipelineCardsResponse,
  BackupSettingsRequest,
  BackupSettingsResponse,
  BackupStatusResponse,
  YandexAuthUrlResponse,
  CardSearchRequest,
  CardSearchResponse,
} from '../types/api';

class ApiService {
  private api: AxiosInstance;
  private baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8082/api/v1';

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Интерцептор для добавления токена авторизации
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Интерцептор для обработки ошибок
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Аутентификация
  async login(data: UserLoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', data);
    return response.data;
  }

  async register(data: UserRegisterRequest): Promise<UserResponse> {
    const response: AxiosResponse<UserResponse> = await this.api.post('/auth/register', data);
    return response.data;
  }

  // Проекты
  async getProjects(): Promise<ProjectResponse[]> {
    const response: AxiosResponse<ProjectResponse[]> = await this.api.get('/projects');
    return response.data;
  }

  async createProject(data: CreateProjectRequest): Promise<ProjectResponse> {
    const response: AxiosResponse<ProjectResponse> = await this.api.post('/projects', data);
    return response.data;
  }

  async getProject(id: number): Promise<ProjectResponse> {
    const response: AxiosResponse<ProjectResponse> = await this.api.get(`/projects/${id}`);
    return response.data;
  }

  async updateProject(id: number, data: UpdateProjectRequest): Promise<ProjectResponse> {
    const response: AxiosResponse<ProjectResponse> = await this.api.put(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id: number): Promise<void> {
    await this.api.delete(`/projects/${id}`);
  }

  // Pipeline
  async getPipelines(projectId: number): Promise<PipelineResponse[]> {
    const response: AxiosResponse<PipelineResponse[]> = await this.api.get(`/projects/${projectId}/pipelines`);
    return response.data;
  }

  async createPipeline(projectId: number, data: CreatePipelineRequest): Promise<PipelineResponse> {
    const response: AxiosResponse<PipelineResponse> = await this.api.post(`/projects/${projectId}/pipelines`, data);
    return response.data;
  }

  async getPipeline(projectId: number, id: number): Promise<PipelineResponse> {
    const response: AxiosResponse<PipelineResponse> = await this.api.get(`/projects/${projectId}/pipelines/${id}`);
    return response.data;
  }

  async updatePipeline(projectId: number, id: number, data: UpdatePipelineRequest): Promise<PipelineResponse> {
    const response: AxiosResponse<PipelineResponse> = await this.api.put(`/projects/${projectId}/pipelines/${id}`, data);
    return response.data;
  }

  async deletePipeline(projectId: number, id: number): Promise<void> {
    await this.api.delete(`/projects/${projectId}/pipelines/${id}`);
  }

  // Массовое обновление сортировки пайплайнов
  async bulkUpdatePipelineSort(projectId: number, pipelines: Array<{id: number, sort_order: number}>): Promise<{message: string}> {
    const response: AxiosResponse<{message: string}> = await this.api.put(`/projects/${projectId}/pipelines/bulk-sort`, { pipelines });
    return response.data;
  }

  // Статусы
  async getStatuses(projectId: number, pipelineId: number): Promise<StatusResponse[]> {
    const response: AxiosResponse<StatusResponse[]> = await this.api.get(`/projects/${projectId}/pipelines/${pipelineId}/statuses`);
    return response.data;
  }

  async createStatus(projectId: number, pipelineId: number, data: CreateStatusRequest): Promise<StatusResponse> {
    const response: AxiosResponse<StatusResponse> = await this.api.post(`/projects/${projectId}/pipelines/${pipelineId}/statuses`, data);
    return response.data;
  }

  async getStatus(projectId: number, pipelineId: number, id: number): Promise<StatusResponse> {
    const response: AxiosResponse<StatusResponse> = await this.api.get(`/projects/${projectId}/pipelines/${pipelineId}/statuses/${id}`);
    return response.data;
  }

  async updateStatus(projectId: number, pipelineId: number, id: number, data: UpdateStatusRequest): Promise<StatusResponse> {
    const response: AxiosResponse<StatusResponse> = await this.api.put(`/projects/${projectId}/pipelines/${pipelineId}/statuses/${id}`, data);
    return response.data;
  }

  async deleteStatus(projectId: number, pipelineId: number, id: number): Promise<void> {
    await this.api.delete(`/projects/${projectId}/pipelines/${pipelineId}/statuses/${id}`);
  }

  // Карточки
  async getCards(projectId: number, pipelineId: number, statusId: number): Promise<CardResponse[]> {
    const response: AxiosResponse<CardResponse[]> = await this.api.get(`/projects/${projectId}/pipelines/${pipelineId}/statuses/${statusId}/cards`);
    return response.data;
  }

  // Получение всех карточек pipeline одним запросом
  async getPipelineCards(projectId: number, pipelineId: number): Promise<PipelineCardsResponse> {
    const response: AxiosResponse<PipelineCardsResponse> = await this.api.get(`/projects/${projectId}/pipelines/${pipelineId}/cards`);
    return response.data;
  }



  async createCard(projectId: number, pipelineId: number, statusId: number, data: CreateCardRequest): Promise<CardResponse> {
    const response: AxiosResponse<CardResponse> = await this.api.post(`/projects/${projectId}/pipelines/${pipelineId}/statuses/${statusId}/cards`, data);
    return response.data;
  }

  async getCard(projectId: number, id: number): Promise<CardResponse> {
    const response: AxiosResponse<CardResponse> = await this.api.get(`/projects/${projectId}/cards/${id}`);
    return response.data;
  }

  async updateCard(projectId: number, id: number, data: UpdateCardRequest): Promise<CardResponse> {
    const response: AxiosResponse<CardResponse> = await this.api.put(`/projects/${projectId}/cards/${id}`, data);
    return response.data;
  }

  async deleteCard(projectId: number, id: number): Promise<void> {
    await this.api.delete(`/projects/${projectId}/cards/${id}`);
  }

  async moveCard(projectId: number, id: number, data: MoveCardRequest): Promise<void> {
    await this.api.put(`/projects/${projectId}/cards/${id}/move`, data);
  }

  // Массовое обновление сортировки карточек
  async bulkUpdateCardSort(projectId: number, cards: BulkCardSortRequest): Promise<void> {
    await this.api.put(`/projects/${projectId}/cards/bulk-sort`, cards);
  }

  // Yandex API методы
  async getYandexAuthUrl(): Promise<YandexAuthUrlResponse> {
    const response: AxiosResponse<YandexAuthUrlResponse> = await this.api.get('/yandex/auth-url');
    console.log('🔗 API ответ для auth-url:', response.data);
    return response.data;
  }

  async getBackupStatus(): Promise<BackupStatusResponse> {
    const response: AxiosResponse<BackupStatusResponse> = await this.api.get('/yandex/backup/status');
    return response.data;
  }



  async updateBackupSettings(data: BackupSettingsRequest): Promise<BackupSettingsResponse> {
    const response: AxiosResponse<BackupSettingsResponse> = await this.api.put('/yandex/backup/settings', data);
    return response.data;
  }

  async createManualBackup(): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.post('/yandex/backup/create');
    return response.data;
  }

  async disconnectYandex(): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.delete('/yandex/disconnect');
    return response.data;
  }

  // Поиск карточек
  async searchCards(data: CardSearchRequest): Promise<CardSearchResponse> {
    const response: AxiosResponse<CardSearchResponse> = await this.api.post('/cards/search', data);
    
    // Обеспечиваем, что всегда возвращаем корректную структуру
    const result = response.data;
    return {
      cards: result?.cards || [],
      total: result?.total || 0,
      page: result?.page || 1,
      page_size: result?.page_size || 10,
      total_pages: result?.total_pages || 0
    };
  }
}

export const apiService = new ApiService();
export default apiService;
