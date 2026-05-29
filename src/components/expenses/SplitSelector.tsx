'use client';

import { SplitType } from '@/types/expense';
import { TripMember } from '@/types/member';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMemberKey } from '@/lib/utils';

interface SplitSelectorProps {
  splitType: SplitType;
  onSplitTypeChange: (type: SplitType) => void;
  members: TripMember[];
  amount: number;
  selectedMembers: string[];
  onSelectedMembersChange: (uids: string[]) => void;
  unequalAmounts: Record<string, number>;
  onUnequalChange: (uid: string, amount: number) => void;
  percents: Record<string, number>;
  onPercentChange: (uid: string, percent: number) => void;
  singleDebtor: string;
  onSingleDebtorChange: (uid: string) => void;
}

export function SplitSelector({
  splitType,
  onSplitTypeChange,
  members,
  amount,
  selectedMembers,
  onSelectedMembersChange,
  unequalAmounts,
  onUnequalChange,
  percents,
  onPercentChange,
  singleDebtor,
  onSingleDebtorChange,
}: SplitSelectorProps) {
  const availableMembers = members;

  const toggleMember = (uid: string) => {
    if (selectedMembers.includes(uid)) {
      onSelectedMembersChange(selectedMembers.filter((id) => id !== uid));
    } else {
      onSelectedMembersChange([...selectedMembers, uid]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Split type</Label>
        <Select value={splitType} onValueChange={(v) => onSplitTypeChange(v as SplitType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equal">Equal</SelectItem>
            <SelectItem value="unequal">Unequal</SelectItem>
            <SelectItem value="percent">Percent</SelectItem>
            <SelectItem value="single">Single person</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {splitType === 'equal' && (
        <div className="space-y-2">
          <Label>Select members to split</Label>
          {availableMembers.map((m) => {
            const key = getMemberKey(m);
            return (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(key)}
                  onChange={() => toggleMember(key)}
                />
                {m.name}
              </label>
            );
          })}
        </div>
      )}

      {splitType === 'unequal' && (
        <div className="space-y-2">
          {availableMembers.map((m) => {
            const key = getMemberKey(m);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm w-24 truncate">{m.name}</span>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={unequalAmounts[key] ?? ''}
                  onChange={(e) => onUnequalChange(key, parseFloat(e.target.value) || 0)}
                />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Total must equal {amount}
          </p>
        </div>
      )}

      {splitType === 'percent' && (
        <div className="space-y-2">
          {availableMembers.map((m) => {
            const key = getMemberKey(m);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm w-24 truncate">{m.name}</span>
                <Input
                  type="number"
                  placeholder="%"
                  value={percents[key] ?? ''}
                  onChange={(e) => onPercentChange(key, parseFloat(e.target.value) || 0)}
                />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">Percentages must sum to 100</p>
        </div>
      )}

      {splitType === 'single' && (
        <div>
          <Label>Owed by</Label>
          <Select value={singleDebtor} onValueChange={onSingleDebtorChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              {availableMembers.map((m) => {
                const key = getMemberKey(m);
                return (
                  <SelectItem key={key} value={key}>
                    {m.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
