# Ledger — PWA Finanzas personales

PWA de finanzas personales con auth custom (usuario + PIN), Libro Diario, cuentas, transacciones e integración con iOS Shortcuts.

## Configuración

1. **Supabase**: Crear proyecto y ejecutar `supabase-setup.sql` en el SQL Editor. Para usuarios ya existentes, ejecutar también `supabase/migrations/add_api_key.sql` para agregar la columna `api_key`.

2. **Variables de entorno** (`.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PIN_HASH_SALT` (opcional)
   - `VAULT_MASTER_KEY` (default: 213356)

3. **Sonido al registrar**: Opcional. Agregar un archivo `/public/click.mp3` (sonido tipo “shutter”) para que suene al guardar un movimiento. Si no existe, no se reproduce nada.

4. **Admin**: Ir a `/vault-admin`, ingresar la clave maestra (213356) y crear usuarios (username + PIN de 6 dígitos).

5. **iOS Shortcuts**: POST a `/api/shortcuts/transaction` con `Authorization: Bearer <api_key>` y body `{ "amount": 123, "concept": "Almuerzo", "account_id": "<uuid>" }`. El `api_key` se genera al crear el usuario en vault-admin; usuarios antiguos pueden necesitar la migración `add_api_key.sql` y regenerar clave desde ajustes (próximamente).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
