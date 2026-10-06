# Servidor para el resumen con IA (opcional)

Navi **no incluye ninguna clave de IA**. Si quieres el botón “Resumen con IA”, necesitas un servidor tuyo que guarde la clave y hable con el proveedor. La extensión solo le envía el texto que el usuario aceptó enviar.

Se activa en **Centro Navi → Configuración → Resumen con IA**, escribiendo la dirección HTTPS del servidor.

## Contrato

**Petición** — `POST <dirección>` con `Content-Type: application/json`, sin cookies ni cabecera `Authorization`:

```json
{
  "title": "Interacción Humano-Computador",
  "sections": [
    { "title": "Actividades", "text": "Tarea 2: entregar el prototipo.\nVence el 15 de octubre" }
  ]
}
```

El texto está recortado a 6 000 caracteres y es exactamente el que el usuario vio en la vista previa.

**Respuesta** — `200` con JSON (máximo 20 000 caracteres). Solo se aceptan estos campos; cualquier otro se ignora:

```json
{
  "summary": "Texto del resumen (máx. 1 200 caracteres).",
  "keyPoints": ["Hasta 8 puntos de máx. 240 caracteres."],
  "dates": ["Hasta 10 fechas"],
  "suggestedActions": ["Hasta 6 sugerencias, solo informativas"]
}
```

`summary` y `keyPoints` son obligatorios. Las sugerencias se muestran como texto: **la IA no ejecuta ninguna acción en UTP Class**.

## Qué debe hacer tu servidor

- Guardar la clave de IA en una variable de entorno; nunca devolverla ni registrarla.
- Responder con CORS para el origen de la extensión (`chrome-extension://<id>`), o ninguno si la extensión tiene permiso de host (Navi lo pide al usuario al enviar).
- No guardar el texto recibido (es contenido académico del estudiante) o decirlo claramente en su política.
- Pedirle a la IA una salida JSON con exactamente los campos de arriba y validarla antes de responder.
- Limitar el tamaño de la petición y la frecuencia por usuario.

## Ejemplo mínimo (Node.js, sin dependencias)

```js
import { createServer } from 'node:http';

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // ajusta al origen de tu extensión
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method !== 'POST') return res.writeHead(405).end();

  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 20_000) return res.writeHead(413).end();
  }
  const { title, sections } = JSON.parse(body);

  // Aquí llamarías a tu proveedor de IA con process.env.AI_API_KEY y validarías su JSON.
  const summary = { summary: `Resumen de “${title}”`, keyPoints: sections.map((s) => s.title), dates: [], suggestedActions: [] };

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(summary));
}).listen(8787);
```

Para probar en local, usa `http://localhost:8787/resumen` como dirección (HTTP sin cifrar solo se acepta hacia `localhost`).
