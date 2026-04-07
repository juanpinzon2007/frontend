# Google Cloud SQL

Usa dos instancias o dos bases dentro de la misma instancia PostgreSQL con IP privada.

Variables esperadas por los servicios:

- `products_db` con usuario `products_user`
- `orders_db` con usuario `orders_user`

Las plantillas de Cloud Run en `infra/gcp/cloudrun` asumen:

- Conectividad desde Cloud Run hacia Cloud SQL usando IP privada.
- Un Serverless VPC Access Connector configurado en la misma region.
- Una service account con permisos sobre Secret Manager y acceso de red segun tu proyecto.
- Passwords almacenados en Secret Manager.
- URLs publicas de Cloud Run inyectadas como variables entre servicios.

Campos que debes reemplazar antes de desplegar:

- `AUTH_DB_PRIVATE_IP`
- `PRODUCT_DB_PRIVATE_IP`
- `ORDER_DB_PRIVATE_IP`
- `CLOUDRUN_VPC_CONNECTOR`
- `CLOUD_RUN_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com`
