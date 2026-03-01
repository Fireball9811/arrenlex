---
marp: true
theme: default
paginate: true
style: |
  section {
    background-color: #0f172a;
    color: white;
  }
  h1, h2 { color: #06b6d4; }
  strong { color: #06b6d4; }
---
<!-- _class: lead -->
# ARRENLEX
## Plataforma de Gestión Inmobiliaria
*Next.js 16 • React 19 • TypeScript • Supabase*

---
## El problema
- Gestión manual de propiedades, contratos y arrendatarios
- Documentos en papel, búsquedas complejas
- Comunicación dispersa entre propietarios e inquilinos

---
## La solución: Arrenlex
Sistema web que centraliza:
- Propiedades y catálogo público
- Contratos digitales con PDF
- Mantenimiento y solicitudes de visita
- Reportes y métricas en tiempo real

---
## Roles del sistema
| Rol | Permisos |
|-----|----------|
| **Admin** | Métricas, usuarios, reportes, asignaciones |
| **Propietario** | Propiedades, contratos, invitaciones, mantenimiento |
| **Inquilino** | Mis contratos, catálogo, solicitudes, mis datos |

---
## Gestión de Propiedades
- Catálogo público con fotos por categoría
- Estados: disponible / arrendado / mantenimiento
- Datos: dirección, habitaciones, baños, área, valor
- Información bancaria para arriendo

---
## Contratos Digitales
- Creación y edición de contratos
- **PDF automático** con datos completos
- Arrendatario, deudor solidario, coarrendatario
- Estados: borrador → activo → terminado

---
## Mantenimiento y Mensajes
- Solicitudes de mantenimiento con flujo de estados
- Notificaciones por email (Resend)
- Solicitudes de visita de interesados
- Seguimiento integrado

---
## Reportes y Análisis
- Reportes financieros
- Gestión de pagos
- Reportes de propiedades y personas
- Documentos y métricas por rol

---
## Stack Tecnológico
| Categoría | Tecnología |
|-----------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Base de datos | Supabase (PostgreSQL) |
| Estilos | Tailwind CSS 4 |
| UI | Radix UI, shadcn/ui |
| PDF | jsPDF |
| Gráficos | Recharts |

---
## Seguridad e Infraestructura
- **Supabase Auth** (magic links, sesiones)
- **Row Level Security** (RLS) en PostgreSQL
- Almacenamiento en la nube (imágenes, documentos)
- Variables de entorno para credenciales

---
<!-- _class: lead -->
## Gracias
### Arrenlex – Gestión inmobiliaria moderna
*¿Preguntas?*
