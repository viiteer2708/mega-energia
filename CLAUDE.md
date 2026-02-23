# CLAUDE.md — GRUPO NEW ENERGY

Plataforma comercial interna para la red de ventas de **GRUPO NEW ENERGY**.
Herramientas, materiales, tutoriales y datos de suministro en un único lugar.

---

## Stack

- **Next.js 15** (App Router + Turbopack) + **React 19** + **TypeScript 5** (strict)
- **Tailwind CSS 4** + **Shadcn/ui** (Radix UI) — dark mode por defecto, paleta turquesa
- **Three.js** + React Three Fiber (logo 3D en login)
- **Recharts 3** (gráficos dashboard)
- **Supabase** (preparado, no activo — auth actual con cookie mock)

## APIs externas

### GreeningEnergy — SIPS (consulta CUPS)
- Base: `https://api.greeningenergy.com`
- Auth: header `x-api-key`
- Endpoints usados:
  - `/api/public/sips/info?cups=` → info general (tarifa, potencias, consumo estimado)
  - `/api/public/sips/info/raw?cups=` → datos crudos (dirección, titular, distribuidora)
  - `/api/public/sips/info/consumo?cups=` → histórico consumo mensual 12 meses
- Las respuestas vienen **encriptadas AES-256-CBC** cuando incluyen header `x-iv`. Se desencriptan con PBKDF2 (salt + api key → derived key)
- Documentación OpenAPI: `C:\Users\viite\Downloads\openapi (1).json`
- Ruta interna: `/api/cups/search?cups=ES...`

**Credenciales:**
```
API_KEY:  52tQ8+VYFeJiCauYe+y/7pwwYffyd46tuqzZQXe0trmTfLBohhOJ9n/QBq79WzSFR40DcbbIoOLdTPkLOX2URw==
SALT:     q9YoK+PNbeWhxQ4t0InkUQ==
```

### Dropbox (materiales comerciales)
- OAuth2 con refresh token permanente (se renueva automáticamente cada 4h)
- Enlace carpeta compartida: `https://www.dropbox.com/scl/fo/rmx4pz7nubvqdof1mhbri/AFa5wvHv4AABAWr-NXgOjMo?rlkey=goek0ng74bdrm6dg7hsxknyw8&dl=0`
- Carpetas principales (con IDs reales):
  - `id:6sQNZb27aFAAAAAAAAACPg` → INSTRUCIONES & TUTORIALES
  - `id:6sQNZb27aFAAAAAAAAAcHg` → LUZ
  - `id:6sQNZb27aFAAAAAAAACIXg` → GAS
  - `id:6sQNZb27aFAAAAAAAABXUg` → PLATAFORMA ADMINISTRADORES DE FINCAS
- Ruta interna: `/api/dropbox-link?id=<file-id>`

**Credenciales:**
```
APP_KEY:        f1r5zuud4kh1jqf
APP_SECRET:     u4vkioot4ys7ne4
REFRESH_TOKEN:  NsLHGqqRsy0AAAAAAAAAASZ7XJSChdIMK9ZGda23EYeJMfKjg4b92vrwiKZNCyzw
```

Para obtener un nuevo refresh token si caduca:
1. Abrir: `https://www.dropbox.com/oauth2/authorize?client_id=f1r5zuud4kh1jqf&response_type=code&token_access_type=offline`
2. Autorizar y copiar el código
3. Intercambiar: `curl -X POST https://api.dropbox.com/oauth2/token -d "code=CODIGO&grant_type=authorization_code&client_id=f1r5zuud4kh1jqf&client_secret=u4vkioot4ys7ne4"`

## Variables de entorno (.env.local)

El `.env.local` **SÍ se sube al repo** (configurado en `.gitignore` con `!.env.local`).

```bash
GREENINGENERGY_API_KEY=52tQ8+VYFeJiCauYe+y/7pwwYffyd46tuqzZQXe0trmTfLBohhOJ9n/QBq79WzSFR40DcbbIoOLdTPkLOX2URw==
GREENINGENERGY_SALT_B64=q9YoK+PNbeWhxQ4t0InkUQ==
DROPBOX_REFRESH_TOKEN=NsLHGqqRsy0AAAAAAAAAASZ7XJSChdIMK9ZGda23EYeJMfKjg4b92vrwiKZNCyzw
DROPBOX_APP_KEY=f1r5zuud4kh1jqf
DROPBOX_APP_SECRET=u4vkioot4ys7ne4
```

---

## Estructura

```
app/
  (app)/              → Rutas protegidas (dashboard, cups, comparador, crm, emails, materiales, tutoriales)
  api/cups/search/    → Proxy SIPS con desencriptación
  api/dropbox-link/   → Genera enlaces temporales Dropbox
  login/              → Auth con cookie mock
components/           → Por módulo: cups/, comparador/, crm/, dashboard/, emails/, materiales/, tutoriales/, layout/, ui/
lib/
  dropbox.ts          → Integración Dropbox (refresh token + listado carpetas)
  mock-data.ts        → Datos mock para desarrollo
  types.ts            → Tipos TypeScript del dominio completo
  supabase/           → Clientes Supabase (preparados)
```

## Usuarios mock

- `carlos@gruponewenergy.es` / `gne2026` → COMERCIAL
- `admin@gruponewenergy.es` / `gne2026` → ADMIN

## Roles

| Rol | Acceso |
|-----|--------|
ADMIN |	Acceso total al sistema. Puede ver y gestionar usuarios, contratos, clientes, facturación, pagos, márgenes internos y comisiones reales de la comercializadora. Acceso completo a configuración y futuro panel de gestión.
BACKOFFICE | Gestión operativa completa: creación y edición de contratos, clientes, estados y documentación. Puede ver producción y facturación operativa, pero no puede ver márgenes ni comisiones reales de la comercializadora.
DIRECTOR | Puede ver contratos, producción y facturación de todos los KAM, canales y comerciales que dependan jerárquicamente de él. No puede ver márgenes internos ni gestionar usuarios globales.
KAM | Puede ver contratos, producción y facturación de los canales y comerciales asignados bajo su estructura directa. No puede ver márgenes internos de la comercializadora ni datos de otras ramas.
CANAL| Puede ver su producción propia y la de los comerciales que tenga asignados bajo su estructura. Acceso a la facturación generada por su red directa.
COMERCIAL | Puede ver exclusivamente su producción propia (contratos, clientes y facturación asociada). No tiene acceso a datos de otras ramas ni a márgenes internos.

---

## Reglas de trabajo

- **Idioma:** Español en UI, comentarios y commits. Código en inglés
- **Commits:** `tipo: descripción en español`. Tipos: feat, fix, refactor, docs, style
- **Git:** Push desde WSL siempre. Credential helper: Windows Git Credential Manager
- **Ruta del proyecto:** `/mnt/c/Users/viite/Documents/GitHub/mega-energia`
- **Componentes:** Usar Shadcn/ui. No instalar otras librerías de UI sin preguntar
- **TypeScript:** Strict, nunca usar `any`. Tipar todo con los tipos de `lib/types.ts`
- **Imports:** Absolutos desde `@/`
- **Nombrado:** Componentes `PascalCase`, funciones/variables `camelCase`, carpetas `kebab-case`

## Prohibiciones

- **NO** modificar precios GNE en `cups/page.tsx` ni `lib/mock-data.ts` sin confirmación — son datos comerciales reales
- **NO** exponer datos de un comercial a otro
- **NO** usar Pages Router de Next.js
- **NO** crear componentes sin revisar primero `components/`

## Permisos de ejecución

**Permitido sin preguntar:**
- Leer/escribir archivos de código
- Builds, linters, type checks
- git add, git commit
- npm install
- npm run dev

**Preguntar antes de:**
- git push
- Borrar archivos o ramas
- Cambios en datos comerciales/precios
