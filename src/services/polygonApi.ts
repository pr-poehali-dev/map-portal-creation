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
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch polygons');
    }

    return response.json();
  },

  async getById(id: string): Promise<PolygonObject> {
    const response = await fetch(`${API_URL}?id=${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
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
    const response = await fetch(`${API_URL}?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete polygon');
    }
  }
};
