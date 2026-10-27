// PURPOSE: /org/settings/permissions - read-only matrix of which role holds which permission (from the server).
// WHY: Owners and admins can see exactly what each role may do. Roles are fixed; changes happen in the backend seed.
// DEPENDS ON: features/roles/hooks.ts, utils/permissions.ts.

import { ErrorState, LoadingState } from '@/components/feedback/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useRoles } from '@/features/roles/hooks';
import { ApiClientError } from '@/lib/api';
import { PERMISSIONS, groupPermissions } from '@/utils/permissions';

const RESOURCE_LABEL: Record<string, string> = {
  organization: 'Organization',
  user: 'Users',
  student: 'Students',
  teacher: 'Teachers',
  academic: 'Academic structure',
  course: 'Courses',
  subject: 'Subjects',
  topic: 'Topics',
  question: 'Question bank',
  exam: 'Exams',
  result: 'Results',
  report: 'Reports',
  leaderboard: 'Leaderboard',
  settings: 'Settings',
  subscription: 'Subscription',
  notification: 'Notifications',
  audit: 'Audit log',
};
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

export default function RolesPermissionsPage() {
  const q = useRoles();
  if (q.isPending) return <LoadingState />;
  if (q.isError)
    return (
      <ErrorState
        message={q.error instanceof ApiClientError ? q.error.message : 'Could not load roles.'}
        onRetry={() => void q.refetch()}
      />
    );
  const roles = q.data.roles;
  const groups = groupPermissions(PERMISSIONS);
  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="What each role may do. Roles are fixed; ask your platform administrator if you need a change."
        breadcrumb={[{ label: 'Settings' }, { label: 'Roles & permissions' }]}
      />
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Permissions held by each role</caption>
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Permission
                </th>
                {roles.map((r) => (
                  <th key={r.code} scope="col" className="px-4 py-3 text-center font-semibold">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.resource}>
                <tr className="bg-background/60">
                  <th
                    scope="rowgroup"
                    colSpan={roles.length + 1}
                    className="px-4 py-2 text-left text-[13px] font-semibold text-text"
                  >
                    {RESOURCE_LABEL[g.resource] ?? title(g.resource)}
                  </th>
                </tr>
                {g.actions.map((a) => {
                  const code = `${g.resource}.${a}`;
                  return (
                    <tr key={code} className="border-b border-border last:border-0">
                      <th scope="row" className="px-4 py-2 pl-8 text-left font-normal text-text">
                        {title(a)} <span className="ml-1 font-mono text-xs text-muted">{code}</span>
                      </th>
                      {roles.map((r) => {
                        const has = r.permissions.includes(code);
                        return (
                          <td key={r.code} className="px-4 py-2 text-center">
                            {has ? (
                              <span
                                className="text-success"
                                role="img"
                                aria-label={`${r.name} can ${code}`}
                              >
                                <Icon name="check" size={16} />
                              </span>
                            ) : (
                              <span
                                className="text-border"
                                role="img"
                                aria-label={`${r.name} cannot ${code}`}
                              >
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      </Card>
    </>
  );
}
