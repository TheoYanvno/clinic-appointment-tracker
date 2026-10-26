// Patient documents: upload (button or drag and drop), view, download and delete.
import { api } from './api.js';
import { $, esc, usDate, clockTime, toast } from './ui.js';
import { DOCUMENT_CATEGORIES, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '../src/validation.js';
import { toBase64, fromBase64 } from '../src/base64.js';

const size = (bytes) => (bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`);

export function documentsSection(docs) {
  return `<section class="card" style="margin-top:14px" id="documents">
    <h2>Medical documents</h2>
    <form id="docForm" class="doc-upload" novalidate>
      <label class="drop-zone" id="dropZone">
        <input type="file" id="docFile" accept="${Object.keys(DOCUMENT_TYPES).join(',')}" hidden>
        <strong id="dropLabel">Drop a file here or click to choose</strong>
        <span class="muted">PDF, JPEG, PNG, WebP or text · up to 5 MB</span>
      </label>
      <div class="row">
        <label class="field">Title<input id="docTitle" placeholder="e.g. MRI left knee"></label>
        <label class="field">Category<select id="docCategory">${DOCUMENT_CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select></label>
      </div>
      <p class="form-errors" id="docErrors" role="alert"></p>
      <button class="btn primary" id="docUpload">Upload document</button>
    </form>
    ${docs.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Title</th><th>Category</th><th>File</th><th class="num">Size</th><th>Uploaded</th><th></th></tr></thead><tbody>
      ${docs.map((d) => `<tr><td><strong>${esc(d.title)}</strong></td><td>${esc(d.category)}</td><td class="muted">${esc(d.fileName)}</td>
        <td class="num">${size(d.size)}</td><td>${usDate(d.uploadedAt.slice(0, 10))} ${clockTime(d.uploadedAt.slice(11, 16))}</td>
        <td class="doc-actions"><button class="btn ghost" data-view="${d.id}">View</button><button class="btn ghost" data-download="${d.id}">Download</button><button class="btn ghost danger med-only" data-delete="${d.id}" aria-label="Delete ${esc(d.title)}">Delete</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">No documents uploaded yet.</p>'}
  </section>`;
}

/** Hooks up the section; `refresh` re-renders the profile after a change. */
export function wireDocuments(root, patientId, refresh) {
  let file = null;
  const choose = (f) => {
    file = f ?? null;
    $('#dropLabel', root).textContent = file ? `${file.name} (${size(file.size)})` : 'Drop a file here or click to choose';
    if (file && !$('#docTitle', root).value) $('#docTitle', root).value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  };
  $('#docFile', root).onchange = (e) => choose(e.target.files[0]);
  const zone = $('#dropZone', root);
  zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('over'); };
  zone.ondragleave = () => zone.classList.remove('over');
  zone.ondrop = (e) => { e.preventDefault(); zone.classList.remove('over'); choose(e.dataTransfer.files[0]); };

  $('#docForm', root).onsubmit = async (e) => {
    e.preventDefault();
    const errors = [];
    if (!file) errors.push('Choose a file to upload');
    else if (!DOCUMENT_TYPES[file.type]) errors.push('Upload a PDF, JPEG, PNG, WebP or text file');
    else if (file.size > MAX_DOCUMENT_BYTES) errors.push('File is larger than 5 MB');
    if (errors.length) { $('#docErrors', root).textContent = errors.join('\n'); return; }
    $('#docUpload', root).disabled = true;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await api(`/api/patients/${patientId}/documents`, {
        method: 'POST',
        body: { title: $('#docTitle', root).value, category: $('#docCategory', root).value, fileName: file.name, mimeType: file.type, dataBase64: toBase64(bytes) },
      });
      toast(`Uploaded ${file.name}`);
      refresh();
    } catch (err) {
      $('#docErrors', root).textContent = err.message;
      $('#docUpload', root).disabled = false;
    }
  };

  const blobFor = async (id) => {
    const doc = await api(`/api/documents/${id}`);
    return { doc, url: URL.createObjectURL(new Blob([fromBase64(doc.dataBase64)], { type: doc.mimeType })) };
  };
  root.querySelectorAll('[data-view]').forEach((b) => {
    b.onclick = async () => {
      const tab = window.open('', '_blank');                  // open first so pop-up blockers allow it
      const { url } = await blobFor(b.dataset.view);
      if (tab) tab.location = url; else location.assign(url);
    };
  });
  root.querySelectorAll('[data-download]').forEach((b) => {
    b.onclick = async () => {
      const { doc, url } = await blobFor(b.dataset.download);
      const a = Object.assign(document.createElement('a'), { href: url, download: doc.fileName });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    };
  });
  root.querySelectorAll('[data-delete]').forEach((b) => {
    b.onclick = async () => {
      if (b.dataset.confirm !== 'yes') { b.dataset.confirm = 'yes'; b.textContent = 'Confirm delete'; return; }   // two clicks, no pop-up
      await api(`/api/documents/${b.dataset.delete}`, { method: 'DELETE' });
      toast('Document deleted');
      refresh();
    };
  });
}
