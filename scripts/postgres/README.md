# PostgreSQL local — TimeFlow

## Pré-requis

- PostgreSQL installé et `psql` disponible dans le `PATH`.
- Un compte administrateur PostgreSQL, généralement `postgres`.

## Créer la base et le rôle

Depuis PowerShell à la racine du dépôt :

```powershell
psql -U postgres -d postgres `
  -v timeflow_password="ChangeMe_TimeFlow_2026!" `
  -f .\scripts\postgres\bootstrap-timeflow.sql
```

Le script est idempotent : il peut être rejoué. Il crée :

- la base `timeflow` ;
- le rôle/login `timeflow` ;
- `timeflow` comme propriétaire de la base et du schéma `public` ;
- les droits nécessaires à Flyway et à l'application ;
- aucun droit superuser, CREATEDB, CREATEROLE ou REPLICATION.

## Tester la connexion

```powershell
psql -h localhost -U timeflow -d timeflow -c "select current_user, current_database();"
```

## Variables du backend

```powershell
$env:DB_URL="jdbc:postgresql://localhost:5432/timeflow"
$env:DB_USERNAME="timeflow"
$env:DB_PASSWORD="ChangeMe_TimeFlow_2026!"
```

Puis :

```powershell
cd backend
mvn spring-boot:run
```

Flyway créera ensuite les tables via `V1__...`, `V2__...` et `V3__...`.

## Docker Compose

Le `docker-compose.yml` du projet crée déjà automatiquement la base et le rôle `timeflow` pour le développement local. N'exécute donc ce script que si tu utilises une installation PostgreSQL externe/locale.

Attention : `docker compose down -v` supprime le volume PostgreSQL et toutes les données locales.
