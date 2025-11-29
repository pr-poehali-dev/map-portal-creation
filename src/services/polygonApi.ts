import { PolygonObject } from '@/types/polygon';

const API_URL = 'https://functions.poehali.dev/ba968529-dbc0-460b-9581-0535bbb18bb3';

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'X-User-Id': token || ''
  };
}

export const polygonApi = {
  async getAll(): Promise<PolygonObject[]> {
    const cacheBust = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const response = await fetch(`${API_URL}?nocache=${cacheBust}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch polygons');
    }

    return response.json();
  },

  async getById(id: string): Promise<PolygonObject> {
    const cacheBust = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const response = await fetch(`${API_URL}?id=${id}&nocache=${cacheBust}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch polygon');
    }

    return response.json();
  },

  async create(polygon: PolygonObject): Promise<PolygonObject> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(polygon)
    });

    if (!response.ok) {
      throw new Error('Failed to create polygon');
    }

    return response.json();
  },

  async update(id: string, polygon: PolygonObject): Promise<PolygonObject> {
    const response = await fetch(`${API_URL}?id=${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(polygon)
    });

    if (!response.ok) {
      throw new Error('Failed to update polygon');
    }

    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}?id=${id}&action=move_to_trash`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to move polygon to trash');
    }
  },

  async getTrash(): Promise<PolygonObject[]> {
    const cacheBust = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const response = await fetch(`${API_URL}?source=trash&nocache=${cacheBust}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch trash');
    }

    return response.json();
  },

  async restoreFromTrash(id: string): Promise<PolygonObject> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: 'restore_from_trash', id })
    });

    if (!response.ok) {
      throw new Error('Failed to restore polygon');
    }

    return response.json();
  },

  async permanentDelete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}?id=${id}&action=permanent`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to permanently delete polygon');
    }
  },

  async emptyTrash(): Promise<void> {
    const response = await fetch(`${API_URL}?action=empty_trash`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to empty trash');
    }
  }
};