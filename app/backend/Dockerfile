# Utiliser une image Node.js légère (version 20 comme dans vos tests)
FROM node:20-alpine

# Définir le dossier de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (uniquement celles de production)
RUN npm ci --only=production

# Copier le reste du code source
COPY . .

# Exposer le port sur lequel l'app tourne
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]