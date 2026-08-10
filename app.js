// app.js — TonizLab 3D
// Vanilla JS: arma el FormData, llama a /api/generate, pinta los resultados.

const form = document.getElementById('generatorForm');
const submitBtn = document.getElementById('submitBtn');
const statusEl = document.getElementById('status');

const imageInput = document.getElementById('image');
const previewImg = document.getElementById('preview');

const copyResult = document.getElementById('copyResult');
const igVariantsEl = document.getElementById('igVariants');
const ttVariantsEl = document.getElementById('ttVariants');
const hashtagsEl = document.getElementById('hashtags');

const bgResult = document.getElementById('bgResult');
const bgImageEl = document.getElementById('bgImage');
const downloadBgBtn = document.getElementById('downloadBg');

// --- Vista previa de la imagen seleccionada -------------------------------
imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) {
    previewImg.style.display = 'none';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewImg.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

// --- Botones "Copiar" (delegado: funciona también con variantes dinámicas) --
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;

  let textToCopy = '';

  if (btn.dataset.target) {
    // Botón estático (ej. hashtags)
    textToCopy = document.getElementById(btn.dataset.target).textContent;
  } else if (btn.dataset.copyText !== undefined) {
    // Botón de variante generado dinámicamente
    textToCopy = btn.dataset.copyText;
  } else {
    return;
  }

  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalText = btn.textContent;
    btn.textContent = '✅ Copiado';
    setTimeout(() => { btn.textContent = originalText; }, 1500);
  });
});

// --- Descargar el fondo generado --------------------------------------------
downloadBgBtn.addEventListener('click', async () => {
  const url = bgImageEl.src;
  if (!url) return;
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'tonizlab3d-fondo.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Error descargando el fondo:', err);
    window.open(url, '_blank');
  }
});

// --- Envío del formulario ----------------------------------------------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const file = imageInput.files[0];
  if (!file) {
    setStatus('Selecciona una foto del producto primero.', true);
    return;
  }

  const formData = new FormData();
  formData.append('productName', document.getElementById('productName').value.trim());
  formData.append('mainBenefit', document.getElementById('mainBenefit').value.trim());
  formData.append('background', document.getElementById('background').value);
  formData.append('image', file);

  toggleLoading(true);
  copyResult.style.display = 'none';
  bgResult.style.display = 'none';
  setStatus('Analizando la pieza y generando el fondo... esto puede tardar unos segundos.');

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Error del servidor (${response.status})`);
    }

    renderResults(data);
    setStatus('¡Listo! Copys y fondo generados.');
  } catch (err) {
    console.error('Error generando contenido:', err);
    setStatus(`❌ Error: ${err.message}`, true);
  } finally {
    toggleLoading(false);
  }
});

function renderResults(data) {
  const { copys, backgroundImageUrl } = data;

  igVariantsEl.innerHTML = '';
  renderVariants(igVariantsEl, copys.instagram_copy);

  ttVariantsEl.innerHTML = '';
  renderVariants(ttVariantsEl, copys.tiktok_copy);

  hashtagsEl.textContent = copys.hashtags || '';
  copyResult.style.display = 'block';

  bgImageEl.src = backgroundImageUrl;
  bgImageEl.style.display = 'block';
  bgResult.style.display = 'block';
}

// Pinta un array de variantes (strings) dentro de un contenedor, cada una
// con su propia etiqueta "Variante N" y botón de copiar.
function renderVariants(container, variants) {
  const list = Array.isArray(variants) ? variants : [variants].filter(Boolean);

  list.forEach((text, index) => {
    const item = document.createElement('div');
    item.className = 'variant-item';

    const label = document.createElement('div');
    label.className = 'variant-label';
    label.textContent = `Variante ${index + 1}`;

    const pre = document.createElement('pre');
    pre.textContent = text;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copiar';
    copyBtn.dataset.copyText = text;

    item.appendChild(label);
    item.appendChild(pre);
    item.appendChild(copyBtn);
    container.appendChild(item);
  });
}

function toggleLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? 'Generando...' : 'Generar copys y fondo';
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'error' : '';
}
