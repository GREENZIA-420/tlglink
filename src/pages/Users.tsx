import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Search, Ban } from "lucide-react";
import { authStorage } from "@/lib/auth";

interface TelegramUser {
  id: string;
  telegram_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  language_code: string | null;
  is_bot: boolean;
  ip_address: string | null;
  user_agent: string | null;
  platform: string | null;
  first_interaction_at: string;
  last_interaction_at: string;
  total_interactions: number;
  is_banned: boolean;
  banned_at: string | null;
}

const Users = () => {
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<TelegramUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [botId, setBotId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkAuthAndLoadUsers = async () => {
    try {
      const session = authStorage.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      const userId = session.user.id;
      const token = btoa(JSON.stringify(session));

      // Verify admin access
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (!userData || userData.role !== 'admin') {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les permissions nécessaires.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Get telegram users via edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-telegram-users`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du chargement des utilisateurs');
      }

      const { users: usersData } = await response.json();
      setUsers(usersData || []);
      setFilteredUsers(usersData || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndLoadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.telegram_id.toString().includes(query) ||
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleBanToggle = async (user: TelegramUser) => {
    try {
      const session = authStorage.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-telegram-user`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            telegramUserId: user.id,
            isBanned: !user.is_banned,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la modification du statut');
      }

      toast({
        title: user.is_banned ? "Utilisateur débanni" : "Utilisateur banni",
        description: user.is_banned 
          ? `${user.first_name} peut maintenant utiliser le bot.`
          : `${user.first_name} ne peut plus utiliser le bot.`,
      });

      // Refresh user list
      checkAuthAndLoadUsers();
    } catch (error) {
      console.error('Error toggling ban:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut de l'utilisateur.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Utilisateurs du Bot
            </h1>
            <p className="text-muted-foreground mt-1">
              {users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader>
            <CardTitle>Liste des utilisateurs</CardTitle>
            <CardDescription>
              Tous les utilisateurs ayant utilisé la commande /start
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par ID, nom ou username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Telegram ID</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Première interaction</TableHead>
                    <TableHead>Dernière interaction</TableHead>
                    <TableHead className="text-right">Interactions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {searchQuery ? "Aucun utilisateur trouvé" : "Aucun utilisateur enregistré"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-sm">
                          {user.telegram_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {user.first_name} {user.last_name}
                            </span>
                            {user.language_code && (
                              <span className="text-xs text-muted-foreground">
                                🌐 {user.language_code.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.username ? (
                            <span className="font-mono text-sm">@{user.username}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.is_banned ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                              Banni
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                              Actif
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(user.first_interaction_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(user.last_interaction_at)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {user.total_interactions}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={user.is_banned ? "outline" : "destructive"}
                            onClick={() => handleBanToggle(user)}
                          >
                            {user.is_banned ? "Débannir" : "Bannir"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Users;