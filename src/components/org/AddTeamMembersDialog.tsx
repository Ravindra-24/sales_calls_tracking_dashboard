import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Search, User, UserPlus, X } from 'lucide-react';
import type { TeamMember } from '../../types/api';

export type AssignmentStatus = 'assigned' | 'available' | 'other';

export const getAssignmentStatus = (member: TeamMember, managerId: string): AssignmentStatus => {
  if (member.managerId === managerId) return 'assigned';
  return member.managerId ? 'other' : 'available';
};

const statusLabels: Record<AssignmentStatus, string> = {
  assigned: 'Assigned',
  available: 'Available',
  other: 'Other Manager',
};

export const AssignmentBadge = ({ status }: { status: AssignmentStatus }) => (
  <span className={`assignment-badge ${status}`}>{statusLabels[status]}</span>
);

interface AddTeamMembersDialogProps {
  manager: TeamMember;
  salesMembers: TeamMember[];
  managerNames: Map<string, string>;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (memberIds: string[]) => void;
}

export const AddTeamMembersDialog = ({
  manager,
  salesMembers,
  managerNames,
  saving,
  error,
  onCancel,
  onSubmit,
}: AddTeamMembersDialogProps) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [step, setStep] = useState<'select' | 'transfer'>('select');
  const searchRef = useRef<HTMLInputElement>(null);
  const managerName = manager.name || manager.email;

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return salesMembers;
    return salesMembers.filter((member) => `${member.name} ${member.email}`.toLowerCase().includes(query));
  }, [salesMembers, search]);

  // Select All only picks unassigned members; transfers must be chosen one by one.
  const selectAllCandidates = filteredMembers.filter((member) => getAssignmentStatus(member, manager.id) === 'available');
  const allSelected = selectAllCandidates.length > 0 && selectAllCandidates.every((member) => selectedIds.includes(member.id));
  const someSelected = selectAllCandidates.some((member) => selectedIds.includes(member.id));
  const transfers = salesMembers.filter((member) => selectedIds.includes(member.id) && getAssignmentStatus(member, manager.id) === 'other');

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [allSelected, someSelected]);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return;
      event.preventDefault();
      if (step === 'transfer') setStep('select');
      else onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel, saving, step]);

  const toggleMember = (memberId: string) => {
    setSelectedIds((current) => current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId]);
  };

  const toggleAll = () => {
    const candidateIds = selectAllCandidates.map((member) => member.id);
    setSelectedIds((current) => allSelected
      ? current.filter((id) => !candidateIds.includes(id))
      : [...new Set([...current, ...candidateIds])]);
  };

  const submit = () => {
    if (selectedIds.length === 0) return;
    if (step === 'select' && transfers.length > 0) {
      setStep('transfer');
      return;
    }
    onSubmit(selectedIds);
  };

  return createPortal(
    <div className="feedback-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel(); }}>
      <div
        className={`feedback-dialog team-member-dialog${step === 'transfer' ? ' feedback-dialog--warning' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-member-dialog-title"
      >
        <button className="feedback-dialog__close" type="button" aria-label="Close dialog" disabled={saving} onClick={onCancel}>
          <X aria-hidden="true" size={19} />
        </button>

        {step === 'select' ? (
          <>
            <div className="team-member-dialog__heading">
              <h2 id="team-member-dialog-title">Add members to {managerName}'s team</h2>
              <p>Select the sales members this manager should view and manage.</p>
            </div>
            <label className="team-member-dialog__search">
              <Search size={16} aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                placeholder="Search members"
                aria-label="Search members"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="team-member-dialog__toolbar">
              <label className="team-member-dialog__select-all">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  disabled={selectAllCandidates.length === 0}
                  onChange={toggleAll}
                />
                Select all available
              </label>
              <span>{selectedIds.length} selected</span>
            </div>
            <div className="team-member-dialog__list">
              {filteredMembers.length === 0 ? (
                <p className="empty-team-copy">{salesMembers.length === 0 ? 'No active sales members in this organization.' : 'No members match your search.'}</p>
              ) : filteredMembers.map((member) => {
                const status = getAssignmentStatus(member, manager.id);
                const isAssigned = status === 'assigned';
                const checked = isAssigned || selectedIds.includes(member.id);
                return (
                  <label className={`team-member-option${checked ? ' selected' : ''}${isAssigned ? ' is-disabled' : ''}`} key={member.id}>
                    <input type="checkbox" checked={checked} disabled={isAssigned} onChange={() => toggleMember(member.id)} />
                    <div className="avatar"><User size={15} /></div>
                    <span className="team-member-option__copy">
                      <strong>{member.name || 'Unnamed member'}</strong>
                      <small>{member.email}</small>
                      {status === 'other' && <small>On {managerNames.get(member.managerId ?? '') || 'another manager'}'s team</small>}
                    </span>
                    <AssignmentBadge status={status} />
                  </label>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="team-member-dialog__heading">
              <h2 id="team-member-dialog-title">Confirm transfer</h2>
              <p>
                {transfers.length === 1
                  ? `${transfers[0].name || transfers[0].email} is currently assigned to ${managerNames.get(transfers[0].managerId ?? '') || 'another manager'}'s team. Do you want to transfer them to ${managerName}'s team?`
                  : `${transfers.length} selected members are assigned to other managers. They will be removed from their current team and assigned to ${managerName}'s team.`}
              </p>
            </div>
            <ul className="team-transfer-list">
              {transfers.map((member) => (
                <li key={member.id}>
                  <div className="avatar"><User size={15} /></div>
                  <span className="team-member-option__copy">
                    <strong>{member.name || 'Unnamed member'}</strong>
                    <small>{member.email}</small>
                  </span>
                  <span className="team-transfer-route">
                    <span>{managerNames.get(member.managerId ?? '') || 'Another manager'}</span>
                    <ArrowRight size={14} aria-hidden="true" />
                    <span>{managerName}</span>
                  </span>
                </li>
              ))}
            </ul>
            {selectedIds.length > transfers.length && (
              <p className="team-member-dialog__note">{selectedIds.length - transfers.length} available {selectedIds.length - transfers.length === 1 ? 'member' : 'members'} will also be added.</p>
            )}
          </>
        )}

        {error && <div className="feedback-dialog__form-error" role="alert">{error}</div>}

        <div className="feedback-dialog__actions">
          <button
            className="feedback-dialog__button feedback-dialog__button--secondary"
            type="button"
            disabled={saving}
            onClick={() => (step === 'transfer' ? setStep('select') : onCancel())}
          >
            Cancel
          </button>
          <button
            className="feedback-dialog__button feedback-dialog__button--primary"
            type="button"
            disabled={saving || selectedIds.length === 0}
            onClick={submit}
          >
            {saving ? 'Saving...' : step === 'transfer'
              ? 'Confirm Transfer'
              : <><UserPlus size={16} aria-hidden="true" /> Add {selectedIds.length > 0 ? selectedIds.length : ''} {selectedIds.length === 1 ? 'Member' : 'Members'}</>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
