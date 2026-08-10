// api/generate.js
import formidable from 'formidable';
import fs from 'fs';

// ⚠️ OBLIGATORIO: bodyParser desactivado para que formidable parsee el FormData[cite: 1]
export const config = {
  api: {
    bodyParser: false,
  },
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// CORRECCIÓN APLICADA: Uso de gemini-1.5-flash-latest para evitar el error 404
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// Helper: parsea el request multipart con formidable[cite: 1]
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB[cite: 1]
    });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

// Helper: convierte el archivo a Base64 puro[cite: 1]
function fileToBase64(file) {
  const filePath = file.filepath || file.path;
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
}

// Helper: extrae el primer valor de un campo de formidable[cite: 1]
function firstValue(field) {
  if (Array.isArray(field)) return field[0];
  return field;
}

// Construye el prompt de texto para Gemini[cite: 1]
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
    "Variante 1: Gancho (caption) muy invitacional para acompañar el video, animando a la gente a quedarse a ver la pieza en acción y cómo funciona. NO uses formato de guion ni escenas.",
    "Variante 2: Caption invitacional con un tono de curiosidad sobre el proceso de impresión 3D o el uso de este producto.",
    "Variante 3: Caption directo y dinámico invitando a ver el resultado final de esta pieza e invitando a comentar."
  ],
  "hashtags": "Lista de hashtags relevantes separados por espacio, debe incluir obligatoriamente #TonizLab3D"
}
`.trim();
}

// Llama a Gemini con la imagen en Base64 + prompt de texto[cite: 1]
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

// Parseo seguro del JSON devuelto por Gemini[cite: 1]
function safeParseGeminiJSON(rawText, productName) {
  try {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    const isValidVariantArray = (val) =>
      Array.isArray(val) && val.length > 0 && val.every((v) => typeof v === 'string');

    if (
      !isValidVariantArray(parsed.instagram_copy) ||
      !isValidVariantArray(parsed.tiktok_copy) ||
      typeof parsed.hashtags !== 'string'
    ) {
      throw new Error('Estructura JSON incompleta.');
    }

    if (!parsed.hashtags.includes('#TonizLab3D')) {
      parsed.hashtags += ' #TonizLab3D';
    }

    return parsed;
  } catch (err) {
    console.error('⚠️ Fallback activado. Error parseando JSON de Gemini:', err.message);
    return {
      instagram_copy: [
        `✨ Descubre "${productName}" de TonizLab 3D. Diseño, funcionalidad y calidad impresa capa por capa. 🖨️ ¡Escríbenos para el tuyo! 👇`,
        `¿Cansado del desorden? "${productName}" está pensado para resolverlo, pieza por pieza. 🧩 Link en bio para pedir el tuyo.`,
        `Esto no es un objeto más, es "${productName}" hecho a medida en nuestra Bambu Lab 🖨️🔥 ¿Lo quieres en tu espacio?`,
      ],
      tiktok_copy: [
        `¿Alguna vez te preguntaste cómo funciona "${productName}"? 🖨️ Quédate a ver esta pieza en acción y el resultado final que logramos en TonizLab 3D. 🔥👇`,
        `El desorden tiene los días contados. 👀 Mira cómo esta pieza impresa en 3D entra en acción y organiza el espacio. ¡Dale play! ▶️`,
        `De la cama de impresión directo a tu escritorio. 🚀 Acompáñanos a ver cómo diseñamos y usamos "${productName}". ¿Qué te parece el acabado? Te leemos en comentarios. 👇`
      ],
      hashtags: '#TonizLab3D #Impresion3D #BambuLab #DisenoFuncional #HechoAMano',
    };
  }
}

// Construye el prompt visual estricto para Pollinations AI[cite: 1]
function buildPollinationsUrl(background) {
  const seed = Math.floor(Math.random() * 1_000_000);

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

// Handler principal[cite: 1]
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

    const promptText = buildGeminiPrompt(productName, mainBenefit, background);
    let copys;
    try {
      const rawGeminiText = await callGemini(base64Image, mimeType, promptText);
      copys = safeParseGeminiJSON(rawGeminiText, productName);
    } catch (geminiError) {
      console.error('⚠️ Error llamando a Gemini, usando fallback:', geminiError.message);
      copys = safeParseGeminiJSON('', productName); 
    }

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