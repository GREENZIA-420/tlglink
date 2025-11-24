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
import { ArrowLeft, Search, Ban, CheckCircle, Users, Bot, Activity, Key, Save } from "lucide-react";
import { authStorage } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

interface BotConfig {
  id: string;
  bot_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  bot_configs: BotConfig[];
  telegram_users_count: number;
}

const SuperAdmin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [encryptionSalt, setEncryptionSalt] = useState("");
  const [isSavingSalt, setIsSavingSalt] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Statistiques calculées
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const totalBots = users.reduce((acc, u) => {
    return acc + (Array.isArray(u.bot_configs) ? u.bot_configs.length : 0);
  }, 0);
  const activeBots = users.reduce((acc, u) => {
    return acc + (Array.isArray(u.bot_configs) ? u.bot_configs.filter(b => b.is_active).length : 0);
  }, 0);
  const totalTelegramUsers = users.reduce((acc, u) => acc + (u.telegram_users_count || 0), 0);

  const checkAuthAndLoadUsers = async () => {
    try {
      const session = authStorage.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      const userId = session.user.id;
      const token = btoa(JSON.stringify(session));

      // Vérifier l'accès super admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (!userData || userData.role !== 'super_admin') {
        toast({
          title: "Accès refusé",
          description: "Vous devez être super admin pour accéder à cette page.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Charger tous les utilisateurs via l'edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-users`,
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

      // Charger le salt d'encryption actuel
      const saltResponse = await supabase
        .from('bot_settings')
        .select('value')
        .eq('key', 'encryption_salt')
        .limit(1)
        .maybeSingle();

      if (saltResponse.data) {
        setEncryptionSalt(saltResponse.data.value);
      }
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
      user.email.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.bot_configs?.some(bot => bot.bot_name?.toLowerCase().includes(query))
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleBanToggle = async (user: User) => {
    try {
      const session = authStorage.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-ban`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetUserId: user.id,
            isBanned: user.is_active,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la modification du statut');
      }

      toast({
        title: user.is_active ? "Utilisateur banni" : "Utilisateur débanni",
        description: user.is_active 
          ? `${user.email} ne peut plus accéder au site et son bot est désactivé.`
          : `${user.email} peut à nouveau accéder au site et son bot est réactivé.`,
      });

      // Actualiser la liste
      checkAuthAndLoadUsers();
    } catch (error) {
      console.error('Error toggling ban:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier le statut de l'utilisateur.",
        variant: "destructive",
      });
    }
  };

  const handleSaveEncryptionSalt = async () => {
    if (!encryptionSalt.trim()) {
      toast({
        title: "Erreur",
        description: "Le salt d'encryption ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }

    setIsSavingSalt(true);
    try {
      const session = authStorage.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Sauvegarder dans les secrets Supabase
      const { error } = await supabase
        .from('bot_settings')
        .upsert({
          key: 'encryption_salt',
          value: encryptionSalt,
          description: 'Salt utilisé pour le chiffrement des tokens de bot',
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast({
        title: "Salt sauvegardé",
        description: "Le salt d'encryption a été mis à jour avec succès",
      });
    } catch (error) {
      console.error('Error saving salt:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le salt d'encryption",
        variant: "destructive",
      });
    } finally {
      setIsSavingSalt(false);
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
              Super Admin - Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestion complète de la plateforme
            </p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{totalUsers}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeUsers} actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{totalBots}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeBots} actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Utilisateurs Telegram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{totalTelegramUsers}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total sur tous les bots
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taux d'activité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold">
                  {totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Utilisateurs actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bots actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold">
                  {totalBots > 0 ? Math.round((activeBots / totalBots) * 100) : 0}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Taux d'activation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Onglets */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="security">Sécurité</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-2 shadow-xl">
          <CardHeader>
            <CardTitle>Liste des créateurs de bot</CardTitle>
            <CardDescription>
              Gérez tous les utilisateurs et leurs bots
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email, nom, rôle ou nom de bot..."
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
                    <TableHead>Email</TableHead>
                    <TableHead>Nom complet</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Bot</TableHead>
                    <TableHead>Utilisateurs Bot</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {searchQuery ? "Aucun utilisateur trouvé" : "Aucun utilisateur enregistré"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          {user.full_name || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'super_admin' 
                              ? 'bg-purple-500/10 text-purple-600' 
                              : user.role === 'admin'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-gray-500/10 text-gray-600'
                          }`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.bot_configs && user.bot_configs.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {user.bot_configs.map((bot) => (
                                <div key={bot.id} className="flex items-center gap-2">
                                  <span className="font-mono text-sm">{bot.bot_name || 'Sans nom'}</span>
                                  {bot.is_active ? (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Ban className="h-3 w-3 text-destructive" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Aucun bot</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {user.telegram_users_count}
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                              Actif
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                              Banni
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(user.created_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(user.last_login_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.role !== 'super_admin' && (
                            <Button
                              size="sm"
                              variant={user.is_active ? "destructive" : "outline"}
                              onClick={() => handleBanToggle(user)}
                            >
                              {user.is_active ? "Bannir" : "Débannir"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Configuration de la Sécurité
                </CardTitle>
                <CardDescription>
                  Gérez les paramètres de chiffrement des tokens de bot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="encryption-salt">
                    Salt de Chiffrement
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Ce salt est utilisé pour chiffrer les tokens de bot dans la base de données. 
                    Modifiez-le avec précaution car cela invalidera tous les tokens existants.
                  </p>
                  <Input
                    id="encryption-salt"
                    type="password"
                    value={encryptionSalt}
                    onChange={(e) => setEncryptionSalt(e.target.value)}
                    placeholder="Entrez un salt sécurisé"
                    className="font-mono"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleSaveEncryptionSalt}
                    disabled={isSavingSalt}
                    className="w-full sm:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSavingSalt ? "Sauvegarde..." : "Sauvegarder le Salt"}
                  </Button>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm">⚠️ Avertissement</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• La modification du salt invalidera tous les tokens chiffrés existants</li>
                    <li>• Les utilisateurs devront reconfigurer leurs bots après ce changement</li>
                    <li>• Assurez-vous de sauvegarder le salt actuel avant de le modifier</li>
                    <li>• Utilisez un salt long et aléatoire pour une sécurité optimale</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdmin;
