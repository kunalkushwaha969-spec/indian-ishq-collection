import React, { useState, useEffect, useCallback } from 'react';
import type {
  ManagedUserAccount,
  AdminRecordStatus,
} from '../utils/ecommerce';
import {
  INITIAL_OWNER_EMAIL,
  INITIAL_OWNER_UID,
  canInitialOwnerHandover,
  formatMerchantAuthError,
} from '../utils/ecommerce';
import {
  auth,
  fetchManagedUserAccounts,
  assignUserMerchantRole,
  revokeOwnInitialOwnerAccess,
  changeMerchantEmail,
  updateMerchantDisplayName,
  resetMerchantPassword,
  type MerchantRole,
} from '../services/api';
import { addMerchantActivity } from '../services/activity';
import {
  ShieldCheck,
  Users,
  UserCheck,
  UserPlus,
  UserX,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Copy,
  Check,
  Mail,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowRightLeft,
  Info,
  Clock,
  Lock,
} from 'lucide-react';

interface UserManagementPanelProps {
  merchantRole: MerchantRole | null;
  onOpenChangePasswordModal: () => void;
  onOwnerHandoverCompleted: () => void;
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
  merchantRole,
  onOpenChangePasswordModal,
  onOwnerHandoverCompleted,
}) => {
  const currentUser = auth?.currentUser || null;
  const currentUid = currentUser?.uid || '';
  const currentEmail = currentUser?.email || '';
  const isInitialOwner =
    Boolean(currentEmail && currentUid) &&
    currentUid === INITIAL_OWNER_UID &&
    currentEmail.toLowerCase() === INITIAL_OWNER_EMAIL.toLowerCase();
  const hasPasswordProvider = Boolean(
    currentUser?.providerData?.some((p) => p.providerId === 'password')
  );
  const hasGoogleProvider = Boolean(
    currentUser?.providerData?.some((p) => p.providerId === 'google.com')
  );

  const [accounts, setAccounts] = useState<ManagedUserAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);
  const [accountFilter, setAccountFilter] = useState<
    'all' | 'pending' | 'active' | 'revoked'
  >('all');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Manual Authorize by UID state
  const [manualUid, setManualUid] = useState<string>('');
  const [manualEmail, setManualEmail] = useState<string>('');
  const [manualName, setManualName] = useState<string>('');
  const [manualRole, setManualRole] = useState<'admin' | 'merchant'>('admin');
  const [isAddingManual, setIsAddingManual] = useState<boolean>(false);

  // Account Profile & Email Change state
  const [displayName, setDisplayName] = useState<string>(
    currentUser?.displayName || ''
  );
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [emailChangePassword, setEmailChangePassword] = useState<string>('');
  const [showEmailPassword, setShowEmailPassword] = useState<boolean>(false);
  const [isChangingEmail, setIsChangingEmail] = useState<boolean>(false);
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);

  // Owner Handover confirmation state
  const [showHandoverConfirm, setShowHandoverConfirm] = useState<boolean>(false);
  const [handoverAckChecked, setHandoverAckChecked] = useState<boolean>(false);
  const [isRevokingOwnAccess, setIsRevokingOwnAccess] = useState<boolean>(false);

  // Feedback banner
  const [panelFeedback, setPanelFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  const loadAccounts = useCallback(async () => {
    if (merchantRole !== 'admin') return;
    setIsLoadingAccounts(true);
    try {
      const list = await fetchManagedUserAccounts();
      setAccounts(list);
    } catch (err: unknown) {
      setPanelFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Could not load registered accounts.',
      });
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [merchantRole]);

  useEffect(() => {
    setDisplayName(currentUser?.displayName || '');
    if (merchantRole === 'admin') {
      loadAccounts();
    }
  }, [merchantRole, currentUser?.displayName, loadAccounts]);

  const handleCopyUid = async (uid: string) => {
    try {
      await navigator.clipboard.writeText(uid);
      setCopiedUid(uid);
      setTimeout(() => setCopiedUid(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRoleUpdate = async (
    account: ManagedUserAccount,
    nextStatus: AdminRecordStatus
  ) => {
    setPanelFeedback(null);
    setUpdatingUid(account.uid);
    try {
      const updatedList = await assignUserMerchantRole({
        targetUid: account.uid,
        targetEmail: account.email.startsWith('UID:') ? undefined : account.email,
        displayName: account.displayName,
        nextStatus,
      });
      setAccounts(updatedList);

      const actionLabel =
        nextStatus === 'admin'
          ? 'approved as Full Admin'
          : nextStatus === 'merchant'
          ? 'assigned Merchant role'
          : 'access revoked';

      addMerchantActivity({
        type: 'status',
        title: 'User Access Updated',
        detail: `${account.email} (${account.uid.slice(0, 8)}…) ${actionLabel}`,
      });

      setPanelFeedback({
        type: 'success',
        message: `${account.email} has been ${actionLabel}.`,
      });
    } catch (err: unknown) {
      setPanelFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Could not update role assignment.',
      });
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleManualAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setPanelFeedback(null);
    const trimmedUid = manualUid.trim();
    if (!trimmedUid) {
      setPanelFeedback({
        type: 'error',
        message: 'Please enter the user’s Firebase Authentication UID.',
      });
      return;
    }

    setIsAddingManual(true);
    try {
      const updatedList = await assignUserMerchantRole({
        targetUid: trimmedUid,
        targetEmail: manualEmail.trim() || undefined,
        displayName: manualName.trim() || undefined,
        nextStatus: manualRole,
      });
      setAccounts(updatedList);
      setManualUid('');
      setManualEmail('');
      setManualName('');
      setPanelFeedback({
        type: 'success',
        message: `UID ${trimmedUid} authorized with the ${manualRole.toUpperCase()} role.`,
      });
    } catch (err: unknown) {
      setPanelFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Could not authorize UID.',
      });
    } finally {
      setIsAddingManual(false);
    }
  };

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setPanelFeedback(null);
    setIsSavingProfile(true);
    try {
      const updated = await updateMerchantDisplayName(displayName);
      setDisplayName(updated);
      if (merchantRole === 'admin') {
        await loadAccounts();
      }
      setPanelFeedback({
        type: 'success',
        message: 'Your account display name has been updated.',
      });
    } catch (err: unknown) {
      setPanelFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Could not update display name.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleEmailChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPanelFeedback(null);
    setIsChangingEmail(true);
    try {
      const res = await changeMerchantEmail({
        newEmail,
        currentPassword: emailChangePassword,
      });
      setNewEmail('');
      setEmailChangePassword('');
      setPanelFeedback({
        type: 'success',
        message: res.message,
      });
    } catch (err: unknown) {
      setEmailChangePassword('');
      setPanelFeedback({
        type: 'error',
        message: formatMerchantAuthError(err, 'change_email'),
      });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleSendPasswordResetToSelf = async () => {
    if (!currentEmail) return;
    setPanelFeedback(null);
    setIsSendingReset(true);
    try {
      await resetMerchantPassword(currentEmail);
      setPanelFeedback({
        type: 'success',
        message: `Password reset link sent to ${currentEmail}. Please check your inbox and spam folder.`,
      });
    } catch (err: unknown) {
      setPanelFeedback({
        type: 'error',
        message: formatMerchantAuthError(err, 'forgot'),
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleConfirmOwnerHandover = async () => {
    if (!handoverAckChecked) return;
    setPanelFeedback(null);
    setIsRevokingOwnAccess(true);
    try {
      await revokeOwnInitialOwnerAccess();
      addMerchantActivity({
        type: 'status',
        title: 'Owner Website Handover Completed',
        detail: `Initial owner (${currentEmail}) revoked website-level admin access after verifying active Admin handover.`,
      });
      onOwnerHandoverCompleted();
    } catch (err: unknown) {
      setPanelFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Could not complete website access handover.',
      });
      setIsRevokingOwnAccess(false);
    }
  };

  const handoverStatus = canInitialOwnerHandover({
    currentUserUid: currentUid,
    currentUserEmail: currentEmail,
    accounts,
    initialOwnerEmail: INITIAL_OWNER_EMAIL,
  });

  const pendingCount = accounts.filter((a) => a.status === 'pending').length;
  const adminCount = accounts.filter((a) => a.status === 'admin').length;
  const merchantCount = accounts.filter((a) => a.status === 'merchant').length;

  const filteredAccounts = accounts.filter((a) => {
    if (accountFilter === 'pending') return a.status === 'pending';
    if (accountFilter === 'active')
      return a.status === 'admin' || a.status === 'merchant';
    if (accountFilter === 'revoked') return a.status === 'revoked';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* FEEDBACK BANNER */}
      {panelFeedback && (
        <div
          role={panelFeedback.type === 'error' ? 'alert' : 'status'}
          className="p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 leading-relaxed"
          style={{
            backgroundColor:
              panelFeedback.type === 'error'
                ? 'var(--error-bg)'
                : panelFeedback.type === 'warning'
                ? 'rgba(217, 119, 6, 0.1)'
                : 'var(--success-bg)',
            borderColor:
              panelFeedback.type === 'error'
                ? 'var(--error-border)'
                : panelFeedback.type === 'warning'
                ? 'rgba(217, 119, 6, 0.4)'
                : 'var(--success-border)',
            color:
              panelFeedback.type === 'error'
                ? 'var(--error-text)'
                : panelFeedback.type === 'warning'
                ? 'var(--text-main)'
                : 'var(--success-text)',
          }}
        >
          <div className="flex items-start gap-2.5">
            {panelFeedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : panelFeedback.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{panelFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setPanelFeedback(null)}
            className="text-[11px] font-semibold underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: USER MANAGEMENT & APPROVALS (ADMIN ONLY) */}
      {merchantRole === 'admin' && (
        <div
          className="border rounded-xl p-4 sm:p-5 space-y-5"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <h3 className="font-serif text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-main)' }}>
                  User Management & Role Approvals
                </h3>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-700 border border-amber-500/30">
                    {pendingCount} Pending Approval
                  </span>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                View registered accounts, approve the store operator as Admin, or manage existing website permissions.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAccounts}
              disabled={isLoadingAccounts}
              className="px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer disabled:opacity-60"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAccounts ? 'animate-spin' : ''}`} />
              <span>Refresh List</span>
            </button>
          </div>

          {/* SUMMARY COUNTERS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className="p-3 rounded-lg border"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
                Registered Accounts
              </span>
              <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-main)' }}>
                {accounts.length}
              </span>
            </div>
            <div
              className="p-3 rounded-lg border"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
                Pending Approval
              </span>
              <span className="text-lg font-bold tabular-nums text-amber-600">
                {pendingCount}
              </span>
            </div>
            <div
              className="p-3 rounded-lg border"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
                Active Admins
              </span>
              <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                {adminCount}
              </span>
            </div>
            <div
              className="p-3 rounded-lg border"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
                Active Merchants
              </span>
              <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-main)' }}>
                {merchantCount}
              </span>
            </div>
          </div>

          {/* FILTER BAR */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `All (${accounts.length})` },
                { id: 'pending', label: `Pending Approval (${pendingCount})` },
                { id: 'active', label: `Authorized (${adminCount + merchantCount})` },
                { id: 'revoked', label: 'Revoked' },
              ] as const
            ).map((f) => {
              const active = accountFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAccountFilter(f.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'var(--surface)',
                    borderColor: active ? 'var(--primary)' : 'var(--border)',
                    color: active ? 'var(--btn-text)' : 'var(--text-secondary)',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* ACCOUNTS LIST */}
          {isLoadingAccounts ? (
            <div className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              Loading registered accounts...
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div
              className="p-6 rounded-xl border text-center space-y-1.5"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <p className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                No accounts match this filter.
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                When the store operator creates an account or signs in with Google on the Merchant Login screen, their account will appear here for approval.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAccounts.map((acc) => {
                const isSelf = acc.uid === currentUid;
                const isUpdating = updatingUid === acc.uid;
                const isLastAdmin =
                  acc.status === 'admin' &&
                  accounts.filter((a) => a.uid !== acc.uid && a.status === 'admin').length === 0;

                return (
                  <div
                    key={acc.uid}
                    className="p-4 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor:
                        acc.status === 'pending'
                          ? 'rgba(217, 119, 6, 0.45)'
                          : 'var(--border)',
                    }}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-main)' }}>
                          {acc.email}
                        </span>
                        {acc.displayName && (
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            ({acc.displayName})
                          </span>
                        )}
                        {isSelf && (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              borderColor: 'var(--border)',
                              color: 'var(--primary)',
                            }}
                          >
                            You
                          </span>
                        )}
                        {acc.isInitialOwner && (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            Initial Owner
                          </span>
                        )}

                        {/* Role / Approval Status Badge */}
                        {acc.status === 'pending' && (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-700 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending Approval</span>
                          </span>
                        )}
                        {acc.status === 'admin' && (
                          <span
                            className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"
                            style={{
                              backgroundColor: 'var(--primary)',
                              color: 'var(--btn-text)',
                            }}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Admin (Full Control)</span>
                          </span>
                        )}
                        {acc.status === 'merchant' && (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-600/15 text-emerald-700 border border-emerald-600/30 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            <span>Merchant</span>
                          </span>
                        )}
                        {acc.status === 'revoked' && (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-600/15 text-red-700 border border-red-600/30 flex items-center gap-1">
                            <UserX className="w-3 h-3" />
                            <span>Access Revoked</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <div className="flex items-center gap-1.5">
                          <span>UID:</span>
                          <code
                            className="px-1.5 py-0.5 rounded border font-mono text-[10px]"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {acc.uid}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyUid(acc.uid)}
                            aria-label={`Copy UID for ${acc.email}`}
                            className="p-1 rounded border cursor-pointer"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {copiedUid === acc.uid ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span>
                          Method:{' '}
                          <strong style={{ color: 'var(--text-secondary)' }}>
                            {acc.provider === 'google' ? 'Google Sign-In' : 'Email / Password'}
                          </strong>
                        </span>
                        {acc.approved_by && (
                          <span>
                            Updated by:{' '}
                            <strong style={{ color: 'var(--text-secondary)' }}>
                              {acc.approved_by}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {acc.isInitialOwner && !isSelf ? (
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded border flex items-center gap-1"
                          style={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <Lock className="w-3 h-3" />
                          <span>Protected Initial Owner</span>
                        </span>
                      ) : (
                        <>
                          {(acc.status === 'pending' || acc.status === 'revoked') && (
                            <>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleRoleUpdate(acc, 'admin')}
                                className="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                                style={{
                                  backgroundColor: 'var(--primary)',
                                  color: 'var(--btn-text)',
                                }}
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>
                                  {isUpdating ? 'Updating...' : 'Approve as Admin'}
                                </span>
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleRoleUpdate(acc, 'merchant')}
                                className="px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                style={{
                                  backgroundColor: 'var(--surface-elevated)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text-main)',
                                }}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Approve as Merchant</span>
                              </button>
                            </>
                          )}

                          {acc.status === 'merchant' && (
                            <>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleRoleUpdate(acc, 'admin')}
                                className="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                style={{
                                  backgroundColor: 'var(--primary)',
                                  color: 'var(--btn-text)',
                                }}
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Assign Admin Role</span>
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleRoleUpdate(acc, 'revoked')}
                                className="px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                style={{
                                  backgroundColor: 'var(--error-bg)',
                                  borderColor: 'var(--error-border)',
                                  color: 'var(--error-text)',
                                }}
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Revoke Access</span>
                              </button>
                            </>
                          )}

                          {acc.status === 'admin' && !isSelf && (
                            <>
                              <button
                                type="button"
                                disabled={isUpdating || isLastAdmin}
                                onClick={() => handleRoleUpdate(acc, 'merchant')}
                                title={
                                  isLastAdmin
                                    ? 'Cannot demote the last active Admin'
                                    : 'Change role to Merchant'
                                }
                                className="px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                style={{
                                  backgroundColor: 'var(--surface-elevated)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                <span>Set as Merchant</span>
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating || isLastAdmin}
                                onClick={() => handleRoleUpdate(acc, 'revoked')}
                                title={
                                  isLastAdmin
                                    ? 'Cannot revoke the last active Admin'
                                    : 'Revoke website access'
                                }
                                className="px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                style={{
                                  backgroundColor: 'var(--error-bg)',
                                  borderColor: 'var(--error-border)',
                                  color: 'var(--error-text)',
                                }}
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Revoke Access</span>
                              </button>
                            </>
                          )}

                          {acc.status === 'admin' && isSelf && (
                            <span className="text-[11px] italic px-2 py-1" style={{ color: 'var(--text-muted)' }}>
                              Active Admin Session
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MANUAL AUTHORIZE BY UID FORM */}
          <div
            className="p-4 rounded-xl border space-y-3"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                Authorize Account by Firebase UID
              </h4>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Accounts registered on this website appear in the list above automatically. You can also authorize a user directly by entering their Firebase Authentication UID below.
            </p>
            <form onSubmit={handleManualAuthorize} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <input
                type="text"
                required
                placeholder="Firebase Auth UID (Required)"
                aria-label="Firebase Auth UID"
                value={manualUid}
                onChange={(e) => setManualUid(e.target.value)}
                className="p-2.5 rounded-lg border text-xs font-mono"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
              <input
                type="email"
                placeholder="Email address (Optional)"
                aria-label="Account email address"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="p-2.5 rounded-lg border text-xs"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
              <select
                aria-label="Role to assign"
                value={manualRole}
                onChange={(e) => setManualRole(e.target.value as 'admin' | 'merchant')}
                className="p-2.5 rounded-lg border text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              >
                <option value="admin">Role: Admin (Full Control)</option>
                <option value="merchant">Role: Merchant (Store Ops)</option>
              </select>
              <button
                type="submit"
                disabled={isAddingManual}
                className="py-2.5 px-4 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isAddingManual ? 'Saving...' : 'Authorize UID'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 2: ONE-TIME WEBSITE ACCESS HANDOVER (OWNER SECTION) */}
      {merchantRole === 'admin' && isInitialOwner && (
        <div
          className="border rounded-xl p-4 sm:p-5 space-y-4"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="p-2.5 rounded-lg border shrink-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--primary)',
              }}
            >
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--text-main)' }}>
                One-Time Website Access Handover
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Transfer day-to-day website administration to the store operator and optionally revoke your own website-level admin access once the new Admin account is verified to work.
              </p>
            </div>
          </div>

          {/* SEPARATION EXPLANATION BOX */}
          <div
            className="p-3.5 rounded-lg border text-xs space-y-1.5 leading-relaxed"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <div className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-main)' }}>
              <Info className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
              <span>Important: Website Admin Access vs. Firebase Project Ownership</span>
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Website-Level Admin Access (Firestore <code>/admins</code>):</strong> Controls who can sign in to the Indian Ishq Collection Merchant Workspace to manage products, orders, store settings, and website users.
              </li>
              <li>
                <strong>Firebase Project & Google Cloud IAM Ownership:</strong> Remains completely separate. Revoking your website-level admin access here does <strong>not</strong> delete or disable your <code>{INITIAL_OWNER_EMAIL}</code> Firebase Authentication account, and does <strong>not</strong> transfer Firebase project ownership or alter Google Cloud IAM permissions.
              </li>
            </ul>
          </div>

          {/* HANDOVER STATUS CHECKLIST */}
          <div
            className="p-4 rounded-xl border space-y-3"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
              Handover Readiness Status
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                {handoverStatus.activeOtherAdmins.length > 0 ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span style={{ color: 'var(--text-main)' }}>
                  {handoverStatus.activeOtherAdmins.length > 0 ? (
                    <>
                      <strong>Verified Admin Ready:</strong>{' '}
                      {handoverStatus.activeOtherAdmins.map((a) => a.email).join(', ')}{' '}
                      is authorized with full <strong>Admin</strong> control.
                    </>
                  ) : (
                    <>
                      <strong>Action Needed Before Handover:</strong> Approve at least one store operator account with the <strong>Admin</strong> role above and verify they can sign in before revoking your own website access.
                    </>
                  )}
                </span>
              </div>
            </div>

            {!showHandoverConfirm ? (
              <div className="pt-1">
                <button
                  type="button"
                  disabled={!handoverStatus.canHandover}
                  onClick={() => {
                    setShowHandoverConfirm(true);
                    setHandoverAckChecked(false);
                  }}
                  className="px-4 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--error-bg)',
                    borderColor: 'var(--error-border)',
                    color: 'var(--error-text)',
                  }}
                >
                  <UserX className="w-4 h-4" />
                  <span>Revoke My Website Admin Access (Optional Handover)</span>
                </button>
              </div>
            ) : (
              <div
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'var(--error-bg)',
                  borderColor: 'var(--error-border)',
                  color: 'var(--error-text)',
                }}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs leading-relaxed">
                    <p className="font-bold">
                      Warning: You are about to revoke website-level Admin access for {currentEmail}
                    </p>
                    <p>
                      Once confirmed, your account will be marked as <code>revoked</code> in Firestore <code>/admins/{currentUid}</code> and you will be immediately signed out of the Merchant Workspace. The authorized Admin (
                      <strong>
                        {handoverStatus.activeOtherAdmins.map((a) => a.email).join(', ')}
                      </strong>
                      ) will retain full control of the website.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={handoverAckChecked}
                    onChange={(e) => setHandoverAckChecked(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I confirm that the new Admin has signed in and verified dashboard access, and I want to revoke my own website-level administrative access.
                  </span>
                </label>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={!handoverAckChecked || isRevokingOwnAccess}
                    onClick={handleConfirmOwnerHandover}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border cursor-pointer disabled:opacity-50"
                    style={{
                      backgroundColor: '#b91c1c',
                      borderColor: '#991b1b',
                      color: '#ffffff',
                    }}
                  >
                    {isRevokingOwnAccess
                      ? 'Revoking Access...'
                      : 'Confirm & Revoke My Website Access'}
                  </button>
                  <button
                    type="button"
                    disabled={isRevokingOwnAccess}
                    onClick={() => {
                      setShowHandoverConfirm(false);
                      setHandoverAckChecked(false);
                    }}
                    className="px-3.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: MY ACCOUNT PROFILE, EMAIL CHANGE & PASSWORD SETTINGS */}
      <div
        className="border rounded-xl p-4 sm:p-5 space-y-5"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="border-b pb-3.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h3 className="font-serif text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-main)' }}>
              My Account & Security Settings
            </h3>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage your own account profile, email address, and password securely via Firebase Authentication. Passwords are never stored in Firestore or localStorage.
          </p>
        </div>

        {/* CURRENT ACCOUNT OVERVIEW */}
        <div
          className="p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div>
            <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
              Signed-In Email
            </span>
            <strong className="text-sm block truncate mt-0.5" style={{ color: 'var(--text-main)' }}>
              {currentEmail || 'Authenticated User'}
            </strong>
          </div>
          <div>
            <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
              Assigned Website Role
            </span>
            <strong className="text-sm block uppercase mt-0.5" style={{ color: 'var(--primary)' }}>
              {merchantRole === 'admin' ? 'Admin (Full Control)' : 'Merchant (Store Ops)'}
            </strong>
          </div>
          <div>
            <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
              Firebase Auth UID
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <code
                className="px-1.5 py-0.5 rounded border font-mono text-[10px] truncate"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {currentUid}
              </code>
              {currentUid && (
                <button
                  type="button"
                  onClick={() => handleCopyUid(currentUid)}
                  aria-label="Copy my Firebase UID"
                  className="p-1 rounded border cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {copiedUid === currentUid ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* CHANGE EMAIL ADDRESS (SUPPORTED VERIFICATION FLOW) */}
          <form
            onSubmit={handleEmailChangeSubmit}
            className="p-4 rounded-xl border space-y-3.5"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                Change Account Email (Verified Flow)
              </h4>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Firebase Authentication sends a verification link to your new email address before updating it. Because permissions are tied to your UID, your Admin role stays intact.
            </p>

            <div>
              <label
                htmlFor="account-new-email"
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--text-main)' }}
              >
                New Email Address
              </label>
              <input
                id="account-new-email"
                type="email"
                required
                placeholder="Enter new email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-xs"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            {hasPasswordProvider ? (
              <div>
                <label
                  htmlFor="account-email-current-password"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Current Password (for Security Verification)
                </label>
                <div className="relative flex items-center">
                  <input
                    id="account-email-current-password"
                    type={showEmailPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter current password"
                    value={emailChangePassword}
                    onChange={(e) => setEmailChangePassword(e.target.value)}
                    className="w-full p-2.5 pr-20 rounded-lg border text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPassword((prev) => !prev)}
                    aria-label={showEmailPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {showEmailPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {hasGoogleProvider
                  ? 'You are signed in with Google. Clicking below will prompt Google re-authentication before sending the verification link to your new email.'
                  : 'Re-authentication will be verified before sending the email change link.'}
              </p>
            )}

            <button
              type="submit"
              disabled={isChangingEmail}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>
                {isChangingEmail
                  ? 'Sending Verification...'
                  : 'Send Email Change Verification'}
              </span>
            </button>
          </form>

          {/* PROFILE DISPLAY NAME & PASSWORD SECURITY */}
          <div className="space-y-4">
            <form
              onSubmit={handleSaveDisplayName}
              className="p-4 rounded-xl border space-y-3"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <label
                htmlFor="account-display-name"
                className="block text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-main)' }}
              >
                Account Display Name
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="account-display-name"
                  type="text"
                  maxLength={100}
                  placeholder="e.g. Store Operator / Boutique Admin"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 p-2.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-60 shrink-0"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--btn-text)',
                  }}
                >
                  {isSavingProfile ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>

            <div
              className="p-4 rounded-xl border space-y-3"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                  Password & Recovery Controls
                </h4>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Change your password immediately (requires verifying your current password) or send a Firebase password reset link to your email.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onOpenChangePasswordModal}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--btn-text)',
                  }}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </button>
                <button
                  type="button"
                  disabled={isSendingReset || !currentEmail}
                  onClick={handleSendPasswordResetToSelf}
                  className="px-3.5 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>
                    {isSendingReset ? 'Sending...' : 'Send Password Reset Email'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
