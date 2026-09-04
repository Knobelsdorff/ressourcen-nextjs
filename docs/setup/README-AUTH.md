# 🔐 Supabase Authentifizierung für Ressourcen App

Diese Anleitung zeigt dir, wie du die komplette Login-Funktionalität mit Supabase einrichtest.

## 📋 Voraussetzungen

- ✅ Supabase-Projekt erstellt
- ✅ Supabase-Client installiert (`@supabase/supabase-js`)
- ✅ Umgebungsvariablen konfiguriert

## 🚀 Einrichtung

### 1. Supabase-Projekt einrichten

1. Gehe zu [supabase.com](https://supabase.com)
2. Erstelle ein neues Projekt
3. Notiere dir die **Project URL** und den **anon public key**

### 2. Datenbank-Schema einrichten

1. Öffne dein Supabase-Projekt
2. Gehe zu **SQL Editor**
3. Führe das SQL-Skript `supabase-setup.sql` aus

**Wichtig:** Das Skript erstellt:
- `profiles` Tabelle für Benutzerprofile
- `saved_stories` Tabelle für gespeicherte Geschichten
- Row Level Security (RLS) Policies
- Automatische Trigger und Funktionen

### 3. Umgebungsvariablen

Erstelle eine `.env.local` Datei im Root-Verzeichnis:

```env
NEXT_PUBLIC_SUPABASE_URL=https://deine-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
```

### 4. Supabase-Authentifizierung konfigurieren

1. Gehe zu **Authentication** → **Settings**
2. Aktiviere **Email confirmations**
3. Konfiguriere **Site URL** (z.B. `http://localhost:3000`)
4. Füge **Redirect URLs** hinzu:
   - `http://localhost:3000/dashboard`
   - `http://localhost:3000/auth/callback`

## 🎯 Features

### ✅ Vollständige Authentifizierung
- **Registrierung** mit E-Mail-Bestätigung
- **Login** mit E-Mail und Passwort
- **Passwort zurücksetzen**
- **Automatische Session-Verwaltung**
- **Sichere Abmeldung**

### ✅ Benutzerprofile
- **Profil bearbeiten** (Name, Avatar)
- **Automatische Profilerstellung** bei Registrierung
- **Profilbilder** (Avatar-Initialen)

### ✅ Geschichten-Management
- **Geschichten speichern** in der Datenbank
- **Geschichten anzeigen** im Dashboard
- **Geschichten löschen**
- **Geschichten herunterladen** als TXT-Datei
- **Audio-Integration** (falls verfügbar)

### ✅ Sicherheit
- **Row Level Security (RLS)** für alle Tabellen
- **Benutzer können nur eigene Daten sehen/bearbeiten**
- **Sichere API-Endpunkte**
- **JWT-basierte Authentifizierung**

## 🔧 Verwendung

### Login/Register
```tsx
import { useAuth } from "@/components/providers/auth-provider";

const { user, signIn, signUp, signOut } = useAuth();

// Login
await signIn(email, password);

// Registrierung
await signUp(email, password);

// Abmelden
await signOut();
```

### Geschichten speichern
```tsx
import { supabase } from "@/lib/supabase";

const { error } = await supabase
  .from('saved_stories')
  .insert({
    user_id: user.id,
    title: 'Meine Geschichte',
    content: 'Geschichteninhalt...',
    resource_figure: { name: 'Ressource', description: '...' },
    question_answers: [...]
  });
```

### Geschichten abrufen
```tsx
const { data: stories } = await supabase
  .from('saved_stories')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

## 📱 Komponenten

### Header
- **Login/Register Modal** mit Tab-Umschaltung
- **Benutzer-Info** und Dashboard-Link
- **Abmelden-Button**

### Dashboard
- **Profil-Tab**: Benutzerdaten bearbeiten
- **Geschichten-Tab**: Gespeicherte Geschichten verwalten
- **Schnellzugriff**: Neue Ressource erstellen

### UserProfile
- **Profil bearbeiten** (Name)
- **Avatar mit Initialen**
- **Mitgliedschaftsdaten**

### SavedStories
- **Geschichten anzeigen** mit Metadaten
- **Geschichten löschen**
- **Geschichten herunterladen**
- **Audio abspielen** (falls verfügbar)

## 🎨 Design

- **Konsistentes Design** mit der Haupt-App
- **Amber/Orange Farbschema**
- **Framer Motion Animationen**
- **Responsive Layout**
- **Moderne UI-Komponenten**

## 🔒 Sicherheitsfeatures

### Row Level Security (RLS)
```sql
-- Benutzer können nur eigene Profile sehen
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Benutzer können nur eigene Geschichten sehen
CREATE POLICY "Users can view their own stories" ON public.saved_stories
    FOR SELECT USING (auth.uid() = user_id);
```

### Automatische Profilerstellung
```sql
-- Trigger für neue Benutzer
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 🚨 Fehlerbehebung

### Häufige Probleme

1. **"Invalid API key"**
   - Überprüfe deine Umgebungsvariablen
   - Stelle sicher, dass der anon key korrekt ist

2. **"RLS policy violation"**
   - Führe das SQL-Setup-Skript aus
   - Überprüfe die RLS-Policies

3. **"User not authenticated"**
   - Überprüfe die Supabase-Auth-Konfiguration
   - Stelle sicher, dass Email-Bestätigung aktiviert ist

### Debugging
```tsx
// Aktiviere Debug-Logs
const { data, error } = await supabase
  .from('profiles')
  .select('*');

console.log('Data:', data);
console.log('Error:', error);
```

## 📚 Nächste Schritte

### Erweiterte Features
- [ ] **Soziale Anmeldung** (Google, Facebook)
- [ ] **Zwei-Faktor-Authentifizierung**
- [ ] **Benutzerrollen** (Admin, Premium)
- [ ] **E-Mail-Benachrichtigungen**
- [ ] **Profilbilder hochladen**

### Performance-Optimierung
- [ ] **Caching** für Benutzerprofile
- [ ] **Lazy Loading** für Geschichten
- [ ] **Pagination** für große Datenmengen
- [ ] **Offline-Support**

## 🆘 Support

Bei Problemen:
1. Überprüfe die **Supabase-Logs**
2. Teste die **API-Endpunkte** direkt
3. Überprüfe die **Browser-Konsole**
4. Stelle sicher, dass alle **Dependencies** installiert sind

---

**Viel Erfolg mit deiner neuen Login-Funktionalität! 🎉**
