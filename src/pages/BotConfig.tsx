import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Check, Send, Loader2, Key, AlertTriangle } from "lucide-react";
import { authStorage } from "@/lib/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BotConfig = () => {
  const [botConfig, setBotConfig] = useState<any>(null);
  const [botToken, setBotToken] = useState("");
  const [botName, setBotName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tokenChanged, setTokenChanged] = useState(false);
  const [clearToken, setClearToken] = useState(""); // Pour garder le token en clair temporairement
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadBotConfig = async () => {
    try {
      const session = authStorage.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      // Créer un token encodé pour l'edge function
      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-bot-config`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de la configuration');
      }

      const { config } = await response.json();

      if (config) {
        setBotConfig(config);
        setBotName(config.bot_name || "");
        // Ne jamais afficher le token pour des raisons de sécurité
        setBotToken("");
        setTokenChanged(false);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la configuration.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBotConfig();
  }, []);

  const handleSave = async () => {
    // Only validate token if it's a new config or token was changed
    if ((!botConfig || tokenChanged) && !botToken.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer le token du bot.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const session = authStorage.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const action = botConfig ? 'update' : 'create';
      const payload: any = {
        action,
        botConfig: {
          id: botConfig?.id,
          bot_name: botName || null,
          is_active: true,
        },
      };

      // Only include token if it was changed or it's a new config
      if (!botConfig || tokenChanged) {
        payload.botConfig.bot_token = botToken;
      }

      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-bot-config`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde de la configuration');
      }

      // Garder le token en clair pour configurer le webhook
      if (!botConfig || tokenChanged) {
        setClearToken(botToken);
      }

      await loadBotConfig();

      toast({
        title: "Succès",
        description: "Configuration enregistrée. Vous pouvez maintenant configurer le webhook.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    if (botConfig?.webhook_url) {
      navigator.clipboard.writeText(botConfig.webhook_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copié",
        description: "URL du webhook copiée dans le presse-papier.",
      });
    }
  };

  const handleSetWebhook = async () => {
    if (!clearToken || !botConfig?.webhook_url) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord enregistrer la configuration avec un token valide",
        variant: "destructive",
      });
      return;
    }

    setIsSettingWebhook(true);
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${clearToken}/setWebhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: botConfig.webhook_url }),
        }
      );

      const data = await response.json();

      if (data.ok) {
        setClearToken(""); // Effacer le token en clair après utilisation
        toast({
          title: "✅ Webhook configuré",
          description: "Le bot est maintenant opérationnel",
        });
      } else {
        toast({
          title: "Erreur",
          description: data.description || "Échec de la configuration",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de configurer le webhook",
        variant: "destructive",
      });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  const handleGenerateRecoveryKey = async () => {
    setIsGeneratingKey(true);
    try {
      const session = authStorage.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recovery-key`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération de la clé');
      }

      setRecoveryKey(data.recovery_key);
      setKeyRevealed(true);
      
      toast({
        title: "✅ Clé générée",
        description: "Veuillez sauvegarder cette clé dans un lieu sûr. Elle ne sera plus affichée.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer la clé de récupération.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const copyRecoveryKey = () => {
    if (recoveryKey) {
      navigator.clipboard.writeText(recoveryKey);
      toast({
        title: "Copié",
        description: "Clé de récupération copiée dans le presse-papier.",
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
      <div className="max-w-2xl mx-auto">
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
              Configuration du Bot
            </h1>
            <p className="text-muted-foreground mt-1">
              Configurez votre bot Telegram
            </p>
          </div>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader>
            <CardTitle>Paramètres du Bot</CardTitle>
            <CardDescription>
              Entrez les informations de votre bot Telegram
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="botName">Nom du bot (optionnel)</Label>
              <Input
                id="botName"
                placeholder="Mon Bot Telegram"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="botToken">
                Token du bot * 
                {botConfig && <span className="text-xs text-muted-foreground ml-2">(Laissez vide pour conserver l'actuel)</span>}
              </Label>
              <Input
                id="botToken"
                type="password"
                placeholder={botConfig ? "Entrez un nouveau token pour le modifier" : "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"}
                value={botToken}
                onChange={(e) => {
                  setBotToken(e.target.value);
                  setTokenChanged(true);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Obtenez votre token auprès de @BotFather sur Telegram
              </p>
              {botConfig && !tokenChanged && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✓ Token actuel chiffré et sécurisé
                </p>
              )}
            </div>

            {botConfig && (
              <>
                <div className="space-y-2">
                  <Label>URL du Webhook</Label>
                  <div className="flex gap-2">
                    <Input
                      value={botConfig.webhook_url || ""}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyWebhookUrl}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cette URL est générée automatiquement pour votre bot
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-2">Activation du Bot</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {!clearToken 
                      ? "Enregistrez d'abord la configuration avec un token pour activer le webhook"
                      : "Cliquez pour configurer le webhook et activer votre bot"
                    }
                  </p>
                  <Button
                    onClick={handleSetWebhook}
                    disabled={isSettingWebhook || !clearToken}
                    className="w-full"
                  >
                    {isSettingWebhook ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Configuration...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Configurer le Webhook
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? "Sauvegarde..." : "Enregistrer la configuration"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-xl mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Clé de Récupération</CardTitle>
            </div>
            <CardDescription>
              Générez une clé pour récupérer l'accès à votre compte en cas d'oubli du mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important :</strong> Cette clé vous permettra de réinitialiser votre mot de passe. 
                Conservez-la dans un lieu sûr (gestionnaire de mots de passe, coffre-fort numérique). 
                Une fois générée, vous ne pourrez plus la consulter.
              </AlertDescription>
            </Alert>

            {keyRevealed && recoveryKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg border-2 border-primary/20">
                  <p className="text-xs text-muted-foreground mb-2">Votre clé de récupération :</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-lg font-mono font-bold text-primary break-all">
                      {recoveryKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyRecoveryKey}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cette clé ne sera plus affichée après avoir quitté cette page. Assurez-vous de l'avoir sauvegardée !
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  onClick={() => {
                    setKeyRevealed(false);
                    setRecoveryKey(null);
                  }}
                  className="w-full"
                >
                  J'ai sauvegardé ma clé
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {recoveryKey 
                    ? "Une clé de récupération existe déjà pour votre compte. Générer une nouvelle clé désactivera l'ancienne."
                    : "Vous n'avez pas encore de clé de récupération. Générez-en une pour sécuriser votre compte."
                  }
                </p>
                <Button
                  onClick={handleGenerateRecoveryKey}
                  disabled={isGeneratingKey}
                  className="w-full"
                  variant="outline"
                >
                  {isGeneratingKey ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      {recoveryKey ? "Générer une nouvelle clé" : "Générer une clé de récupération"}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BotConfig;