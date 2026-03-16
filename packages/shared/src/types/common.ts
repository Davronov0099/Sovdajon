export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CursorPaginatedResponse<T> {
  success: true;
  data: T[];
  cursor: string | null;
  hasMore: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CursorQuery {
  cursor?: string;
  limit?: number;
  search?: string;
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}
