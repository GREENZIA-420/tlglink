import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, ArrowLeft, Lock, Users, Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { authStorage } from "@/lib/auth";

const SuperAdmin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBots: 0,
    totalTelegramUsers: 0,
    totalRegisteredUsers: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    setIsLoading(true);
    try {
      const session = authStorage.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      const userId = session.user.id;

      // Check if user is admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (!userData || userData.role !== 'admin') {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les permissions nécessaires",
          variant: "destructive",
        });
        navigate("/admin");
        return;
      }

      // Load stats
      await loadStats();
    } catch (error) {
      console.error('Access check error:', error);
      navigate("/admin");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      // Count total users with roles
      const { count: usersCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true });

      // Count total bot configs
      const { count: botsCount } = await supabase
        .from('bot_configs')
        .select('*', { count: 'exact', head: true });

      // Count total telegram users
      const { count: telegramUsersCount } = await supabase
        .from('telegram_users')
        .select('*', { count: 'exact', head: true });

      // Count total registered users (from auth.users)
      const { data: registeredUsersCount, error: countError } = await supabase
        .rpc('count_registered_users');

      if (countError) {
        console.error('Error counting registered users:', countError);
      }

      setStats({
        totalUsers: usersCount || 0,
        totalBots: botsCount || 0,
        totalTelegramUsers: telegramUsersCount || 0,
        totalRegisteredUsers: registeredUsersCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleEncryptExistingTokens = async () => {
    setIsEncrypting(true);
    try {
      const { data, error } = await supabase.functions.invoke('encrypt-existing-tokens');

      if (error) throw error;

      toast({
        title: "✅ Rechiffrement terminé",
        description: `${data.encrypted} token(s) rechiffré(s), ${data.skipped} déjà chiffré(s)`,
      });

      // Reload stats after encryption
      await loadStats();
    } catch (error) {
      console.error('Encryption error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechiffrer les tokens",
        variant: "destructive",
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-telegram" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-5xl mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Super Admin</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Gestion avancée du système
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Utilisateurs Inscrits
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? "..." : stats.totalRegisteredUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                Comptes auth créés
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Utilisateurs Admin
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? "..." : stats.totalUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                Comptes avec rôles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Bots Configurés
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? "..." : stats.totalBots}
              </div>
              <p className="text-xs text-muted-foreground">
                Bots actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Utilisateurs Telegram
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? "..." : stats.totalTelegramUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                Total enregistrés
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Security Section */}
        <div className="space-y-6">
          <Card className="border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-destructive" />
                <CardTitle>Sécurité - Chiffrement</CardTitle>
              </div>
              <CardDescription>
                Gestion du chiffrement des tokens bot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <Lock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertTitle>Rechiffrement des tokens</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p className="text-sm">
                    Cette action rechiffre tous les tokens bot existants avec la clé de chiffrement sécurisée stockée dans les secrets Supabase.
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc">
                    <li>Les tokens déjà chiffrés seront ignorés</li>
                    <li>Les tokens en clair seront chiffrés avec AES-256-GCM</li>
                    <li>Cette opération est sûre et peut être exécutée plusieurs fois</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-4">
                <Button
                  onClick={handleEncryptExistingTokens}
                  disabled={isEncrypting}
                  variant="destructive"
                  size="lg"
                  className="w-full"
                >
                  {isEncrypting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rechiffrement en cours...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Rechiffrer tous les tokens maintenant
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">ℹ️ Informations importantes :</p>
                  <ul className="ml-4 space-y-0.5">
                    <li>• Seuls les administrateurs peuvent effectuer cette action</li>
                    <li>• L'opération utilise la clé ENCRYPTION_SALT des secrets Supabase</li>
                    <li>• Les tokens chiffrés ne sont jamais affichés en clair dans l'interface</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Détails Système</CardTitle>
              <CardDescription>
                Informations techniques sur la configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Composant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Chiffrement</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">
                        Actif
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      AES-256-GCM avec SALT sécurisé
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">RLS</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">
                        Actif
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      Toutes les tables protégées
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Edge Functions</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">
                        Déployées
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      5 fonctions actives
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Authentification</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">
                        Configurée
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      Email + Rôles
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SuperAdmin;
