'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Users, X } from 'lucide-react';

interface ShareDialogProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Share {
  id: string;
  shared_with_user_id: string;
  permission: 'read' | 'write';
  created_at: string;
}

export function ShareDialog({ noteId, open, onOpenChange }: ShareDialogProps) {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'read' | 'write'>('write');
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<Share[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  // Load existing shares when dialog opens
  React.useEffect(() => {
    if (open && session) {
      loadShares();
    }
  }, [open, session]);

  const loadShares = async () => {
    if (!session) return;

    setLoadingShares(true);
    try {
      const response = await fetch(`/api/liveblocks/invite?noteId=${noteId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setShares(data.shares || []);
      }
    } catch (error) {
      console.error('Failed to load shares:', error);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!session) {
      toast.error('You must be logged in to share notes');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/liveblocks/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          noteId,
          userEmail: email,
          permission,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'User invited successfully');
        setEmail('');
        setPermission('write');
        loadShares(); // Reload shares
      } else {
        toast.error(data.error || 'Failed to invite user');
      }
    } catch (error) {
      console.error('Invite error:', error);
      toast.error('Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (shareId: string) => {
    if (!session) return;

    try {
      const response = await fetch('/api/liveblocks/invite', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ shareId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Access revoked');
        loadShares(); // Reload shares
      } else {
        toast.error(data.error || 'Failed to revoke access');
      }
    } catch (error) {
      console.error('Revoke error:', error);
      toast.error('Failed to revoke access');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Note
          </DialogTitle>
          <DialogDescription>
            Invite others to collaborate on this note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter user email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleInvite();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="permission">Permission</Label>
            <Select value={permission} onValueChange={(value: 'read' | 'write') => setPermission(value)}>
              <SelectTrigger id="permission">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read only</SelectItem>
                <SelectItem value="write">Can edit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleInvite} disabled={loading} className="w-full">
            {loading ? 'Inviting...' : 'Invite'}
          </Button>

          {shares.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label>Shared with</Label>
              <div className="space-y-2">
                {loadingShares ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{share.shared_with_user_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {share.permission === 'write' ? 'Can edit' : 'Read only'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeAccess(share.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
