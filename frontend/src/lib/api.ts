import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh
interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and request has not been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Prevent infinite loops if login or refresh endpoints return 401
      if (originalRequest.url === '/auth/refresh' || originalRequest.url === '/auth/login') {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const trackUserActivity = async (activityType: string, productId?: string, metadata?: Record<string, unknown>) => {
  try {
    await api.post('/promotions/track', { activityType, productId, metadata });
  } catch (err) {
    console.error('Failed to log user activity event:', err);
  }
};

// ─── Recommendations API ───────────────────────────────────────────────────

export interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  category: { id: string; name: string; slug: string };
  rating?: number;
  score: number;
  reason: string;
}

export const getHomeRecommendations = async () => {
  const res = await api.get<{
    personalized: RecommendedProduct[];
    trending: RecommendedProduct[];
    recentlyViewed: RecommendedProduct[];
  }>('/recommendations/home');
  return res.data;
};

export const getSimilarProducts = async (productId: string, limit = 10) => {
  const res = await api.get<RecommendedProduct[]>(`/recommendations/products/${productId}/similar`, {
    params: { limit },
  });
  return res.data;
};

export const getFrequentlyBoughtTogether = async (productId: string, limit = 8) => {
  const res = await api.get<RecommendedProduct[]>(`/recommendations/products/${productId}/frequently-bought`, {
    params: { limit },
  });
  return res.data;
};

export const getTrendingRecommendations = async (limit = 12) => {
  const res = await api.get<RecommendedProduct[]>('/recommendations/trending', { params: { limit } });
  return res.data;
};

export const getPersonalizedRecommendations = async (limit = 12) => {
  const res = await api.get<RecommendedProduct[]>('/recommendations/personalized', { params: { limit } });
  return res.data;
};

export const getCategoryRecommendations = async (limit = 10) => {
  const res = await api.get<{ categoryId: string; name: string; slug: string; reason: string; score: number }[]>(
    '/recommendations/categories',
    { params: { limit } },
  );
  return res.data;
};

export const getRecentlyViewed = async (limit = 8) => {
  const res = await api.get<RecommendedProduct[]>('/recommendations/recently-viewed', { params: { limit } });
  return res.data;
};

export const logRecommendationEvent = async (
  recommendationType: string,
  productId: string,
  interaction: 'IMPRESSION' | 'CLICK' | 'PURCHASE',
) => {
  try {
    await api.post('/recommendations/event', { recommendationType, productId, interaction });
  } catch { /* silent */ }
};

