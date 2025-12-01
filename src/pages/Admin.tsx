import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';
import AdminUsersTab from '@/components/AdminUsersTab';
import AdminCompaniesTab from '@/components/AdminCompaniesTab';
import AdminPermissionsTab from '@/components/AdminPermissionsTab';
import AdminAuditTab from '@/components/AdminAuditTab';
import AdminAttributesTab from '@/components/AdminAttributesTab';
import AdminBeneficiariesTab from '@/components/AdminBeneficiariesTab';
import { useAdminData } from '@/hooks/useAdminData';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useCompanyManagement } from '@/hooks/useCompanyManagement';
import { usePermissionManagement } from '@/hooks/usePermissionManagement';
import { useAttributeManagement } from '@/hooks/useAttributeManagement';
import { useBeneficiaryManagement } from '@/hooks/useBeneficiaryManagement';

export default function Admin() {
  const navigate = useNavigate();
  
  const {
    users,
    companies,
    permissions,
    auditLogs,
    layers,
    attributes,
    beneficiaries,
    isLoading,
    loadData,
    getAuthHeaders,
    setAttributes,
    ADMIN_API
  } = useAdminData();

  const { updateRole, updateStatus } = useUserManagement(ADMIN_API, getAuthHeaders, loadData);

  const {
    companyDialog,
    setCompanyDialog,
    editingCompany,
    setEditingCompany,
    newCompany,
    setNewCompany,
    createCompany,
    updateCompany,
    deleteCompany
  } = useCompanyManagement(ADMIN_API, getAuthHeaders, loadData);

  const {
    permissionDialog,
    setPermissionDialog,
    selectedUserId,
    setSelectedUserId,
    newPermission,
    setNewPermission,
    grantPermission,
    revokePermission
  } = usePermissionManagement(ADMIN_API, getAuthHeaders, loadData);

  const {
    createAttribute,
    updateAttribute,
    deleteAttribute,
    reorderAttributes
  } = useAttributeManagement(ADMIN_API, getAuthHeaders, loadData, setAttributes);

  const {
    addBeneficiary,
    removeBeneficiary
  } = useBeneficiaryManagement(ADMIN_API, getAuthHeaders, loadData);

  return (
    <div className="min-h-screen bg-background p-8 dark">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Icon name="Shield" size={28} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Панель администратора</h1>
              <p className="text-muted-foreground">Управление пользователями и доступом</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            Вернуться к карте
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="users">
              <Icon name="Users" size={16} className="mr-2" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="companies">
              <Icon name="Building2" size={16} className="mr-2" />
              Компании
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Icon name="Lock" size={16} className="mr-2" />
              Доступ
            </TabsTrigger>
            <TabsTrigger value="audit">
              <Icon name="FileText" size={16} className="mr-2" />
              Аудит
            </TabsTrigger>
            <TabsTrigger value="attributes">
              <Icon name="Settings" size={16} className="mr-2" />
              Атрибуты
            </TabsTrigger>
            <TabsTrigger value="beneficiaries">
              <Icon name="Users" size={16} className="mr-2" />
              Бенефициары
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <AdminUsersTab
              users={users}
              isLoading={isLoading}
              updateRole={updateRole}
              updateStatus={updateStatus}
            />
          </TabsContent>

          <TabsContent value="companies">
            <AdminCompaniesTab
              companies={companies}
              isLoading={isLoading}
              companyDialog={companyDialog}
              setCompanyDialog={setCompanyDialog}
              editingCompany={editingCompany}
              newCompany={newCompany}
              setNewCompany={setNewCompany}
              createCompany={createCompany}
              updateCompany={updateCompany}
              deleteCompany={deleteCompany}
              setEditingCompany={setEditingCompany}
            />
          </TabsContent>

          <TabsContent value="permissions">
            <AdminPermissionsTab
              users={users}
              permissions={permissions}
              layers={layers}
              isLoading={isLoading}
              permissionDialog={permissionDialog}
              setPermissionDialog={setPermissionDialog}
              selectedUserId={selectedUserId}
              setSelectedUserId={setSelectedUserId}
              newPermission={newPermission}
              setNewPermission={setNewPermission}
              grantPermission={grantPermission}
              revokePermission={revokePermission}
            />
          </TabsContent>

          <TabsContent value="audit">
            <AdminAuditTab
              auditLogs={auditLogs}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="attributes">
            <AdminAttributesTab
              attributes={attributes}
              onCreateAttribute={createAttribute}
              onUpdateAttribute={updateAttribute}
              onDeleteAttribute={deleteAttribute}
              onReorderAttributes={reorderAttributes}
            />
          </TabsContent>

          <TabsContent value="beneficiaries">
            <AdminBeneficiariesTab
              beneficiaries={beneficiaries.map(b => b.name)}
              onAdd={addBeneficiary}
              onRemove={removeBeneficiary}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}