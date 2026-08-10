// api/generate.js
// TonizLab 3D — Generador de Copys + Fondo Vacío
// Stack: Vercel Serverless Function (Node.js) + formidable v3 + Gemini 1.5 Flash + Pollinations AI

import formidable from 'formidable';
import fs from 'fs';

// ⚠️ OBLIGATORIO: bodyParser debe estar desactivado para que formidable pueda
// parsear el multipart/form-data que llega desde el frontend (FormData).
export const config = {
  api: {
    bodyParser: false,
  },
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// ---------------------------------------------------------------------------
// Helper: parsea el request multipart con formidable (Promise wrapper)
// ---------------------------------------------------------------------------
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

// ---------------------------------------------------------------------------
// Helper: convierte el archivo recibido a Base64 puro (sin el prefijo data:)
// ---------------------------------------------------------------------------
function fileToBase64(file) {
  // formidable v3 entrega la ruta temporal en file.filepath
  const filePath = file.filepath || file.path;
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
}

// ---------------------------------------------------------------------------
// Helper: extrae el primer valor de un campo de formidable
// (formidable v3 a veces entrega arrays según config)
// ---------------------------------------------------------------------------
function firstValue(field) {
  if (Array.isArray(field)) return field[0];
  return field;
}

// ---------------------------------------------------------------------------
// Construye el prompt de texto para Gemini
// ---------------------------------------------------------------------------
function buildGeminiPrompt(productName, mainBenefit, background) {
  return `
Eres un experto en marketing digital y copywriting para redes sociales, especializado en productos de impresión 3D.

Analiza DETALLADAMENTE la imagen adjunta de una pieza impresa en 3D. Observa con precisión:
- La geometría exacta de la pieza (formas, ángulos, módulos, divisiones internas, texturas de capa visibles).
- Los colores exactos del filamento utilizado.
- Cualquier característica distintiva (acabado, tamaño aparente, funcionalidad visible).

Datos del producto proporcionados por el vendedor:
- Nombre del producto: "${productName}"
- Beneficio principal a comunicar: "${mainBenefit}"
- Fondo/ambientación elegida para el fotomontaje final: "${background}"

Con toda esa información, genera copys de venta para la marca "TonizLab 3D".

IMPORTANTE: para Instagram y TikTok debes generar EXACTAMENTE 3 variantes distintas entre sí (diferente ángulo/tono: una más emocional, una más directa/orientada a venta, una más creativa o humorística), no repitas la misma idea con sinónimos.

Devuelve tu respuesta ÚNICAMENTE como un objeto JSON puro (sin texto adicional, sin explicaciones, sin backticks, sin markdown), con EXACTAMENTE esta estructura:

{
  "instagram_copy": [
    "Variante 1: texto con emojis, detalles visuales reales de la pieza, y un CTA claro al final",
    "Variante 2: mismo producto, ángulo distinto",
    "Variante 3: mismo producto, ángulo distinto"
  ],
  "tiktok_copy": [
    "Variante 1: guion corto tipo [ESCENA 1] [ESCENA 2] [ESCENA 3]",
    "Variante 2: guion corto con otro gancho inicial",
    "Variante 3: guion corto con otro gancho inicial"
  ],
  "hashtags": "Lista de hashtags relevantes separados por espacio, debe incluir obligatoriamente #TonizLab3D"
}
`.trim();
}

// ---------------------------------------------------------------------------
// Llama a Gemini con la imagen en Base64 + prompt de texto
// ---------------------------------------------------------------------------
async function callGemini(base64Image, mimeType, promptText) {
  const body = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.8,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Gemini no devolvió contenido de texto válido.');
  }

  return rawText;
}

// ---------------------------------------------------------------------------
// Parseo seguro del JSON devuelto por Gemini (limpia backticks/```json)
// ---------------------------------------------------------------------------
function safeParseGeminiJSON(rawText, productName) {
  try {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validación mínima de estructura esperada: ambos copys deben ser arrays no vacíos
    const isValidVariantArray = (val) =>
      Array.isArray(val) && val.length > 0 && val.every((v) => typeof v === 'string');

    if (
      !isValidVariantArray(parsed.instagram_copy) ||
      !isValidVariantArray(parsed.tiktok_copy) ||
      typeof parsed.hashtags !== 'string'
    ) {
      throw new Error('Estructura JSON incompleta.');
    }

    // Aseguramos el hashtag de marca aunque Gemini lo olvide
    if (!parsed.hashtags.includes('#TonizLab3D')) {
      parsed.hashtags += ' #TonizLab3D';
    }

    return parsed;
  } catch (err) {
    console.error('⚠️ Fallback activado. Error parseando JSON de Gemini:', err.message);
    // JSON de respaldo por si Gemini falla o devuelve algo inválido
    return {
      instagram_copy: [
        `✨ Descubre "${productName}" de TonizLab 3D. Diseño, funcionalidad y calidad impresa capa por capa. 🖨️ ¡Escríbenos para el tuyo! 👇`,
        `¿Cansado del desorden? "${productName}" está pensado para resolverlo, pieza por pieza. 🧩 Link en bio para pedir el tuyo.`,
        `Esto no es un objeto más, es "${productName}" hecho a medida en nuestra Bambu Lab 🖨️🔥 ¿Lo quieres en tu espacio?`,
      ],
      tiktok_copy: [
        `[ESCENA 1] Mostrar la pieza girando 360°. [ESCENA 2] Zoom a detalles de impresión. [ESCENA 3] Producto en uso + texto: "Hecho en TonizLab 3D 🔥"`,
        `[ESCENA 1] "POV: encontraste la solución a tu desorden" [ESCENA 2] Unboxing rápido [ESCENA 3] Producto ya colocado + CTA "Link en bio"`,
        `[ESCENA 1] Antes (espacio desordenado) [ESCENA 2] Transición con el producto [ESCENA 3] Después + texto "TonizLab 3D lo hizo posible"`,
      ],
      hashtags: '#TonizLab3D #Impresion3D #BambuLab #DisenoFuncional #HechoAMano',
    };
  }
}

// ---------------------------------------------------------------------------
// Construye el prompt visual estricto para Pollinations AI (fondo vacío)
// ---------------------------------------------------------------------------
function buildPollinationsUrl(background) {
  const seed = Math.floor(Math.random() * 1_000_000); // seed aleatorio anti-caché

  const promptEn = [
    `extreme close-up macro shot of an empty ${background} surface`,
    'the surface occupies the entire foreground',
    'completely blank, strictly NO objects, no products, no items, no props',
    'negative space, empty space in the center for product placement',
    'soft blurred background, bokeh, shallow depth of field',
    'professional studio product photography lighting',
    'photorealistic, high detail texture',
  ].join(', ');

  const encodedPrompt = encodeURIComponent(promptEn);

  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`;
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en las variables de entorno de Vercel.' });
  }

  try {
    const { fields, files } = await parseForm(req);

    const productName = firstValue(fields.productName) || 'Producto TonizLab 3D';
    const mainBenefit = firstValue(fields.mainBenefit) || 'Diseño funcional y personalizable';
    const background = firstValue(fields.background) || 'madera clara';

    const imageFile = files.image ? (Array.isArray(files.image) ? files.image[0] : files.image) : null;

    if (!imageFile) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen (campo "image" requerido).' });
    }

    const base64Image = fileToBase64(imageFile);
    const mimeType = imageFile.mimetype || imageFile.type || 'image/jpeg';

    // 1) Texto: Gemini analiza la imagen real
    const promptText = buildGeminiPrompt(productName, mainBenefit, background);
    let copys;
    try {
      const rawGeminiText = await callGemini(base64Image, mimeType, promptText);
      copys = safeParseGeminiJSON(rawGeminiText, productName);
    } catch (geminiError) {
      console.error('⚠️ Error llamando a Gemini, usando fallback:', geminiError.message);
      copys = safeParseGeminiJSON('', productName); // fuerza el fallback
    }

    // 2) Imagen: URL de Pollinations con el fondo vacío
    const backgroundImageUrl = buildPollinationsUrl(background);

    return res.status(200).json({
      success: true,
      copys,
      backgroundImageUrl,
    });
  } catch (error) {
    console.error('❌ Error general en /api/generate:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno procesando la solicitud.',
      detail: error.message,
    });
  }
}
