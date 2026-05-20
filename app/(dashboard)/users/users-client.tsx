// app\(dashboard)\users\users-client.tsx

"use client";

import { useEffect, useMemo, useState } from "react";

import axios from "axios";

import { User } from "@prisma/client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Loader2,
  Plus,
  Shield,
  Trash2,
  User2,
  Users,
  X,
  KeyRound,
  Pencil,
  EyeOff,
  Eye,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";

interface Props {
  users: User[];
}

export default function UsersClient({ users: initialUsers }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers);

  const [loading, setLoading] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);

  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const [editUser, setEditUser] = useState<User | null>(null);
  const [showAddPassword, setShowAddPassword] = useState(false);

  const [showEditPassword, setShowEditPassword] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "crew",
    image: "",
  });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);

  const availablePermissions = [
    {
      key: "view_dashboard",
      label: "Dashboard",
    },

    {
      key: "view_flights",
      label: "Flights",
    },

    {
      key: "view_catalog",
      label: "Catalog",
    },

    {
      key: "view_vendors",
      label: "Vendors",
    },
    {
      key: "view_inventory",
      label: "Inventory",
    },
    {
      key: "view_approvals",
      label: "Approvals",
    },

    {
      key: "view_tracking",
      label: "Tracking",
    },

    {
      key: "view_users",
      label: "Users",
    },

    {
      key: "view_reports",
      label: "Reports",
    },
  ];
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "crew",
    status: "Active",
  });

  const stats = useMemo(() => {
    return {
      admins: users.filter((u) => u.role === "admin").length,

      directors: users.filter((u) => u.role === "director").length,

      pilots: users.filter((u) => u.role === "pilot").length,

      crew: users.filter((u) => u.role === "crew").length,
    };
  }, [users]);

  const handleAddUser = async () => {
    try {
      setLoading(true);

      const res = await axios.post("/api/users", newUser);

      setUsers((prev) => [res.data, ...prev]);

      setOpenAdd(false);

      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "crew",
        status: "Active",
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (!deleteUser) return;

      setLoading(true);

      await axios.delete(`/api/users/${deleteUser.id}`);

      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));

      setDeleteUser(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (user: User) => {
    try {
      const newStatus = user.status === "Active" ? "Inactive" : "Active";

      const res = await axios.patch(`/api/users/${user.id}/status`, {
        status: newStatus,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                status: res.data.status,
              }
            : u,
        ),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditUser = async () => {
    try {
      if (!editUser) return;

      setLoading(true);

      let imageUrl = editForm.image;

      // IMAGE UPLOAD
      if (editImageFile) {
        const formData = new FormData();

        formData.append("file", editImageFile);

        const uploadRes = await axios.post("/api/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        imageUrl = uploadRes.data.url;
      }

      const res = await axios.patch(`/api/users/${editUser.id}`, {
        name: editForm.name,
        email: editForm.email,
        password: editForm.password,
        role: editForm.role,
        image: imageUrl,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? res.data : u)),
      );

      setEditUser(null);

      setEditImageFile(null);

      setEditForm({
        name: "",
        email: "",
        password: "",
        role: "crew",
        image: "",
      });

      toast({
        title: "Success",
        description: "User updated successfully.",
      });
    } catch (error) {
      console.error(error);

      toast({
        title: "Error",
        description: "Failed to update user.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700 border-red-200";

      case "director":
        return "bg-violet-100 text-violet-700 border-violet-200";

      case "pilot":
        return "bg-blue-100 text-blue-700 border-blue-200";

      default:
        return "bg-orange-100 text-orange-700 border-orange-200";
    }
  };
  const [rolePermissions, setRolePermissions] = useState<
    Record<string, string[]>
  >({});

  const [permissionsLoading, setPermissionsLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setPermissionsLoading(true);

      const res = await axios.get("/api/permissions");

      const formatted: Record<string, string[]> = {};

      res.data.forEach((item: { role: string; permissions: string[] }) => {
        formatted[item.role] = item.permissions || [];
      });

      setRolePermissions(formatted);
    } catch (error) {
      console.error(error);

      toast({
        title: "Error",
        description: "Failed to load permissions.",
        variant: "destructive",
      });
    } finally {
      setPermissionsLoading(false);
    }
  };
  return (
    <>
      <div className="  w-full min-w-0 space-y-6 sm:space-y-8 overflow-hidden">
        {/* HEADER */}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              User Management
            </h1>

            <p className="text-slate-500 mt-1">
              Manage user access, roles and permissions.
            </p>
          </div>

          <Button
            onClick={() => setOpenAdd(true)}
            className="rounded-2xl h-12 px-6 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* STATS */}

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4 sm:gap-5">
          <StatsCard
            icon={<Shield className="w-6 h-6 text-red-600" />}
            value={stats.admins}
            label="Admins"
            bg="bg-red-100"
          />

          <StatsCard
            icon={<Crown className="w-6 h-6 text-violet-600" />}
            value={stats.directors}
            label="Directors"
            bg="bg-violet-100"
          />

          <StatsCard
            icon={<User2 className="w-6 h-6 text-blue-600" />}
            value={stats.pilots}
            label="Pilots"
            bg="bg-blue-100"
          />

          <StatsCard
            icon={<Users className="w-6 h-6 text-orange-600" />}
            value={stats.crew}
            label="Crew"
            bg="bg-orange-100"
          />
        </div>

        {/* USERS */}

        <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
          <CardContent className="p-0 overflow-hidden">
            <div className="px-5 sm:px-8 py-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">All Users</h2>
            </div>

            <div className="divide-y divide-slate-100">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="
        p-4
        sm:p-6
        flex
        flex-col
        xl:flex-row
        xl:items-center
        justify-between
        gap-5
        hover:bg-slate-50/70
        transition-all
      "
                >
                  {/* LEFT SIDE */}
                  <div
                    className="
          flex
          items-start
          sm:items-center
          gap-4
          min-w-0
          flex-1
        "
                  >
                    {/* AVATAR */}
                    <div
                      className="
            w-14
            h-14
            rounded-2xl
            bg-[#1868A5]/10
            text-[#1868A5]
            flex
            items-center
            justify-center
            font-bold
            text-lg
            shrink-0
          "
                    >
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className="w-full h-full rounded-2xl object-cover"
                        />
                      ) : (
                        user.name?.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* INFO */}
                    <div className="min-w-0 flex-1">
                      <div
                        className="
              flex
              flex-col
              sm:flex-row
              sm:items-center
              gap-2
            "
                      >
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                          {user.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              `
                    inline-flex
                    items-center
                    rounded-full
                    px-3
                    py-1
                    text-xs
                    font-semibold
                    border
                  `,
                              roleBadge(user.role),
                            )}
                          >
                            {user.role}
                          </span>

                          <span
                            className={cn(
                              `
                    inline-flex
                    items-center
                    rounded-full
                    px-3
                    py-1
                    text-xs
                    font-semibold
                  `,
                              user.status === "Active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-700",
                            )}
                          >
                            {user.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 truncate mt-1">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div
                    className={cn(
                      `
      grid
      gap-3
      w-full
      xl:w-auto
    `,
                      user.role === "admin"
                        ? "grid-cols-1 sm:grid-cols-1 xl:min-w-[180px]"
                        : "grid-cols-1 sm:grid-cols-3 xl:min-w-[420px]",
                    )}
                  >
                    {user.role !== "admin" && (
                      <Button
                        variant="outline"
                        className="
      h-11
      rounded-2xl
      border-[#1868A5]/20
      hover:bg-[#1868A5]
      hover:text-white
      transition-all
    "
                        onClick={() => handleStatusToggle(user)}
                      >
                        {user.status === "Active" ? "Deactivate" : "Activate"}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      className="
    h-11
    rounded-2xl
    border-[#1868A5]/20
    hover:bg-[#1868A5]
    hover:text-white
    transition-all
  "
                      onClick={() => {
                        setEditUser(user);

                        setEditForm({
                          name: user.name || "",
                          email: user.email || "",
                          password: "",
                          role: user.role || "crew",
                          image: user.image || "",
                        });
                        setEditImageFile(null);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>

                    {user.role !== "admin" && (
                      <Button
                        className="
      h-11
      rounded-2xl
      bg-red-500
      hover:bg-red-600
      text-white
    "
                        onClick={() => setDeleteUser(user)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ROLE PERMISSIONS */}

        <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Role Permissions
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Configure sidebar access and route permissions.
                </p>
              </div>
            </div>
            {permissionsLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs defaultValue="admin" className="w-full">
                <TabsList
                  className="
          w-full
          h-auto
          p-1
          rounded-2xl
          bg-slate-100
          grid
          grid-cols-2
          md:grid-cols-5
          gap-2
        "
                >
                  <TabsTrigger value="admin" className="rounded-xl">
                    Admin
                  </TabsTrigger>

                  <TabsTrigger value="director" className="rounded-xl">
                    Director
                  </TabsTrigger>

                  <TabsTrigger value="approver" className="rounded-xl">
                    Approver
                  </TabsTrigger>

                  <TabsTrigger value="pilot" className="rounded-xl">
                    Pilot
                  </TabsTrigger>

                  <TabsTrigger value="crew" className="rounded-xl">
                    Crew
                  </TabsTrigger>
                </TabsList>

                {Object.entries(rolePermissions || {}).map(
                  ([role, permissions]) => (
                    <TabsContent key={role} value={role} className="mt-8">
                      <div
                        className="
              grid
              grid-cols-1
              md:grid-cols-2
              xl:grid-cols-3
              gap-4
            "
                      >
                        {availablePermissions.map((item) => {
                          const enabled = permissions?.includes(item.key);

                          return (
                            <div
                              key={item.key}
                              className="
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-5
                    flex
                    items-center
                    justify-between
                    gap-4
                    hover:border-primary/30
                    hover:shadow-sm
                    transition-all
                  "
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">
                                  {item.label}
                                </p>

                                <p className="text-xs text-slate-500 mt-1 break-all">
                                  {item.key}
                                </p>
                              </div>

                              <Switch
                                checked={enabled}
                                onCheckedChange={(checked) => {
                                  setRolePermissions((prev) => ({
                                    ...prev,

                                    [role]: checked
                                      ? [
                                          ...prev[role as keyof typeof prev],
                                          item.key,
                                        ]
                                      : prev[role as keyof typeof prev].filter(
                                          (p) => p !== item.key,
                                        ),
                                  }));
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-8 flex justify-end">
                        <Button
                          className="
    rounded-2xl
    h-11
    px-6
  "
                          onClick={async () => {
                            try {
                              await axios.patch("/api/permissions", {
                                role,

                                permissions,
                              });

                              toast({
                                title: "Permissions Updated",

                                description: `${role} permissions saved successfully.`,
                              });
                            } catch (error) {
                              console.error(error);

                              toast({
                                title: "Error",

                                description: "Failed to save permissions.",

                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Save Permissions
                        </Button>
                      </div>
                    </TabsContent>
                  ),
                )}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ADD USER MODAL */}

      {openAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add User</h2>

                <p className="text-sm text-slate-500 mt-1">
                  Create new system access.
                </p>
              </div>

              <button
                onClick={() => setOpenAdd(false)}
                className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Full Name
                </label>

                <Input
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      name: e.target.value,
                    })
                  }
                  placeholder="Captain Raj"
                  className="rounded-2xl h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>

                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      email: e.target.value,
                    })
                  }
                  placeholder="raj@skyblue.com"
                  className="rounded-2xl h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <Input
                    type={showAddPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        password: e.target.value,
                      })
                    }
                    placeholder="••••••••"
                    className="rounded-2xl h-12 pr-12"
                  />

                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="
        absolute
        right-3
        top-1/2
        -translate-y-1/2
        text-slate-500
        hover:text-slate-700
      "
                  >
                    {showAddPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Role
                </label>

                <Select
                  value={newUser.role}
                  onValueChange={(value) =>
                    setNewUser({
                      ...newUser,
                      role: value,
                    })
                  }
                >
                  <SelectTrigger className="rounded-2xl h-12">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="crew">Crew</SelectItem>

                    <SelectItem value="pilot">Pilot</SelectItem>

                    <SelectItem value="director">Director</SelectItem>

                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setOpenAdd(false)}
                className="rounded-2xl w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                onClick={handleAddUser}
                disabled={loading}
                className="rounded-2xl w-full sm:w-auto"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}

      {deleteUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Delete User
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  This action cannot be undone.
                </p>
              </div>

              <button
                onClick={() => setDeleteUser(null)}
                className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />

                <div>
                  <p className="font-semibold text-red-700">
                    Delete {deleteUser.name}?
                  </p>

                  <p className="text-sm text-red-600 mt-1">
                    This permanently removes the user account.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteUser(null)}
                className="rounded-2xl w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={handleDelete}
                className="rounded-2xl w-full sm:w-auto"
              >
                Delete User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}

      {/* EDIT USER MODAL */}

      {editUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="
        bg-white
        rounded-3xl
        shadow-2xl
        w-full
        max-w-lg
        h-[80vh]
        overflow-hidden
        flex
        flex-col
      "
          >
            {/* HEADER */}

            <div
              className="
          p-6
          border-b
          border-slate-200
          flex
          items-center
          justify-between
          shrink-0
        "
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit User</h2>

                <p className="text-sm text-slate-500 mt-1">
                  Update user details.
                </p>
              </div>

              <button
                onClick={() => setEditUser(null)}
                className="
            w-10
            h-10
            rounded-xl
            hover:bg-slate-100
            flex
            items-center
            justify-center
          "
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* SCROLLABLE CONTENT */}

            <div
              className="
          flex-1
          overflow-y-auto
          p-6
          space-y-5
        "
            >
              {/* EXISTING IMAGE */}

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">
                  Profile Image
                </label>

                <div className="flex items-center gap-4">
                  <div
                    className="
                w-24
                h-24
                rounded-2xl
                overflow-hidden
                border
                border-slate-200
                bg-slate-100
                shrink-0
              "
                  >
                    {(editImageFile || editForm.image) && (
                      <img
                        src={
                          editImageFile
                            ? URL.createObjectURL(editImageFile)
                            : editForm.image
                        }
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <Input
                    type="file"
                    accept="image/*"
                    className="rounded-2xl"
                    onChange={(e) => {
                      const file = e.target.files?.[0];

                      if (file) {
                        setEditImageFile(file);
                      }
                    }}
                  />
                </div>
              </div>

              {/* NAME */}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Full Name
                </label>

                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      name: e.target.value,
                    })
                  }
                  className="rounded-2xl h-12"
                />
              </div>

              {/* EMAIL */}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>

                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      email: e.target.value,
                    })
                  }
                  className="rounded-2xl h-12"
                />
              </div>

              {/* PASSWORD */}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <Input
                    type={showEditPassword ? "text" : "password"}
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        password: e.target.value,
                      })
                    }
                    placeholder="Leave empty to keep current password"
                    className="rounded-2xl h-12 pr-12"
                  />

                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="
        absolute
        right-3
        top-1/2
        -translate-y-1/2
        text-slate-500
        hover:text-slate-700
      "
                  >
                    {showEditPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* ROLE */}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Role
                </label>

                <Select
                  value={editForm.role}
                  onValueChange={(value) =>
                    setEditForm({
                      ...editForm,
                      role: value,
                    })
                  }
                >
                  <SelectTrigger className="rounded-2xl h-12">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="crew">Crew</SelectItem>

                    <SelectItem value="pilot">Pilot</SelectItem>

                    <SelectItem value="director">Director</SelectItem>

                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* FOOTER */}

            <div
              className="
          p-6
          border-t
          border-slate-200
          bg-slate-50
          flex
          flex-col
          sm:flex-row
          justify-end
          gap-3
          shrink-0
        "
            >
              <Button
                variant="outline"
                onClick={() => setEditUser(null)}
                className="rounded-2xl w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                onClick={handleEditUser}
                disabled={loading}
                className="rounded-2xl w-full sm:w-auto"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update User
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatsCard({
  icon,
  value,
  label,
  bg,
}: {
  icon: React.ReactNode;

  value: number;

  label: string;

  bg: string;
}) {
  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardContent className="p-6 flex items-center gap-5">
        <div
          className={cn(
            `
              w-14
              h-14
              rounded-2xl
              flex
              items-center
              justify-center
            `,
            bg,
          )}
        >
          {icon}
        </div>

        <div>
          <p className="text-3xl font-bold text-slate-900">{value}</p>

          <p className="text-sm text-slate-500 mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
