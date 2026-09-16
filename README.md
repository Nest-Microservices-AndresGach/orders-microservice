# Orders Microservice

Microservicio de órdenes de la [tienda de microservicios](https://github.com/Nest-Microservices-AndresGach/products-launcher).
Crea y consulta órdenes, valida los productos contra `products-ms` y coordina el cobro
con `payments-ms`. No expone puerto HTTP: se comunica por NATS.

> **Desarrollado entre agosto y septiembre de 2025.** Los commits de 2026 son
> mantenimiento (actualización de dependencias por vulnerabilidades).

## Responsabilidades

- **Creación de órdenes**, validando previamente contra `products-ms` que los
  productos existan y tomando sus precios reales
- **Consulta** de órdenes con paginación y filtrado por estado
- **Ciclo de pago**: solicita la sesión a `payments-ms` y marca la orden como pagada
  cuando llega la confirmación del webhook de Stripe

Es el servicio donde se ve el problema central de una arquitectura distribuida: la
orden y el producto viven en bases de datos distintas, así que la consistencia se
resuelve con mensajes, no con joins.

**Stack:** NestJS · TypeScript · NATS · Prisma · PostgreSQL

## Desarrollo

1. Clonar el repositorio e instalar dependencias:

```bash
npm install
```

2. Crear un `.env` basado en `.env.template`.

3. Levantar la base de datos:

```bash
docker compose up -d
```

4. Ejecutar las migraciones:

```bash
npx prisma migrate dev
```

5. Levantar NATS y arrancar el servicio:

```bash
npm run start:dev
```

## Producción

```bash
docker build -f dockerfile.prod -t orders-ms .
```

---

Forma parte del proyecto [products-launcher](https://github.com/Nest-Microservices-AndresGach/products-launcher),
donde está la arquitectura completa y el despliegue con Docker Compose y Kubernetes.
