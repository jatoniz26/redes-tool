// app.js — TonizLab 3D
// Vanilla JS: arma el FormData, llama a /api/generate, pinta los resultados.

const form = document.getElementById('generatorForm');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');

const imageInput = document.getElementById('image');
const previewImg = document.getElementById('preview');

const emptyState = document.getElementById('emptyState');
const copyResult = document.getElementById('copyResult');
const igVariantsEl = document.getElementById('igVariants');
const ttVariantsEl = document.getElementById('ttVariants');
const carouselVariantsEl = document.getElementById('carouselVariants');
const storiesVariantsEl = document.getElementById('storiesVariants');
const hashtagsEl = document.getElementById('hashtags');

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

// --- Botón Reset / Limpiar --------------------------------------------------
resetBtn.addEventListener('click', () => {
  form.reset();
  previewImg.src = '';
  previewImg.style.display = 'none';
  copyResult.style.display = 'none';
  if (emptyState) emptyState.style.display = 'block';
  statusEl.textContent = '';
});

// --- Botones "Copiar" (delegado: funciona también con variantes dinámicas) --
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;

  let textToCopy = '';

  if (btn.dataset.target) {
    textToCopy = document.getElementById(btn.dataset.target).textContent;
  } else if (btn.dataset.copyText !== undefined) {
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
  
  const printTimeInput = document.getElementById('printTime');
  const filamentTypeInput = document.getElementById('filamentType');
  if (printTimeInput) formData.append('printTime', printTimeInput.value.trim());
  if (filamentTypeInput) formData.append('filamentType', filamentTypeInput.value.trim());
  
  formData.append('image', file);

  toggleLoading(true);
  copyResult.style.display = 'none';
  setStatus('Analizando la pieza geométrica y redactando contenido...');

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
    setStatus('¡Listo! Copys, carruseles e historias generados.');
  } catch (err) {
    console.error('Error generando contenido:', err);
    setStatus(`❌ Error: ${err.message}`, true);
  } finally {
    toggleLoading(false);
  }
});

function renderResults(data) {
  const { copys } = data;

  if (emptyState) emptyState.style.display = 'none';

  igVariantsEl.innerHTML = '';
  renderVariants(igVariantsEl, copys.instagram_copy);

  ttVariantsEl.innerHTML = '';
  renderVariants(ttVariantsEl, copys.tiktok_copy);

  if (carouselVariantsEl) {
    carouselVariantsEl.innerHTML = '';
    renderVariants(carouselVariantsEl, copys.carousel_script);
  }

  if (storiesVariantsEl) {
    storiesVariantsEl.innerHTML = '';
    renderVariants(storiesVariantsEl, copys.stories_behind_the_scenes);
  }

  hashtagsEl.textContent = copys.hashtags || '';
  copyResult.style.display = 'block';
}

// Pinta un array de variantes (strings) dentro de un contenedor, cada una
// con su propia etiqueta "Opción N" y botón de copiar.
function renderVariants(container, variants) {
  const list = Array.isArray(variants) ? variants : [variants].filter(Boolean);

  list.forEach((text, index) => {
    const item = document.createElement('div');
    item.className = 'variant-item';

    const label = document.createElement('div');
    label.className = 'variant-label';
    label.textContent = `Opción ${index + 1}`;

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
  submitBtn.textContent = isLoading ? 'Procesando...' : 'Generar Contenido';
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'error' : '';
}