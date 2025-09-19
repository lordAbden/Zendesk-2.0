# Instructions Complètes d'Installation pour le Système de Tickets Zendesk 2.0

## 📋 Table des Matières
1. [Prérequis](#prérequis)
2. [Configuration du Projet](#configuration-du-projet)
3. [Configuration Backend (Django)](#configuration-backend-django)
4. [Configuration Frontend (Next.js)](#configuration-frontend-nextjs)
5. [Lancer l'Application](#lancer-lapplication)
6. [Modifier les Paramètres Email](#modifier-les-paramètres-email)
7. [Dépannage](#dépannage)

---

## Prérequis

### Logiciels Requis
Avant de commencer, vous devez installer ces programmes sur votre ordinateur :

#### 1. **Python 3.8 ou plus récent**
- **Télécharger** : Allez sur [python.org](https://www.python.org/downloads/)
- **Installation** : Téléchargez la dernière version et exécutez l'installateur
- **Important** : ✅ Cochez "Add Python to PATH" pendant l'installation
- **Vérifier** : Ouvrez l'Invite de commandes et tapez `python --version`

#### 2. **Node.js 18 ou plus récent**
- **Télécharger** : Allez sur [nodejs.org](https://nodejs.org/)
- **Installation** : Téléchargez la version LTS et exécutez l'installateur
- **Vérifier** : Ouvrez l'Invite de commandes et tapez `node --version`

#### 3. **Git (Optionnel mais recommandé)**
- **Télécharger** : Allez sur [git-scm.com](https://git-scm.com/)
- **Installation** : Téléchargez et exécutez l'installateur avec les paramètres par défaut

---

## Configuration du Projet

### Étape 1 : Obtenir les Fichiers du Projet
1. **Copiez le dossier entier du projet** sur votre nouvel ordinateur
2. **Placez-le dans un endroit facile** comme `C:\Users\VotreNom\Desktop\Zendesk 2.0`

### Étape 2 : Ouvrir l'Invite de Commandes
1. **Appuyez sur la touche Windows + R**
2. **Tapez** : `cmd` et appuyez sur Entrée
3. **Naviguez vers le dossier du projet** :
   ```cmd
   cd "C:\Users\VotreNom\Desktop\Zendesk 2.0"
   ```

---

## Configuration Backend (Django)

### Étape 1 : Naviguer vers le Dossier Backend
```cmd
cd backend
```

### Étape 2 : Créer l'Environnement Virtuel
```cmd
python -m venv venv
```

### Étape 3 : Activer l'Environnement Virtuel
**Sur Windows :**
```cmd
venv\Scripts\activate
```

**Vous devriez voir `(venv)` au début de votre ligne d'invite de commandes**

### Étape 4 : Installer les Dépendances Python
```cmd
pip install -r requirements.txt
```

### Étape 5 : Configurer la Base de Données
```cmd
python manage.py migrate
```

### Étape 6 : Créer un Superutilisateur (Compte Admin)
```cmd
python manage.py createsuperuser
```
**Suivez les invites pour créer votre compte administrateur**

### Étape 7 : Collecter les Fichiers Statiques
```cmd
python manage.py collectstatic
```

---

## Configuration Frontend (Next.js)

### Étape 1 : Ouvrir une Nouvelle Invite de Commandes
**Gardez le backend en cours d'exécution et ouvrez une nouvelle fenêtre d'Invite de commandes**

### Étape 2 : Naviguer vers la Racine du Projet
```cmd
cd "C:\Users\VotreNom\Desktop\Zendesk 2.0"
```

### Étape 3 : Installer les Dépendances Node.js
```cmd
npm install
```

---

## Lancer l'Application

### Étape 1 : Démarrer le Serveur Backend
**Dans la première Invite de commandes (dossier backend) :**
```cmd
cd backend
venv\Scripts\activate
python manage.py runserver
```

**Vous devriez voir** : `Starting development server at http://127.0.0.1:8000/`

### Étape 2 : Démarrer le Serveur Frontend
**Dans la deuxième Invite de commandes (racine du projet) :**
```cmd
npm run dev
```

**Vous devriez voir** : `Local: http://localhost:3000`

### Étape 3 : Accéder à l'Application
1. **Ouvrez votre navigateur web**
2. **Allez à** : `http://localhost:3000`
3. **Connectez-vous avec votre compte administrateur** créé à l'Étape 6 de la Configuration Backend

---

## Modifier les Paramètres Email

### Configuration Email Actuelle
Le système utilise actuellement Gmail pour envoyer les notifications. Voici comment le modifier :

### Méthode 1 : Changer le Compte Gmail (Le Plus Facile)

#### Étape 1 : Préparer un Nouveau Compte Gmail
1. **Créez un nouveau compte Gmail** ou utilisez un compte existant
2. **Activez l'Authentification à 2 Facteurs** :
   - Allez sur [myaccount.google.com](https://myaccount.google.com)
   - Cliquez sur "Sécurité" → "Validation en 2 étapes" → Activer
3. **Générer un Mot de Passe d'Application** :
   - Allez sur [myaccount.google.com](https://myaccount.google.com)
   - Cliquez sur "Sécurité" → "Mots de passe des applications"
   - Sélectionnez "Mail" et "Autre (nom personnalisé)"
   - Entrez "Système Zendesk" comme nom
   - **Copiez le mot de passe de 16 caractères** (vous en aurez besoin)

#### Étape 2 : Mettre à Jour les Paramètres Email
1. **Ouvrez le fichier** : `backend\ticketing_system\settings.py`
2. **Trouvez ces lignes** (vers la ligne 196-199) :
   ```python
   EMAIL_HOST_USER = 'zexgrowcho@gmail.com'
   EMAIL_HOST_PASSWORD = 'qddl jlxs rwnx pzsm'
   DEFAULT_FROM_EMAIL = 'Support Ticket DGM <zexgrowcho@gmail.com>'
   SERVER_EMAIL = 'zexgrowcho@gmail.com'
   ```
3. **Remplacez par votre nouvel email** :
   ```python
   EMAIL_HOST_USER = 'votre-nouvel-email@gmail.com'
   EMAIL_HOST_PASSWORD = 'votre-mot-de-passe-app-16-caracteres'
   DEFAULT_FROM_EMAIL = 'Support Ticket DGM <votre-nouvel-email@gmail.com>'
   SERVER_EMAIL = 'votre-nouvel-email@gmail.com'
   ```
4. **Sauvegardez le fichier**

#### Étape 3 : Redémarrer le Serveur Backend
1. **Arrêtez le serveur backend** (Ctrl+C dans l'Invite de commandes backend)
2. **Redémarrez-le** :
   ```cmd
   python manage.py runserver
   ```

### Méthode 2 : Utiliser un Autre Fournisseur Email

#### Pour Outlook/Hotmail :
```python
EMAIL_HOST = 'smtp-mail.outlook.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'votre-email@outlook.com'
EMAIL_HOST_PASSWORD = 'votre-mot-de-passe'
```

#### Pour Yahoo :
```python
EMAIL_HOST = 'smtp.mail.yahoo.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'votre-email@yahoo.com'
EMAIL_HOST_PASSWORD = 'votre-mot-de-passe-app'
```

### Méthode 3 : Désactiver les Notifications Email (Si Pas Nécessaire)

1. **Ouvrez** : `backend\ticketing_system\settings.py`
2. **Trouvez ces lignes** et modifiez-les :
   ```python
   EMAIL_NOTIFICATIONS_ENABLED = False
   ADMIN_EMAIL_NOTIFICATIONS_ENABLED = False
   ```

---

## Dépannage

### Problèmes Courants et Solutions

#### 1. "Python n'est pas reconnu"
**Solution** : Python n'est pas dans votre PATH
- Réinstallez Python et cochez "Add Python to PATH"
- Ou ajoutez manuellement Python à votre PATH système

#### 2. "Node n'est pas reconnu"
**Solution** : Node.js n'est pas installé ou pas dans le PATH
- Téléchargez et installez Node.js depuis [nodejs.org](https://nodejs.org/)

#### 3. Erreurs "Module non trouvé"
**Solution** : Dépendances non installées
- Pour le backend : Assurez-vous que l'environnement virtuel est activé et exécutez `pip install -r requirements.txt`
- Pour le frontend : Exécutez `npm install`

#### 4. "Port déjà utilisé"
**Solution** : Une autre application utilise le port
- Backend (port 8000) : Changez le port avec `python manage.py runserver 8001`
- Frontend (port 3000) : Changez le port avec `npm run dev -- -p 3001`

#### 5. "Erreurs de base de données"
**Solution** : Exécutez les migrations
```cmd
cd backend
venv\Scripts\activate
python manage.py migrate
```

#### 6. "Email non envoyé"
**Solutions** :
- Vérifiez le mot de passe d'application Gmail (pas le mot de passe normal)
- Vérifiez que l'authentification à 2 facteurs est activée
- Vérifiez la connexion internet
- Essayez le script de test email :
  ```cmd
  cd backend
  python test_email_system.py
  ```

#### 7. "Le frontend ne peut pas se connecter au backend"
**Solution** : Vérifiez que les deux serveurs fonctionnent
- Le backend doit fonctionner sur `http://localhost:8000`
- Le frontend doit fonctionner sur `http://localhost:3000`
- Vérifiez le fichier `lib/api.ts` pour l'URL API correcte

### Obtenir de l'Aide

Si vous rencontrez des problèmes non listés ici :

1. **Vérifiez les messages d'erreur** dans les fenêtres d'Invite de commandes
2. **Assurez-vous que les deux serveurs fonctionnent** (backend et frontend)
3. **Vérifiez que toutes les étapes ont été complétées** correctement
4. **Essayez de redémarrer les deux serveurs** si quelque chose ne fonctionne pas

### Tester la Configuration

1. **Test Backend** : Allez à `http://localhost:8000/admin` et connectez-vous
2. **Test Frontend** : Allez à `http://localhost:3000` et connectez-vous
3. **Test Email** : Créez un ticket de test et vérifiez si les emails sont envoyés

---

## Liste de Vérification de Démarrage Rapide

- [ ] Python installé et fonctionnel
- [ ] Node.js installé et fonctionnel
- [ ] Fichiers du projet copiés sur le nouvel ordinateur
- [ ] Environnement virtuel backend créé et activé
- [ ] Dépendances Python installées
- [ ] Migrations de base de données exécutées
- [ ] Utilisateur administrateur créé
- [ ] Dépendances Node.js installées
- [ ] Serveur backend fonctionnant sur le port 8000
- [ ] Serveur frontend fonctionnant sur le port 3000
- [ ] Application accessible à `http://localhost:3000`
- [ ] Paramètres email configurés (si nécessaire)

---

## Notes Importantes

- **Gardez les deux fenêtres d'Invite de commandes ouvertes** pendant l'utilisation de l'application
- **Le backend doit fonctionner** pour que le frontend fonctionne
- **Les paramètres email n'ont besoin d'être changés qu'une seule fois** sauf si vous voulez utiliser un email différent
- **Activez toujours l'environnement virtuel** avant d'exécuter les commandes backend
- **Le fichier de base de données** (`db.sqlite3`) contient toutes vos données - gardez-le en sécurité !

---

*Pour le support technique ou les questions, reportez-vous aux messages d'erreur dans les fenêtres d'Invite de commandes ou consultez la section de dépannage ci-dessus.*
