import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const ADMIN_API = 'https://functions.poehali.dev/3e92b954-4498-4bea-8de7-898ccb110b58';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  phone?: string;
  position?: string;
  company_id?: string;
  company_name?: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  inn: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  user_id: string;
  resource_type: string;
  resource_id: string;
  permission_level: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  created_at: string;
  email: string;
  name: string;
}

export interface AttributeTemplate {
  id: number;
  name: string;
  field_type: string;
  is_required: boolean;
  default_value?: string;
  options?: string;
  sort_order: number;
}

export function useAdminData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [layers, setLayers] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<AttributeTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'X-User-Id': user?.token || ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, companiesRes, permsRes, auditRes, layersRes, attributesRes] = await Promise.all([
        fetch(`${ADMIN_API}?action=users`, { headers: getAuthHeaders() }),
        fetch(`${ADMIN_API}?action=companies`, { headers: getAuthHeaders() }),
        fetch(`${ADMIN_API}?action=permissions`, { headers: getAuthHeaders() }),
        fetch(`${ADMIN_API}?action=audit&limit=50`, { headers: getAuthHeaders() }),
        fetch(`${ADMIN_API}?action=layers`, { headers: getAuthHeaders() }),
        fetch(`${ADMIN_API}?action=attributes`, { headers: getAuthHeaders() })
      ]);

      if (!usersRes.ok) {
        if (usersRes.status === 403) {
          toast({
            title: 'Доступ запрещён',
            description: 'У вас нет прав администратора',
            variant: 'destructive'
          });
          navigate('/');
          return;
        }
        throw new Error('Failed to load data');
      }

      const [usersData, companiesData, permsData, auditData, layersData, attributesData] = await Promise.all([
        usersRes.json(),
        companiesRes.json(),
        permsRes.json(),
        auditRes.json(),
        layersRes.json(),
        attributesRes.json()
      ]);

      setUsers(usersData);
      setCompanies(companiesData);
      setPermissions(permsData);
      setAuditLogs(auditData);
      setLayers(layersData);
      setAttributes(attributesData);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить данные',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    users,
    companies,
    permissions,
    auditLogs,
    layers,
    attributes,
    isLoading,
    loadData,
    getAuthHeaders,
    setAttributes,
    ADMIN_API
  };
}
