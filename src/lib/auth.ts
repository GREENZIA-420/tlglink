// Système d'authentification auto-hébergé
// Stocke les sessions dans localStorage

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export interface Session {
  user: User;
  access_token: string;
  expires_at: number;
}

const SESSION_KEY = 'auth_session';

export const authStorage = {
  getSession(): Session | null {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      
      const session: Session = JSON.parse(stored);
      
      // Vérifier si la session a expiré
      if (session.expires_at < Date.now()) {
        this.clearSession();
        return null;
      }
      
      return session;
    } catch {
      return null;
    }
  },

  setSession(session: Session): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  getUser(): User | null {
    const session = this.getSession();
    return session?.user || null;
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};

export async function login(email: string, password: string): Promise<Session> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erreur de connexion');
  }

  authStorage.setSession(data.session);
  return data.session;
}

export async function register(
  email: string,
  password: string,
  full_name?: string
): Promise<Session> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, full_name }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erreur d'inscription");
  }

  authStorage.setSession(data.session);
  return data.session;
}

export function logout(): void {
  authStorage.clearSession();
  window.location.href = '/login';
}
