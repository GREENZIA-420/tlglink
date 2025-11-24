import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, LogOut, Save, Upload, X, Send, Clock, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { authStorage, logout } from "@/lib/auth";

const Admin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [botId, setBotId] = useState<string | null>(null);
  const [botConfig, setBotConfig] = useState<any>(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [captchaMessage, setCaptchaMessage] = useState("");
  const [welcomeImageUrl, setWelcomeImageUrl] = useState("");
  const [welcomeImageFile, setWelcomeImageFile] = useState<File | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastMediaFiles, setBroadcastMediaFiles] = useState<File[]>([]);
  const [selectedBroadcastButtons, setSelectedBroadcastButtons] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("12:00");
  const [drafts, setDrafts] = useState<any[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState(false);
  const [buttons, setButtons] = useState<any[]>([]);
  const [isAddingButton, setIsAddingButton] = useState(false);
  const [editingButton, setEditingButton] = useState<any>(null);
  const [newButton, setNewButton] = useState({
    label: "",
    type: "external_link" as "telegram_invite" | "external_link" | "miniapp",
    telegram_chat_id: "",
    external_url: "",
    web_app_url: "",
    position: 0,
  });
  const [editForm, setEditForm] = useState({
    label: "",
    type: "external_link" as "telegram_invite" | "external_link" | "miniapp",
    telegram_chat_id: "",
    external_url: "",
    web_app_url: "",
    position: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadSettings();
  }, []);

  const checkAuthAndLoadSettings = async () => {
    setIsLoading(true);
    try {
      const session = authStorage.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      const userId = session.user.id;

      // Check if user is admin or super_admin
      // Utiliser directement le rôle stocké dans la session locale
      // (le vrai contrôle d'accès est refait côté serveur dans les Edge Functions)
      if (session.user.role === 'admin' || session.user.role === 'super_admin') {
        setIsAdmin(true);
      }

      // Load bot config first
      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-bot-config`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('Error loading bot config:', await response.text());
        toast({
          title: 'Erreur',
          description: 'Impossible de charger la configuration du bot.',
          variant: 'destructive',
        });
        navigate('/admin/bot-config');
        return;
      }

      const { config } = await response.json();

      if (!config) {
        // No bot config yet, redirect to bot config page
        toast({
          title: "Configuration requise",
          description: "Veuillez d'abord configurer votre bot.",
        });
        navigate("/admin/bot-config");
        return;
      }

      setBotConfig(config);
      setBotId(config.id);

      // Load settings for this bot
      const settingsResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-bot-settings`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!settingsResponse.ok) {
        console.error('Error loading settings:', await settingsResponse.text());
        toast({
          title: "Erreur",
          description: "Impossible de charger les paramètres",
          variant: "destructive",
        });
        return;
      }

      const { settings } = await settingsResponse.json();

      settings?.forEach((setting: any) => {
        if (setting.key === 'welcome_message') setWelcomeMessage(setting.value);
        if (setting.key === 'captcha_message') setCaptchaMessage(setting.value);
        if (setting.key === 'welcome_image_url') setWelcomeImageUrl(setting.value);
      });

      // Load buttons for this bot
      const buttonsResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-bot-buttons`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!buttonsResponse.ok) {
        console.error('Error loading buttons:', await buttonsResponse.text());
      } else {
        const { buttons: buttonsData } = await buttonsResponse.json();
        setButtons(buttonsData || []);
      }

      // Load drafts
      await loadDrafts();
    } catch (error) {
      console.error('Auth check error:', error);
      navigate("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDrafts = async () => {
    try {
      const session = authStorage.getSession();
      if (!session) return;

      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-broadcast-drafts`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const { drafts } = await response.json();
        setDrafts(drafts || []);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftTitle.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un titre pour le brouillon",
        variant: "destructive",
      });
      return;
    }

    if (!broadcastMessage.trim()) {
      toast({
        title: "Erreur",
        description: "Le message ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }

    if (!botConfig) return;

    try {
      const session = authStorage.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const token = btoa(JSON.stringify(session));

      const draftData = {
        bot_id: botConfig.id,
        title: draftTitle,
        message: broadcastMessage,
        media_urls: [], // Media URLs are not saved in drafts for now
        button_ids: selectedBroadcastButtons,
        is_scheduled: isScheduled,
        scheduled_date: scheduledDate?.toISOString(),
        scheduled_time: scheduledTime,
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-broadcast-draft`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            draft: draftData,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde du brouillon');
      }

      toast({
        title: "Brouillon sauvegardé",
        description: "Votre brouillon a été enregistré avec succès",
      });

      setShowSaveDraftDialog(false);
      setDraftTitle("");
      await loadDrafts();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le brouillon",
        variant: "destructive",
      });
    }
  };

  const loadDraft = (draft: any) => {
    setBroadcastMessage(draft.message);
    setSelectedBroadcastButtons(draft.button_ids || []);
    setIsScheduled(draft.is_scheduled || false);
    if (draft.scheduled_date) {
      setScheduledDate(new Date(draft.scheduled_date));
    }
    if (draft.scheduled_time) {
      setScheduledTime(draft.scheduled_time);
    }
    setShowDrafts(false);
    toast({
      title: "Brouillon chargé",
      description: `"${draft.title}" a été chargé dans le formulaire`,
    });
  };

  const deleteDraft = async (draftId: string) => {
    try {
      const session = authStorage.getSession();
      if (!session) return;

      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-broadcast-draft`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            draft: { id: draftId },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du brouillon');
      }

      toast({
        title: "Brouillon supprimé",
        description: "Le brouillon a été supprimé avec succès",
      });

      await loadDrafts();
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le brouillon",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      // Clear saved credentials
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
      
      // Logout
      logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear local data and redirect
      localStorage.clear();
      navigate("/login");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWelcomeImageFile(file);
  };

  const removeImage = () => {
    setWelcomeImageFile(null);
    setWelcomeImageUrl("");
  };

  const handleSaveSettings = async () => {
    if (!botId) {
      toast({
        title: "Erreur",
        description: "Configuration du bot non trouvée",
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

      let imageUrl = welcomeImageUrl;

      // Upload new image if selected
      if (welcomeImageFile) {
        const token = btoa(JSON.stringify(session));
        const formData = new FormData();
        formData.append('file', welcomeImageFile);
        formData.append('botId', botId);

        const uploadResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-welcome-image`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || 'Erreur lors de l\'upload de l\'image');
        }

        const { url } = await uploadResponse.json();
        imageUrl = url;
      }

      const settingsToUpdate = [
        { key: 'welcome_message', value: welcomeMessage },
        { key: 'captcha_message', value: captchaMessage },
        { key: 'welcome_image_url', value: imageUrl },
      ];

      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-bot-settings`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            botId: botId,
            settings: settingsToUpdate,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setWelcomeImageUrl(imageUrl);
      setWelcomeImageFile(null);

      toast({
        title: "Paramètres sauvegardés",
        description: "Les modifications ont été enregistrées",
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast({
        title: "Erreur",
        description: "Le message ne peut pas être vide",
        variant: "destructive",
      });
      return;
    }

    if (!botConfig) {
      toast({
        title: "Erreur",
        description: "Configuration du bot non trouvée",
        variant: "destructive",
      });
      return;
    }

    // Validate scheduled date if scheduled
    if (isScheduled) {
      if (!scheduledDate) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner une date",
          variant: "destructive",
        });
        return;
      }

      // Combine date and time
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      // Check if date is in the past
      if (scheduledDateTime <= new Date()) {
        toast({
          title: "Erreur",
          description: "La date et l'heure doivent être dans le futur",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSendingBroadcast(true);
    try {
      const session = authStorage.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Upload media files if any
      const mediaUrls: string[] = [];
      
      if (broadcastMediaFiles.length > 0) {
        for (const file of broadcastMediaFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `broadcast-${botConfig.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('welcome-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('welcome-images')
            .getPublicUrl(fileName);

          mediaUrls.push(publicUrl);
        }
      }

      // Prepare scheduled_for if needed
      let scheduledFor: string | undefined;
      if (isScheduled && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const scheduledDateTime = new Date(scheduledDate);
        scheduledDateTime.setHours(hours, minutes, 0, 0);
        scheduledFor = scheduledDateTime.toISOString();
      }

      const { data, error } = await supabase.functions.invoke('broadcast-message', {
        body: {
          bot_id: botConfig.id,
          admin_id: session.user.id,
          message: broadcastMessage,
          media_urls: mediaUrls,
          button_ids: selectedBroadcastButtons,
          scheduled_for: scheduledFor,
        },
      });

      if (error) throw error;

      if (data.scheduled) {
        toast({
          title: "Message planifié",
          description: `Le message sera envoyé le ${format(new Date(data.scheduled_for), "PPP 'à' HH:mm", { locale: fr })}`,
        });
      } else {
        toast({
          title: "Message envoyé",
          description: `Message diffusé à ${data.sent_count} utilisateur(s)`,
        });
      }

      // Auto-save as draft after sending
      if (broadcastMessage.trim()) {
        const draftTitle = `Envoyé le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`;
        
        try {
          const token = btoa(JSON.stringify(session));
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-broadcast-draft`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'create',
                draft: {
                  bot_id: botConfig.id,
                  title: draftTitle,
                  message: broadcastMessage,
                  media_urls: mediaUrls,
                  button_ids: selectedBroadcastButtons,
                  is_scheduled: isScheduled,
                  scheduled_date: scheduledDate?.toISOString(),
                  scheduled_time: scheduledTime,
                },
              }),
            }
          );
          await loadDrafts();
        } catch (error) {
          console.error('Error auto-saving draft:', error);
        }
      }

      setBroadcastMessage("");
      setBroadcastMediaFiles([]);
      setSelectedBroadcastButtons([]);
      setIsScheduled(false);
      setScheduledDate(undefined);
      setScheduledTime("12:00");
    } catch (error) {
      console.error('Broadcast error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleBroadcastMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (isImage || isVideo) {
        validFiles.push(file);
      }
    }
    
    if (validFiles.length > 10) {
      toast({
        title: "Limite dépassée",
        description: "Maximum 10 fichiers autorisés",
        variant: "destructive",
      });
      return;
    }
    
    setBroadcastMediaFiles(validFiles);
  };

  const removeBroadcastMedia = (index: number) => {
    setBroadcastMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleBroadcastButton = (buttonId: string) => {
    setSelectedBroadcastButtons(prev => {
      if (prev.includes(buttonId)) {
        return prev.filter(id => id !== buttonId);
      } else {
        return [...prev, buttonId];
      }
    });
  };

  const handleAddButton = async () => {
    if (!botId) {
      toast({
        title: "Erreur",
        description: "Configuration du bot non trouvée",
        variant: "destructive",
      });
      return;
    }

    if (!newButton.label) {
      toast({
        title: "Erreur",
        description: "Le nom du bouton est requis",
        variant: "destructive",
      });
      return;
    }

    if (newButton.type === "miniapp" && !newButton.web_app_url) {
      toast({
        title: "Erreur",
        description: "L'URL de la Mini App est requise",
        variant: "destructive",
      });
      return;
    }

    if (newButton.type === "telegram_invite" && !newButton.telegram_chat_id) {
      toast({
        title: "Erreur",
        description: "L'ID du chat Telegram est requis",
        variant: "destructive",
      });
      return;
    }

    if (newButton.type === "external_link" && !newButton.external_url) {
      toast({
        title: "Erreur",
        description: "L'URL est requise",
        variant: "destructive",
      });
      return;
    }

    try {
      const session = authStorage.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-bot-buttons`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            botId: botId,
            button: {
              label: newButton.label,
              type: newButton.type,
              telegram_chat_id: newButton.type === "telegram_invite" ? newButton.telegram_chat_id : null,
              external_url: newButton.type === "external_link" ? newButton.external_url : null,
              web_app_url: newButton.type === "miniapp" ? newButton.web_app_url : null,
              position: buttons.length,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout du bouton');
      }

      const { button: data } = await response.json();
      setButtons([...buttons, data]);
      setNewButton({
        label: "",
        type: "external_link",
        telegram_chat_id: "",
        external_url: "",
        web_app_url: "",
        position: 0,
      });
      setIsAddingButton(false);

      toast({
        title: "Bouton ajouté",
        description: "Le bouton a été créé avec succès",
      });
    } catch (error) {
      console.error('Error adding button:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le bouton",
        variant: "destructive",
      });
    }
  };

  const handleDeleteButton = async (id: string) => {
    try {
      const session = authStorage.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-bot-buttons`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            botId: botId,
            buttonId: id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du bouton');
      }

      setButtons(buttons.filter(b => b.id !== id));

      toast({
        title: "Bouton supprimé",
        description: "Le bouton a été supprimé avec succès",
      });
    } catch (error) {
      console.error('Error deleting button:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le bouton",
        variant: "destructive",
      });
    }
  };

  const handleToggleButton = async (id: string, isActive: boolean) => {
    try {
      const session = authStorage.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-bot-buttons`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'toggle',
            botId: botId,
            buttonId: id,
            button: {
              is_active: !isActive,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la modification du bouton');
      }

      setButtons(buttons.map(b => b.id === id ? { ...b, is_active: !isActive } : b));

      toast({
        title: isActive ? "Bouton désactivé" : "Bouton activé",
        description: "Le statut du bouton a été mis à jour",
      });
    } catch (error) {
      console.error('Error toggling button:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le bouton",
        variant: "destructive",
      });
    }
  };

  const handleEditButton = (button: any) => {
    setEditingButton(button);
    setEditForm({
      label: button.label,
      type: button.type,
      telegram_chat_id: button.telegram_chat_id || "",
      external_url: button.external_url || "",
      web_app_url: button.web_app_url || "",
      position: button.position,
    });
  };

  const handleUpdateButton = async () => {
    if (!editForm.label) {
      toast({
        title: "Erreur",
        description: "Le nom du bouton est requis",
        variant: "destructive",
      });
      return;
    }

    if (editForm.type === "miniapp" && !editForm.web_app_url) {
      toast({
        title: "Erreur",
        description: "L'URL de la Mini App est requise",
        variant: "destructive",
      });
      return;
    }

    if (editForm.type === "telegram_invite" && !editForm.telegram_chat_id) {
      toast({
        title: "Erreur",
        description: "L'ID du chat Telegram est requis",
        variant: "destructive",
      });
      return;
    }

    if (editForm.type === "external_link" && !editForm.external_url) {
      toast({
        title: "Erreur",
        description: "L'URL est requise",
        variant: "destructive",
      });
      return;
    }

    try {
      const session = authStorage.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const token = btoa(JSON.stringify(session));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-bot-buttons`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update',
            botId: botId,
            buttonId: editingButton.id,
            button: {
              label: editForm.label,
              type: editForm.type,
              telegram_chat_id: editForm.type === "telegram_invite" ? editForm.telegram_chat_id : null,
              external_url: editForm.type === "external_link" ? editForm.external_url : null,
              web_app_url: editForm.type === "miniapp" ? editForm.web_app_url : null,
              position: editForm.position,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la modification du bouton');
      }

      // Reload buttons
      const buttonsResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-bot-buttons`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (buttonsResponse.ok) {
        const { buttons: updatedButtons } = await buttonsResponse.json();
        setButtons(updatedButtons || []);
      }
      
      setEditingButton(null);

      toast({
        title: "Bouton modifié",
        description: "Le bouton a été mis à jour avec succès",
      });
    } catch (error) {
      console.error('Error updating button:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le bouton",
        variant: "destructive",
      });
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
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-telegram/10 flex items-center justify-center">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-telegram" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Panel Administrateur</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Gestion du bot Telegram CAPTCHA</p>
              {botConfig?.bot_name && (
                <p className="text-xs text-primary font-medium">Bot: {botConfig.bot_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/bot-config')} size="sm">
              <span className="hidden sm:inline">Config Bot</span>
              <span className="sm:hidden">Bot</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/users')} size="sm">
              <span className="hidden sm:inline">Utilisateurs</span>
              <span className="sm:hidden">Users</span>
            </Button>
            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin/super-admin')} 
                size="sm"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <Shield className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Admin</span>
                <span className="sm:hidden">Admin</span>
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout} size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Déconnexion</span>
              <span className="sm:hidden">Sortir</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <Tabs defaultValue="messages" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="messages" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Messages</span>
              <span className="sm:hidden">Msg</span>
            </TabsTrigger>
            <TabsTrigger value="buttons" className="text-xs sm:text-sm px-2 py-2">
              Boutons
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="text-xs sm:text-sm px-2 py-2">
              Pub
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Message CAPTCHA</CardTitle>
                <CardDescription>
                  Message envoyé avec le code de vérification. Variables: {"{name}"}, {"{code}"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={captchaMessage}
                  onChange={(e) => setCaptchaMessage(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder="Exemple:&#10;👋 Bonjour &lt;b&gt;{name}&lt;/b&gt;!&#10;&#10;🔐 Code: &lt;code&gt;{code}&lt;/code&gt;"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Message de Bienvenue</CardTitle>
                <CardDescription>
                  Message envoyé après validation réussie. Variable: {"{name}"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Image de bienvenue</Label>
                  <div className="mt-2 space-y-2">
                    {(welcomeImageUrl || welcomeImageFile) && (
                      <div className="relative inline-block">
                        <img 
                          src={welcomeImageFile ? URL.createObjectURL(welcomeImageFile) : welcomeImageUrl} 
                          alt="Welcome" 
                          className="max-w-xs rounded-lg border"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="max-w-xs"
                        id="welcome-image"
                      />
                      <Label htmlFor="welcome-image" className="cursor-pointer">
                        <Button variant="outline" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Choisir une image
                          </span>
                        </Button>
                      </Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Texte du message</Label>
                  <Textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    rows={8}
                    className="font-mono text-sm mt-2"
                    placeholder="Exemple:&#10;✅ &lt;b&gt;Bienvenue {name}!&lt;/b&gt;&#10;&#10;Vous êtes maintenant vérifié."
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full bg-telegram hover:bg-telegram-dark"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder les modifications
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="buttons" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Gestion des Boutons</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Ajoutez des boutons qui seront affichés après la validation du CAPTCHA
                    </CardDescription>
                  </div>
                  <Dialog open={isAddingButton} onOpenChange={setIsAddingButton}>
                    <DialogTrigger asChild>
                      <Button className="bg-telegram hover:bg-telegram-dark w-full sm:w-auto" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Ajouter un bouton</span>
                        <span className="sm:hidden">Ajouter</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nouveau Bouton</DialogTitle>
                        <DialogDescription>
                          Créez un bouton personnalisé pour vos utilisateurs
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Type de bouton</Label>
                          <Select
                            value={newButton.type}
                            onValueChange={(value: "telegram_invite" | "external_link" | "miniapp") =>
                              setNewButton({ ...newButton, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="telegram_invite">
                                Invitation Telegram (éphémère)
                              </SelectItem>
                              <SelectItem value="external_link">
                                Lien externe
                              </SelectItem>
                              <SelectItem value="miniapp">
                                Mini App Telegram
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Nom du bouton</Label>
                          <Input
                            placeholder="Ex: Rejoindre le groupe"
                            value={newButton.label}
                            onChange={(e) =>
                              setNewButton({ ...newButton, label: e.target.value })
                            }
                          />
                        </div>

                        {newButton.type === "telegram_invite" && (
                          <div className="space-y-2">
                            <Label>ID du Chat/Groupe Telegram</Label>
                            <Input
                              placeholder="Ex: -1001234567890"
                              value={newButton.telegram_chat_id}
                              onChange={(e) =>
                                setNewButton({ ...newButton, telegram_chat_id: e.target.value })
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              Le bot doit être administrateur du groupe. Lien valide 2 min, usage unique.
                            </p>
                          </div>
                        )}

                        {newButton.type === "external_link" && (
                          <div className="space-y-2">
                            <Label>URL</Label>
                            <Input
                              placeholder="https://example.com"
                              value={newButton.external_url}
                              onChange={(e) =>
                                setNewButton({ ...newButton, external_url: e.target.value })
                              }
                            />
                          </div>
                        )}

                        {newButton.type === "miniapp" && (
                          <div className="space-y-2">
                            <Label>URL de la Mini App</Label>
                            <Input
                              placeholder="https://app.example.com"
                              value={newButton.web_app_url}
                              onChange={(e) =>
                                setNewButton({ ...newButton, web_app_url: e.target.value })
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              L'URL sera ouverte dans une Mini App Telegram intégrée
                            </p>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddingButton(false)}>
                          Annuler
                        </Button>
                        <Button onClick={handleAddButton} className="bg-telegram hover:bg-telegram-dark">
                          Créer
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {buttons.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Aucun bouton configuré. Ajoutez votre premier bouton!
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Nom</TableHead>
                          <TableHead className="hidden md:table-cell text-xs sm:text-sm">Type</TableHead>
                          <TableHead className="hidden lg:table-cell text-xs sm:text-sm">Détails</TableHead>
                          <TableHead className="text-xs sm:text-sm">Statut</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buttons.map((button) => (
                          <TableRow key={button.id}>
                            <TableCell className="font-medium text-xs sm:text-sm">{button.label}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {button.type === "telegram_invite" ? (
                                <span className="text-[10px] sm:text-xs px-2 py-1 rounded bg-telegram/10 text-telegram whitespace-nowrap">
                                  Invitation
                                </span>
                              ) : button.type === "miniapp" ? (
                                <span className="text-[10px] sm:text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-500 whitespace-nowrap">
                                  Mini App
                                </span>
                              ) : (
                                <span className="text-[10px] sm:text-xs px-2 py-1 rounded bg-primary/10 text-primary whitespace-nowrap">
                                  Lien
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                              {button.type === "telegram_invite"
                                ? `${button.telegram_chat_id}`
                                : button.type === "miniapp"
                                ? button.web_app_url
                                : button.external_url}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleButton(button.id, button.is_active)}
                                className="px-2"
                              >
                                {button.is_active ? (
                                  <span className="text-[10px] sm:text-xs text-green-600">● Actif</span>
                                ) : (
                                  <span className="text-[10px] sm:text-xs text-muted-foreground">○ Inactif</span>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditButton(button)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteButton(button.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Button Dialog */}
            <Dialog open={!!editingButton} onOpenChange={(open) => !open && setEditingButton(null)}>
              <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Modifier le Bouton</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Modifiez les paramètres de votre bouton
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Type de bouton</Label>
                    <Select
                      value={editForm.type}
                      onValueChange={(value: "telegram_invite" | "external_link" | "miniapp") =>
                        setEditForm({ ...editForm, type: value })
                      }
                    >
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="telegram_invite" className="text-xs sm:text-sm">
                          Invitation Telegram (éphémère)
                        </SelectItem>
                        <SelectItem value="external_link" className="text-xs sm:text-sm">
                          Lien externe
                        </SelectItem>
                        <SelectItem value="miniapp" className="text-xs sm:text-sm">
                          Mini App Telegram
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Nom du bouton</Label>
                    <Input
                      placeholder="Ex: Rejoindre le groupe"
                      value={editForm.label}
                      onChange={(e) =>
                        setEditForm({ ...editForm, label: e.target.value })
                      }
                      className="text-xs sm:text-sm"
                    />
                  </div>

                  {editForm.type === "telegram_invite" && (
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">ID du Chat/Groupe Telegram</Label>
                      <Input
                        placeholder="Ex: -1001234567890"
                        value={editForm.telegram_chat_id}
                        onChange={(e) =>
                          setEditForm({ ...editForm, telegram_chat_id: e.target.value })
                        }
                        className="text-xs sm:text-sm"
                      />
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Le bot doit être administrateur du groupe. Lien valide 2 min, usage unique.
                      </p>
                    </div>
                  )}

                  {editForm.type === "external_link" && (
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">URL</Label>
                      <Input
                        placeholder="https://example.com"
                        value={editForm.external_url}
                        onChange={(e) =>
                          setEditForm({ ...editForm, external_url: e.target.value })
                        }
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  )}

                  {editForm.type === "miniapp" && (
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">URL de la Mini App</Label>
                      <Input
                        placeholder="https://app.example.com"
                        value={editForm.web_app_url}
                        onChange={(e) =>
                          setEditForm({ ...editForm, web_app_url: e.target.value })
                        }
                        className="text-xs sm:text-sm"
                      />
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        L'URL sera ouverte dans une Mini App Telegram intégrée
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Position (ordre d'affichage)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={editForm.position}
                      onChange={(e) =>
                        setEditForm({ ...editForm, position: parseInt(e.target.value) || 0 })
                      }
                      className="text-xs sm:text-sm"
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Plus le nombre est petit, plus le bouton apparaît en haut
                    </p>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setEditingButton(null)} className="w-full sm:w-auto text-xs sm:text-sm">
                    Annuler
                  </Button>
                  <Button onClick={handleUpdateButton} className="bg-telegram hover:bg-telegram-dark w-full sm:w-auto text-xs sm:text-sm">
                    Sauvegarder
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="broadcast" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Message de Publicité</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      Envoyez un message à tous les utilisateurs
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDrafts(!showDrafts)}
                      className="w-full sm:w-auto justify-start sm:justify-center"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Brouillons ({drafts.length})
                    </Button>
                    <Dialog open={showSaveDraftDialog} onOpenChange={setShowSaveDraftDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto justify-start sm:justify-center">
                          <Save className="h-4 w-4 mr-2" />
                          Sauvegarder
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Sauvegarder comme brouillon</DialogTitle>
                          <DialogDescription>
                            Donnez un titre à votre brouillon pour le retrouver facilement
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="draft-title">Titre du brouillon</Label>
                            <Input
                              id="draft-title"
                              placeholder="Ex: Promotion été 2024"
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowSaveDraftDialog(false)}>
                            Annuler
                          </Button>
                          <Button onClick={handleSaveDraft}>
                            <Save className="h-4 w-4 mr-2" />
                            Sauvegarder
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showDrafts && drafts.length > 0 && (
                  <Card className="border-primary/20 bg-muted/30">
                    <CardHeader>
                      <CardTitle className="text-sm">Mes brouillons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {drafts.map((draft) => (
                          <div
                            key={draft.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex-1 cursor-pointer" onClick={() => loadDraft(draft)}>
                              <p className="font-medium text-sm">{draft.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {draft.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(draft.updated_at), "PPP", { locale: fr })}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteDraft(draft.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {showDrafts && drafts.length === 0 && (
                  <Card className="border-muted">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun brouillon sauvegardé</p>
                      <p className="text-xs mt-2">Créez votre première publicité et sauvegardez-la comme brouillon</p>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 p-3 sm:p-4 border rounded-lg">
                    <div className="flex items-start sm:items-center gap-3">
                      <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor="schedule-mode" className="text-sm font-medium block">
                          Planifier l'envoi
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Programmer l'envoi
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="schedule-mode"
                      checked={isScheduled}
                      onCheckedChange={setIsScheduled}
                      className="self-end sm:self-auto"
                    />
                  </div>

                  {isScheduled && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !scheduledDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {scheduledDate ? (
                                  format(scheduledDate, "PPP", { locale: fr })
                                ) : (
                                  <span>Sélectionner une date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={scheduledDate}
                                onSelect={setScheduledDate}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="scheduled-time">Heure</Label>
                          <Input
                            id="scheduled-time"
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                          />
                        </div>
                      </div>

                      {scheduledDate && (
                        <div className="text-sm text-muted-foreground p-3 bg-background rounded-lg border">
                          📅 Le message sera envoyé le{" "}
                          <span className="font-medium text-foreground">
                            {format(scheduledDate, "PPP", { locale: fr })} à {scheduledTime}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Message à diffuser</Label>
                  <Textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                    placeholder="Exemple:&#10;📢 &lt;b&gt;Annonce importante!&lt;/b&gt;&#10;&#10;Nouveau contenu disponible..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Images/Vidéos (optionnel)</Label>
                  <div className="space-y-3">
                    {broadcastMediaFiles.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {broadcastMediaFiles.map((file, index) => (
                          <div key={index} className="relative group">
                            {file.type.startsWith('image/') ? (
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={`Media ${index + 1}`} 
                                className="w-full h-24 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-full h-24 bg-muted rounded border flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">Vidéo</span>
                              </div>
                            )}
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute top-1 right-1 h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                              onClick={() => removeBroadcastMedia(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleBroadcastMediaUpload}
                        className="hidden"
                        id="broadcast-media"
                      />
                      <Label htmlFor="broadcast-media" className="cursor-pointer w-full sm:w-auto">
                        <Button variant="outline" className="w-full sm:w-auto" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Ajouter des médias</span>
                            <span className="sm:hidden">Ajouter média</span>
                          </span>
                        </Button>
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Maximum 10 fichiers. Images et vidéos acceptées.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Boutons à inclure (optionnel)</Label>
                  <div className="space-y-2">
                    {buttons.filter(b => b.is_active).length === 0 ? (
                      <p className="text-xs sm:text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
                        Aucun bouton actif. Créez-en dans l'onglet "Boutons".
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {buttons.filter(b => b.is_active).map((button) => (
                          <div
                            key={button.id}
                            className="flex items-start sm:items-center gap-2 sm:gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => toggleBroadcastButton(button.id)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedBroadcastButtons.includes(button.id)}
                              onChange={() => toggleBroadcastButton(button.id)}
                              className="h-4 w-4 mt-0.5 sm:mt-0 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{button.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {button.type === "telegram_invite" ? "Invitation Telegram" :
                                 button.type === "miniapp" ? "Mini App" : "Lien externe"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Boutons affichés sous le message
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSendBroadcast}
                  disabled={isSendingBroadcast || !broadcastMessage.trim()}
                  className="w-full bg-telegram hover:bg-telegram-dark text-sm sm:text-base py-5 sm:py-6"
                >
                  {isSendingBroadcast ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Envoi en cours...</span>
                      <span className="sm:hidden">Envoi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Envoyer à tous les utilisateurs</span>
                      <span className="sm:hidden">Envoyer à tous</span>
                    </>
                  )}
                </Button>

                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-muted">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    ⚠️ Message envoyé à tous les utilisateurs ayant utilisé /start
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
