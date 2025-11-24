import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, Clock, LogIn } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-telegram/10 mb-4">
            <Shield className="w-10 h-10 text-telegram" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            LINKY BOT CREATOR
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Création facile et gratuite de votre bot telegram pour géré vos liens et invitations
          </p>
        </div>

        {/* Admin Access */}
        <Card className="border-2 shadow-lg mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Accès Administrateur
              <Badge variant="secondary">Sécurisé</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Connectez-vous au panel d'administration pour configurer le bot et gérer les messages.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-telegram hover:bg-telegram-dark"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Accéder au Panel Admin
            </Button>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">CODES CAPTCHA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Génération automatique de codes à 6 chiffres au demarrage de votre bot. Codes valides pendant 120 secondes protection anti-robots
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">MESSAGES PERSONALISÉE</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Créer un message personnalisée apres la validation du code captcha avec du text, images et boutons
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">INVITATIONS ÉPHÈMÉRE</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Créer des boutons d&apos;invitation à rejoindre vos groupe ou canal telegram ils serront à usage unique pour une durée de 120seconde passer ce delais le liens serra désactivée
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <Card className="mt-8 bg-muted/50">
          <CardHeader>
            <CardTitle>Comment ça fonctionne?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-telegram/10 flex items-center justify-center text-telegram font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">L'utilisateur démarre le bot</h3>
                <p className="text-sm text-muted-foreground">
                  Il envoie /start et reçoit un code CAPTCHA unique
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-telegram/10 flex items-center justify-center text-telegram font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Validation du code</h3>
                <p className="text-sm text-muted-foreground">
                  L'utilisateur a 2 minutes pour entrer le code correctement
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-telegram/10 flex items-center justify-center text-telegram font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Message de bienvenue</h3>
                <p className="text-sm text-muted-foreground">
                  Si le code est correct, il reçoit un message de bienvenue
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
