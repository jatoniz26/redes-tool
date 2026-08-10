// app.js — TonizLab 3D
const form = document.getElementById('generatorForm');
const submitBtn = document.getElementById('submitBtn');
const statusEl = document.getElementById('status');

const imageInput = document.getElementById('image');
const previewImg = document.getElementById('preview');

const copyResult = document.getElementById('copyResult');
const igVariantsEl = document.getElementById('igVariants');
const ttVariantsEl = document.getElementById('ttVariants');
const carouselVariantsEl = document.getElementById('carouselVariants'); // NUEVO
const storiesVariantsEl = document.getElementById('storiesVariants'); // NUEVO
const hashtagsEl = document.getElementById('hashtags');

// Vista previa de la imagen
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

// Botones "Copiar"
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;

  let textToCopy = btn.dataset.target 
    ? document.getElementById(btn.dataset.target).textContent 
    : btn.dataset.copyText;

  if (!textToCopy) return;

  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalText = btn.textContent;
    btn.textContent = '✅ Copiado';
    setTimeout(() => { btn.textContent = originalText; }, 1500);
  });
});

// Envío del formulario
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
  
  // Agregamos los nuevos campos
  const printTimeInput = document.getElementById('printTime');
  const filamentTypeInput = document.getElementById('filamentType');
  if(printTimeInput) formData.append('printTime', printTimeInput.value.trim());
  if(filamentTypeInput) formData.append('filamentType', filamentTypeInput.value.trim());

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
    setStatus('¡Listo! Copys, Carruseles e Historias generadas.');
  } catch (err) {
    console.error('Error generando contenido:', err);
    setStatus(`❌ Error: ${err.message}`, true);
  } finally {
    toggleLoading(false);
  }
});

function renderResults(data) {
  const { copys } = data;

  // Limpiar y renderizar todas las secciones
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
  submitBtn.textContent = isLoading ? 'Procesando...' : 'Analizar pieza y generar';
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'error' : '';
}