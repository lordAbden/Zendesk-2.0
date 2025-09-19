# Guide de Configuration Email

## Configuration Email Rapide

### Option 1 : Utiliser Gmail (Recommandé pour les débutants)

1. **Créez un compte Gmail** ou utilisez un compte existant
2. **Activez l'Authentification à 2 Facteurs** :
   - Allez sur [myaccount.google.com](https://myaccount.google.com)
   - Cliquez sur "Sécurité" → "Validation en 2 étapes" → Activer
3. **Générer un Mot de Passe d'Application** :
   - Allez sur [myaccount.google.com](https://myaccount.google.com)
   - Cliquez sur "Sécurité" → "Mots de passe des applications"
   - Sélectionnez "Mail" et "Autre (nom personnalisé)"
   - Entrez "Système Zendesk" comme nom
   - **Copiez le mot de passe de 16 caractères**

4. **Mettre à jour le fichier de paramètres** :
   - Ouvrez `backend\ticketing_system\settings.py`
   - Trouvez les lignes 196-199 et remplacez par vos informations :

```python
EMAIL_HOST_USER = 'votre-email@gmail.com'
EMAIL_HOST_PASSWORD = 'votre-mot-de-passe-app-16-caracteres'
DEFAULT_FROM_EMAIL = 'Support Ticket DGM <votre-email@gmail.com>'
SERVER_EMAIL = 'votre-email@gmail.com'
```

### Option 2 : Utiliser Outlook/Hotmail

Remplacez les paramètres email dans `backend\ticketing_system\settings.py` :

```python
EMAIL_HOST = 'smtp-mail.outlook.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'votre-email@outlook.com'
EMAIL_HOST_PASSWORD = 'votre-mot-de-passe'
DEFAULT_FROM_EMAIL = 'Support Ticket DGM <votre-email@outlook.com>'
SERVER_EMAIL = 'votre-email@outlook.com'
```

### Option 3 : Utiliser Yahoo

Remplacez les paramètres email dans `backend\ticketing_system\settings.py` :

```python
EMAIL_HOST = 'smtp.mail.yahoo.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'votre-email@yahoo.com'
EMAIL_HOST_PASSWORD = 'votre-mot-de-passe-app'
DEFAULT_FROM_EMAIL = 'Support Ticket DGM <votre-email@yahoo.com>'
SERVER_EMAIL = 'votre-email@yahoo.com'
```

### Option 4 : Désactiver les Notifications Email

Si vous n'avez pas besoin des notifications email, ajoutez ces lignes à `backend\ticketing_system\settings.py` :

```python
EMAIL_NOTIFICATIONS_ENABLED = False
ADMIN_EMAIL_NOTIFICATIONS_ENABLED = False
```

## Tester Votre Configuration Email

Après avoir modifié les paramètres email :

1. **Redémarrez le serveur backend** :
   ```cmd
   # Arrêtez le serveur (Ctrl+C)
   # Puis redémarrez-le
   python manage.py runserver
   ```

2. **Testez le système email** :
   ```cmd
   cd backend
   python test_email_system.py
   ```

3. **Créez un ticket de test** dans l'interface web pour voir si les emails sont envoyés

## Notes Importantes

- **Gmail nécessite des Mots de Passe d'Application** (pas votre mot de passe normal)
- **Redémarrez toujours le serveur backend** après avoir modifié les paramètres email
- **Vérifiez votre dossier spam** si les emails ne sont pas reçus
- **Certains fournisseurs email bloquent les emails automatisés** - Gmail est le plus fiable

## Dépannage des Problèmes Email

### Erreur "Authentication failed"
- Vérifiez si vous utilisez le Mot de Passe d'Application (pas le mot de passe normal)
- Vérifiez que l'Authentification à 2 Facteurs est activée
- Assurez-vous que l'adresse email est correcte

### Erreur "Connection refused"
- Vérifiez votre connexion internet
- Vérifiez que le serveur SMTP et le port sont corrects
- Certains réseaux bloquent les ports SMTP

### Emails non envoyés
- Vérifiez si `EMAIL_NOTIFICATIONS_ENABLED = True`
- Cherchez les messages d'erreur dans l'Invite de commandes
- Essayez le script de test : `python test_email_system.py`

### Emails allant dans le spam
- C'est normal pour les emails automatisés
- Vérifiez votre dossier spam/courrier indésirable
- Ajoutez l'email de l'expéditeur à vos contacts
