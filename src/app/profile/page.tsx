"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Calendar,
  User,
  Shield,
  ArrowLeft,
  Lock,
  Smartphone,
  Download,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { SessionsList } from "@/components/auth/sessions-list";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { sendVerificationEmail, signOut, updateUser, useSession } from "@/lib/auth-client";

export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileSaving, setEditProfileSaving] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [emailPrefsOpen, setEmailPrefsOpen] = useState(false);
  const [verificationSending, setVerificationSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [isPending, session, router]);

  if (isPending || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  const user = session.user;
  const createdDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const handleEditProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nameInput = form.elements.namedItem("name") as HTMLInputElement | null;
    const newName = nameInput?.value.trim() ?? "";

    if (!newName) {
      toast.error("Name cannot be empty");
      return;
    }
    if (newName === user.name) {
      setEditProfileOpen(false);
      return;
    }

    setEditProfileSaving(true);
    try {
      const result = await updateUser({ name: newName });
      if (result.error) {
        toast.error(result.error.message || "Failed to update profile");
        return;
      }
      toast.success("Profile updated");
      setEditProfileOpen(false);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setEditProfileSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/account/export", { cache: "no-store" });
      if (!res.ok) {
        toast.error("Failed to export data");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fittrack-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail.trim().toLowerCase() !== (user.email ?? "").toLowerCase()) {
      toast.error("Email does not match");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: deleteConfirmEmail.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? "Failed to delete account");
        return;
      }
      // The user row (and its sessions) are gone — there's no session to sign
      // out of any more, but call signOut() to clear the client cookie/state
      // before routing home.
      await signOut().catch(() => {});
      toast.success("Account deleted");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setDeleting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user.email) return;
    setVerificationSending(true);
    try {
      const result = await sendVerificationEmail({
        email: user.email,
        callbackURL: "/profile",
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to send verification email");
        return;
      }
      toast.success("Verification email sent. Check your inbox.");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setVerificationSending(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Your Profile</h1>
      </div>

      <div className="grid gap-6">
        {/* Profile Overview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={user.image || ""}
                  alt={user.name || "User"}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback className="text-lg">
                  {(user.name?.[0] || user.email?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{user.name}</h2>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                  {user.emailVerified && (
                    <Badge variant="outline" className="border-green-600 text-green-600">
                      <Shield className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                {createdDate && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {createdDate}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-muted-foreground text-sm font-medium">Full Name</label>
                <div className="bg-muted/10 rounded-md border p-3">
                  {user.name || "Not provided"}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-muted-foreground text-sm font-medium">Email Address</label>
                <div className="bg-muted/10 flex items-center justify-between rounded-md border p-3">
                  <span>{user.email}</span>
                  {user.emailVerified && (
                    <Badge variant="outline" className="border-green-600 text-green-600">
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Account Status</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Email Verification</p>
                    <p className="text-muted-foreground text-sm">
                      Email address verification status
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.emailVerified ? "default" : "secondary"}>
                      {user.emailVerified ? "Verified" : "Unverified"}
                    </Badge>
                    {!user.emailVerified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResendVerification}
                        disabled={verificationSending}
                      >
                        {verificationSending ? "Sending..." : "Verify"}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Account Type</p>
                    <p className="text-muted-foreground text-sm">Your account access level</p>
                  </div>
                  <Badge variant="outline">Standard</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your recent account activity and sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <div>
                    <p className="font-medium">Current Session</p>
                    <p className="text-muted-foreground text-sm">Active now</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-green-600 text-green-600">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your account settings and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => setEditProfileOpen(true)}
              >
                <User className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Edit Profile</div>
                  <div className="text-muted-foreground text-xs">Update your information</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => setSecurityOpen(true)}
              >
                <Shield className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Security Settings</div>
                  <div className="text-muted-foreground text-xs">Manage security options</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={() => setEmailPrefsOpen(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Email Preferences</div>
                  <div className="text-muted-foreground text-xs">Configure notifications</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Data</CardTitle>
            <CardDescription>
              Download a copy of your data or permanently delete your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Download className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">Export your data</p>
                  <p className="text-muted-foreground text-sm">
                    Download workouts, meals, goals, achievements, and stats as JSON
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportData} disabled={exporting}>
                {exporting ? "Preparing..." : "Download"}
              </Button>
            </div>

            <div className="border-destructive/30 bg-destructive/5 flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Trash2 className="text-destructive h-5 w-5" />
                <div>
                  <p className="font-medium">Delete account</p>
                  <p className="text-muted-foreground text-sm">
                    Permanently delete your account and all associated data. This cannot be undone.
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDeleteConfirmEmail("");
                  setDeleteOpen(true);
                }}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and every workout, meal, goal, daily stat,
              and achievement attached to it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="delete-confirm-email">
              Type <span className="font-mono font-medium">{user.email}</span> to confirm
            </Label>
            <Input
              id="delete-confirm-email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={user.email ?? ""}
              autoComplete="off"
              disabled={deleting}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={
                deleting ||
                deleteConfirmEmail.trim().toLowerCase() !== (user.email ?? "").toLowerCase()
              }
            >
              {deleting ? "Deleting..." : "Permanently delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information. Changes will be saved to your account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name || ""}
                placeholder="Enter your name"
                required
                disabled={editProfileSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                defaultValue={user.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-muted-foreground text-xs">
                Email changes aren&apos;t supported here yet
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditProfileOpen(false)}
                disabled={editProfileSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editProfileSaving}>
                {editProfileSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Security Settings Dialog */}
      <Dialog open={securityOpen} onOpenChange={setSecurityOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Security Settings</DialogTitle>
            <DialogDescription>
              Manage your account security and authentication options.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Lock className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">Password</p>
                  <p className="text-muted-foreground text-sm">Change your account password</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSecurityOpen(false);
                  setChangePasswordOpen(true);
                }}
              >
                Change
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Smartphone className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-muted-foreground text-sm">Add an extra layer of security</p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Shield className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">Active Sessions</p>
                  <p className="text-muted-foreground text-sm">
                    Devices currently signed into your account
                  </p>
                </div>
              </div>
              {securityOpen && <SessionsList />}
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setSecurityOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <ChangePasswordForm
            onSuccess={() => {
              toast.success("Password changed");
              setTimeout(() => setChangePasswordOpen(false), 800);
            }}
            onCancel={() => setChangePasswordOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Email Preferences Dialog */}
      <Dialog open={emailPrefsOpen} onOpenChange={setEmailPrefsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Email Preferences</DialogTitle>
            <DialogDescription>Configure your email notification settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Marketing Emails</p>
                <p className="text-muted-foreground text-sm">Product updates and announcements</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Security Alerts</p>
                <p className="text-muted-foreground text-sm">Important security notifications</p>
              </div>
              <Badge variant="default">Always On</Badge>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setEmailPrefsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
