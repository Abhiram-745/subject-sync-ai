import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Users, Crown, Ban, Search, UserX, Eye, Calendar, BookOpen, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  role: "paid" | "free";
  is_banned: boolean;
  created_at: string;
}

interface UserStats {
  timetables: any[];
  events: any[];
  homeworks: any[];
  studySessions: any[];
  testScores: any[];
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  const checkAdminAndLoadUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      if (user.email !== "abhiramkakarla1@gmail.com") {
        toast.error("You don't have access to this page");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await loadUsers();
    } catch (error) {
      console.error("Error:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // First, get user data from edge function (which has service role access)
      const { data: emailData, error: emailError } = await supabase.functions.invoke('admin-get-users');
      
      if (emailError) {
        console.error("Error fetching users from edge function:", emailError);
        throw emailError;
      }

      const authUsers = emailData?.users || [];

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, created_at");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Get all user roles (admin has access via RLS policy)
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      }

      // Get banned users
      const { data: bannedUsers, error: bannedError } = await supabase
        .from("banned_users")
        .select("user_id");

      if (bannedError) {
        console.error("Error fetching banned users:", bannedError);
      }

      // Build user list from auth users
      const userList: UserData[] = authUsers.map((authUser: any) => {
        const profile = profiles?.find((p) => p.id === authUser.id);
        const role = roles?.find((r) => r.user_id === authUser.id);
        const isBanned = bannedUsers?.some((b) => b.user_id === authUser.id);
        
        return {
          id: authUser.id,
          email: authUser.email || "",
          full_name: profile?.full_name || null,
          role: (role?.role as "paid" | "free") || "free",
          is_banned: isBanned || false,
          created_at: authUser.created_at || profile?.created_at || "",
        };
      });

      setUsers(userList);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    }
  };

  const handleGrantPremium = async (userId: string) => {
    setActionLoading(userId);
    try {
      // Check if role exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: "paid" })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "paid" });

        if (error) throw error;
      }

      toast.success("Premium granted successfully");
      await loadUsers();
    } catch (error) {
      console.error("Error granting premium:", error);
      toast.error("Failed to grant premium");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokePremium = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "free" })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Premium revoked successfully");
      await loadUsers();
    } catch (error) {
      console.error("Error revoking premium:", error);
      toast.error("Failed to revoke premium");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("banned_users")
        .insert({ user_id: userId, banned_by: user.id });

      if (error) throw error;

      toast.success("User banned successfully");
      await loadUsers();
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Failed to ban user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from("banned_users")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("User unbanned successfully");
      await loadUsers();
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error("Failed to unban user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewUser = async (user: UserData) => {
    setSelectedUser(user);
    setStatsLoading(true);
    
    try {
      // Load user's data
      const [timetablesRes, eventsRes, homeworksRes, sessionsRes, scoresRes] = await Promise.all([
        supabase.from("timetables").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("events").select("*").eq("user_id", user.id).order("start_time", { ascending: false }).limit(20),
        supabase.from("homeworks").select("*").eq("user_id", user.id).order("due_date", { ascending: true }),
        supabase.from("study_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("test_scores").select("*").eq("user_id", user.id).order("test_date", { ascending: false }),
      ]);

      setUserStats({
        timetables: timetablesRes.data || [],
        events: eventsRes.data || [],
        homeworks: homeworksRes.data || [],
        studySessions: sessionsRes.data || [],
        testScores: scoresRes.data || [],
      });
    } catch (error) {
      console.error("Error loading user stats:", error);
      toast.error("Failed to load user stats");
    } finally {
      setStatsLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-hero rounded-xl blur-md opacity-60"></div>
            <div className="relative bg-gradient-hero p-3 rounded-xl shadow-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Admin Panel</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage users and permissions</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{users.filter((u) => u.role === "paid").length}</p>
                  <p className="text-sm text-muted-foreground">Premium Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{users.filter((u) => u.role === "free").length}</p>
                  <p className="text-sm text-muted-foreground">Free Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Ban className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{users.filter((u) => u.is_banned).length}</p>
                  <p className="text-sm text-muted-foreground">Banned Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Users ({filteredUsers.length})
                </CardTitle>
                <CardDescription>View and manage user access levels</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{user.full_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{user.email || user.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.email === "abhiramkakarla1@gmail.com" ? (
                      <Badge className="bg-gradient-hero">Admin</Badge>
                    ) : (
                      <>
                        <Badge variant={user.role === "paid" ? "default" : "secondary"}>
                          {user.role === "paid" ? "Premium" : "Free"}
                        </Badge>
                        {user.is_banned && (
                          <Badge variant="destructive">Banned</Badge>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {user.is_banned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnbanUser(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleBanUser(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            Ban
                          </Button>
                        )}

                        {user.role === "paid" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokePremium(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            Revoke Premium
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-gradient-hero"
                            onClick={() => handleGrantPremium(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            Grant Premium
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                User Details: {selectedUser?.full_name || "Unknown"}
              </DialogTitle>
              <DialogDescription>{selectedUser?.email || selectedUser?.id}</DialogDescription>
            </DialogHeader>

            {statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading user data...</div>
              </div>
            ) : userStats ? (
              <Tabs defaultValue="timetables" className="w-full">
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="timetables">
                    <BookOpen className="h-4 w-4 mr-1" />
                    Timetables ({userStats.timetables.length})
                  </TabsTrigger>
                  <TabsTrigger value="events">
                    <Calendar className="h-4 w-4 mr-1" />
                    Events ({userStats.events.length})
                  </TabsTrigger>
                  <TabsTrigger value="homework">
                    Homework ({userStats.homeworks.length})
                  </TabsTrigger>
                  <TabsTrigger value="sessions">
                    <Clock className="h-4 w-4 mr-1" />
                    Sessions ({userStats.studySessions.length})
                  </TabsTrigger>
                  <TabsTrigger value="scores">
                    Test Scores ({userStats.testScores.length})
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[400px] mt-4">
                  <TabsContent value="timetables" className="space-y-2 mt-0">
                    {userStats.timetables.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No timetables</p>
                    ) : (
                      userStats.timetables.map((tt: any) => (
                        <div key={tt.id} className="p-3 border rounded-lg">
                          <p className="font-medium">{tt.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {tt.start_date} to {tt.end_date}
                          </p>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="events" className="space-y-2 mt-0">
                    {userStats.events.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No events</p>
                    ) : (
                      userStats.events.map((evt: any) => (
                        <div key={evt.id} className="p-3 border rounded-lg">
                          <p className="font-medium">{evt.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(evt.start_time).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="homework" className="space-y-2 mt-0">
                    {userStats.homeworks.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No homework</p>
                    ) : (
                      userStats.homeworks.map((hw: any) => (
                        <div key={hw.id} className="p-3 border rounded-lg">
                          <p className="font-medium">{hw.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {hw.subject} - Due: {hw.due_date}
                          </p>
                          <Badge variant={hw.completed ? "default" : "secondary"}>
                            {hw.completed ? "Completed" : "Pending"}
                          </Badge>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="sessions" className="space-y-2 mt-0">
                    {userStats.studySessions.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No study sessions</p>
                    ) : (
                      userStats.studySessions.map((session: any) => (
                        <div key={session.id} className="p-3 border rounded-lg">
                          <p className="font-medium">{session.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.topic} - {session.planned_duration_minutes} mins
                          </p>
                          <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                            {session.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="scores" className="space-y-2 mt-0">
                    {userStats.testScores.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No test scores</p>
                    ) : (
                      userStats.testScores.map((score: any) => (
                        <div key={score.id} className="p-3 border rounded-lg">
                          <p className="font-medium">{score.subject} - {score.test_type}</p>
                          <p className="text-sm text-muted-foreground">
                            Score: {score.marks_obtained}/{score.total_marks} ({score.percentage}%)
                          </p>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            ) : null}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Admin;