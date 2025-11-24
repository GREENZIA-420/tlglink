import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Check, Send, Loader2 } from "lucide-react";
import { authStorage } from "@/lib/auth";

const BotConfig = () => {
  const [botConfig, setBotConfig] = useState<any>(null);
  const [botToken, setBotToken] = useState("");
  const [botName, setBotName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tokenChanged, setTokenChanged] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadBotConfig = async () => {
    try {
      const session = authStorage.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      const userId = session.user.id;

      const { data: config, error: configError } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('admin_id', userId)
        .maybeSingle();

      if (configError) throw configError;

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
      if (!session) return;

      const userId = session.user.id;
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      if (!supabaseSession) throw new Error('No session');

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

      const { data, error } = await supabase.functions.invoke('manage-bot-config', {
        body: payload,
        headers: {
          Authorization: `Bearer ${supabaseSession.access_token}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Update webhook URL with actual bot_id if new config
      if (!botConfig && data.data) {
        const actualWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-webhook?bot_id=${data.data.id}`;
        await supabase
          .from('bot_configs')
          .update({ webhook_url: actualWebhookUrl })
          .eq('id', data.data.id);
      }

      await loadBotConfig();

      toast({
        title: "Succès",
        description: "Configuration du bot enregistrée avec chiffrement sécurisé.",
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
    if (!tokenChanged || !botToken || !botConfig?.webhook_url) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord entrer et enregistrer un nouveau token",
        variant: "destructive",
      });
      return;
    }

    setIsSettingWebhook(true);
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: botConfig.webhook_url }),
        }
      );

      const data = await response.json();

      if (data.ok) {
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
                    {tokenChanged 
                      ? "Enregistrez d'abord le nouveau token, puis configurez le webhook Telegram"
                      : "Configurez le webhook Telegram pour activer votre bot"
                    }
                  </p>
                  <Button
                    onClick={handleSetWebhook}
                    disabled={isSettingWebhook || !tokenChanged}
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
      </div>
    </div>
  );
};

export default BotConfig;