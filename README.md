# Store Platform

Aplicacion completa y sencilla con:

- Microservicios reactivos en Spring Boot WebFlux
- Maven multi-modulo
- PostgreSQL por servicio con R2DBC + Flyway
- API Gateway con Spring Cloud Gateway
- Frontend Angular
- Docker Compose para ejecucion local
- Base de despliegue para Google Cloud Run + Cloud Build

## Arquitectura

- `backend/product-service`: CRUD reactivo de productos
- `backend/order-service`: crea pedidos consultando `product-service`
- `backend/auth-service`: registro e inicio de sesion con persistencia propia
- `backend/api-gateway`: punto de entrada unico `/api/*`
- `frontend-app`: interfaz Angular consumiendo el gateway
- `backend/shared-kernel`: DTOs compartidos

## Ejecutar con Docker

```bash
docker compose up --build
```

Servicios:

- Frontend: `http://localhost:4200`
- API Gateway: `http://localhost:8080`
- Product service: `http://localhost:8081`
- Order service: `http://localhost:8082`
- Auth service: `http://localhost:8083`

## Desarrollo del frontend

```bash
cd frontend-app
npm install
npm start
```

El proxy de Angular redirige `/api` hacia `http://localhost:8080`.

## Construccion backend

Si tienes Java 17 instalado localmente:

```bash
./mvnw clean package
```

En Windows:

```powershell
.\mvnw.cmd clean package
```

## Despliegue en Google Cloud

1. Crea un Artifact Registry Docker.
2. Ejecuta `cloudbuild.yaml` para construir y publicar las imagenes.
3. Crea PostgreSQL en Cloud SQL con IP privada.
4. Crea un VPC Serverless Connector para Cloud Run.
5. Guarda los passwords de base de datos en Secret Manager.
6. Reemplaza los placeholders de `infra/gcp/cloudrun/*.yaml`:
   - `PROJECT_ID`, `REGION`, `REPOSITORY`, `TAG`
   - `CLOUDRUN_VPC_CONNECTOR`
   - `CLOUD_RUN_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com`
   - IPs privadas de las bases y URLs publicas entre servicios
7. Despliega en este orden para poder completar las URLs dependientes:
   - `product-service`
   - `auth-service`
   - `order-service`
   - `api-gateway`
   - `storefront-ui`
8. Aplica cada manifiesto con:

```bash
gcloud run services replace infra/gcp/cloudrun/product-service.yaml --region=REGION
gcloud run services replace infra/gcp/cloudrun/auth-service.yaml --region=REGION
gcloud run services replace infra/gcp/cloudrun/order-service.yaml --region=REGION
gcloud run services replace infra/gcp/cloudrun/api-gateway.yaml --region=REGION
gcloud run services replace infra/gcp/cloudrun/frontend.yaml --region=REGION
```

Detalles relevantes para este proyecto:

- Los servicios Spring Boot aceptan `PORT`, asi que funcionan en Cloud Run sin cambiar su uso local.
- El frontend genera `config.js` y `default.conf` al arrancar, por lo que puede usar el `PORT` de Cloud Run y un `API_URL` distinto por ambiente sin recompilar.
- Si mantienes Cloud SQL por IP privada, los servicios con base de datos necesitan el VPC connector configurado en sus manifiestos.

## Notas

- El entorno actual no tiene `java` disponible en PATH, por lo que la validacion Java debe hacerse con Docker o en una maquina con JDK 17.
- El frontend usa `public/config.js` y la variable `API_URL` para cambiar el endpoint sin recompilar.
