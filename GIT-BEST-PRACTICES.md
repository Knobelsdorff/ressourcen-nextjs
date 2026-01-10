# Git Best Practices - Wie man Datenverlust vermeidet

## Was ist passiert?

Die Landingpage-Dateien waren **unversioniert** (nicht committed) und wurden beim `git pull` überschrieben oder entfernt.

## Warum ist das passiert?

1. **Unversionierte Dateien**: Die Dateien wurden nie mit `git add` und `git commit` gespeichert
2. **Git Pull**: Ein `git pull` hat die Dateien überschrieben oder entfernt
3. **Keine Backup-Strategie**: Es gab keine Sicherung der Änderungen

## Wie verhindert man das in Zukunft?

### 1. **Regelmäßig committen** (WICHTIGSTE Regel)

```bash
# Nach jeder größeren Änderung:
git add .
git commit -m "Beschreibung der Änderung"
git push
```

**Regel**: Nie unversionierte Dateien über Nacht lassen!

### 2. **Vor git pull immer prüfen**

```bash
# 1. Prüfe, ob es unversionierte Änderungen gibt:
git status

# 2. Wenn ja, entweder:
# Option A: Committen
git add .
git commit -m "Meine Änderungen"
git pull

# Option B: Stashen (temporär speichern)
git stash
git pull
git stash pop  # Änderungen wiederherstellen
```

### 3. **Branch-Strategie verwenden**

```bash
# Für neue Features einen eigenen Branch erstellen:
git checkout -b feature/landingpage-update
# ... Änderungen machen ...
git add .
git commit -m "Landingpage aktualisiert"
git push origin feature/landingpage-update
```

### 4. **Regelmäßige Backups**

```bash
# Täglicher Commit am Ende des Tages:
git add .
git commit -m "Tagesabschluss: Landingpage Änderungen"
git push
```

### 5. **Git Stash für temporäre Änderungen**

```bash
# Wenn du etwas testen willst, aber noch nicht committen möchtest:
git stash save "Test-Änderungen"
# ... später wiederherstellen:
git stash pop
```

## Checkliste vor git pull

- [ ] `git status` ausführen
- [ ] Alle wichtigen Änderungen committen
- [ ] Oder `git stash` verwenden
- [ ] Dann erst `git pull`

## Aktuelle Situation beheben

Die Dateien sind jetzt wiederhergestellt. Um sie zu sichern:

```bash
git add src/components/landing/ src/app/landingpage/ public/images/
git commit -m "Landingpage Version von letzter Nacht wiederhergestellt"
git push
```

## Empfohlener Workflow

1. **Täglich am Ende des Tages**: Alle Änderungen committen
2. **Vor git pull**: Immer `git status` prüfen
3. **Für Features**: Eigene Branches verwenden
4. **Bei Unsicherheit**: `git stash` verwenden

