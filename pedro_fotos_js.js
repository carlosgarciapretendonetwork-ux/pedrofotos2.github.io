// Configuration & Storage Keys
const REQUIRED_PASS = "CCC26AAA27";
const STORAGE_KEY = "pedro_fotos_published_data";
const SESSION_KEY = "pedro_fotos_auth_active";

let photos = [];
let isAuthenticated = false;
let activeCategory = 'todos';
let activeSearchQuery = '';
let activeLightboxId = null;
let uploadMethod = 'url';
let base64FileString = '';

// Initialize App on Page Load
window.onload = function() {
    checkAuthSession();
    loadPhotosFromStorage();
    renderGallery();
};

// Authentication Methods
function checkAuthSession() {
    const session = localStorage.getItem(SESSION_KEY);
    if (session === 'true') {
        isAuthenticated = true;
    }
    updateAuthUI();
}

function updateAuthUI() {
    const badge = document.getElementById('authStatusBadge');
    const dot = document.getElementById('authDot');
    const text = document.getElementById('authStatusText');
    const logoutBtn = document.getElementById('logoutBtn');
    const deleteBtn = document.getElementById('deletePhotoBtn');
    const guestNotice = document.getElementById('guestNotice');

    if (isAuthenticated) {
        if (badge) badge.className = "hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30";
        if (dot) dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-pulse";
        if (text) text.innerText = "Modo Creador (Autenticado)";
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (deleteBtn) deleteBtn.classList.remove('hidden');
        if (guestNotice) guestNotice.classList.add('hidden');
    } else {
        if (badge) badge.className = "hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 text-slate-400 border border-slate-700";
        if (dot) dot.className = "w-2 h-2 rounded-full bg-slate-500";
        if (text) text.innerText = "Modo Visitante";
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (deleteBtn) deleteBtn.classList.add('hidden');
        if (guestNotice) guestNotice.classList.remove('hidden');
    }
}

function handleUploadClick() {
    if (isAuthenticated) {
        openModal('uploadModal');
    } else {
        openModal('authModal');
    }
}

function handleAuthSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('passwordInput');
    const errorMsg = document.getElementById('authErrorMsg');

    if (input.value === REQUIRED_PASS) {
        isAuthenticated = true;
        localStorage.setItem(SESSION_KEY, 'true');
        updateAuthUI();
        closeModal('authModal');
        input.value = '';
        errorMsg.classList.add('hidden');
        showToast('Acceso autorizado como Creador', 'success');
        openModal('uploadModal');
    } else {
        errorMsg.classList.remove('hidden');
        const modalCard = document.querySelector('#authModal > div');
        modalCard.classList.add('animate-shake');
        setTimeout(() => modalCard.classList.remove('animate-shake'), 400);
    }
}

function logout() {
    isAuthenticated = false;
    localStorage.removeItem(SESSION_KEY);
    updateAuthUI();
    showToast('Sesión de administración cerrada', 'info');
}

function togglePasswordVisibility() {
    const input = document.getElementById('passwordInput');
    const icon = document.getElementById('passEyeIcon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye';
    }
}

// Data Management
function loadPhotosFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            photos = JSON.parse(saved);
        } catch(e) {
            photos = [];
        }
    } else {
        photos = [];
    }
}

function savePhotosToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
}

// Upload Handling
function switchUploadTab(method) {
    uploadMethod = method;
    const tabUrl = document.getElementById('tabUrlBtn');
    const tabFile = document.getElementById('tabFileBtn');
    const groupUrl = document.getElementById('uploadUrlGroup');
    const groupFile = document.getElementById('uploadFileGroup');

    if (method === 'url') {
        tabUrl.className = "flex-1 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 transition";
        tabFile.className = "flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition";
        groupUrl.classList.remove('hidden');
        groupFile.classList.add('hidden');
    } else {
        tabFile.className = "flex-1 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 transition";
        tabUrl.className = "flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition";
        groupFile.classList.remove('hidden');
        groupUrl.classList.add('hidden');
    }
}

function previewSelectedFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            base64FileString = e.target.result;
            document.getElementById('filePreviewImg').src = base64FileString;
            document.getElementById('filePreviewContainer').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function handlePhotoUpload(e) {
    e.preventDefault();

    let imageUrl = '';
    if (uploadMethod === 'url') {
        imageUrl = document.getElementById('photoUrlInput').value.trim();
        if (!imageUrl) {
            showToast('Ingresa una URL válida', 'error');
            return;
        }
    } else {
        if (!base64FileString) {
            showToast('Selecciona un archivo de imagen', 'error');
            return;
        }
        imageUrl = base64FileString;
    }

    const title = document.getElementById('photoTitleInput').value.trim();
    const category = document.getElementById('photoCategoryInput').value;
    const description = document.getElementById('photoDescInput').value.trim();

    const newPhoto = {
        id: Date.now().toString(),
        title: title,
        url: imageUrl,
        category: category,
        description: description || 'Sin descripción adicional.',
        date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    photos.unshift(newPhoto);
    savePhotosToStorage();
    renderGallery();

    // Reset Form & Close
    document.getElementById('uploadForm').reset();
    document.getElementById('filePreviewContainer').classList.add('hidden');
    base64FileString = '';
    closeModal('uploadModal');
    showToast('¡Fotografía publicada exitosamente!', 'success');
}

// Rendering & Gallery Logic
function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    const emptyState = document.getElementById('emptyState');

    // Apply Filter & Search
    const filtered = photos.filter(photo => {
        const matchesCategory = activeCategory === 'todos' || photo.category === activeCategory;
        const matchesSearch = photo.title.toLowerCase().includes(activeSearchQuery.toLowerCase()) || 
                              photo.description.toLowerCase().includes(activeSearchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    
    grid.innerHTML = filtered.map(photo => `
        <div class="img-card group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
            <div class="relative overflow-hidden cursor-pointer bg-slate-950 aspect-square" onclick="openLightbox('${photo.id}')">
                <img src="${photo.url}" alt="${photo.title}" loading="lazy" class="w-full h-full object-cover transition duration-500 group-hover:scale-105">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-4">
                    <span class="text-xs font-semibold px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg">Ver foto</span>
                </div>
            </div>
            <div class="p-4 flex flex-col justify-between flex-grow">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">${photo.category}</span>
                        <span class="text-[11px] text-slate-500">${photo.date}</span>
                    </div>
                    <h3 class="text-base font-bold text-white line-clamp-1 cursor-pointer hover:text-amber-400 transition" onclick="openLightbox('${photo.id}')">${photo.title}</h3>
                    <p class="text-xs text-slate-400 line-clamp-2 mt-1">${photo.description}</p>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center">
                    <button onclick="triggerDownload('${photo.url}', '${photo.title}')" class="text-xs font-medium text-slate-300 hover:text-amber-400 flex items-center space-x-1 transition">
                        <i class="fa-solid fa-download"></i>
                        <span>Guardar</span>
                    </button>
                    <button onclick="openLightbox('${photo.id}')" class="text-xs font-medium text-slate-400 hover:text-white flex items-center space-x-1">
                        <span>Detalles</span>
                        <i class="fa-solid fa-arrow-right text-[10px]"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Lightbox Logic
function openLightbox(id) {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    activeLightboxId = id;
    document.getElementById('lightboxImg').src = photo.url;
    document.getElementById('lightboxTitle').innerText = photo.title;
    document.getElementById('lightboxCategory').innerText = photo.category;
    document.getElementById('lightboxDate').innerText = photo.date;
    document.getElementById('lightboxDesc').innerText = photo.description;

    openModal('lightboxModal');
}

function deleteCurrentPhoto() {
    if (!isAuthenticated) {
        showToast('Debes identificarte primero para eliminar fotos', 'error');
        openModal('authModal');
        return;
    }

    if (!activeLightboxId) return;

    if (confirm('¿Estás seguro de que deseas borrar esta fotografía?')) {
        photos = photos.filter(p => p.id !== activeLightboxId);
        savePhotosToStorage();
        renderGallery();
        closeModal('lightboxModal');
        showToast('Fotografía eliminada', 'info');
    }
}

// Download Helper Logic
function triggerDownload(url, filename) {
    showToast('Iniciando descarga...', 'info');

    // If Base64 image
    if (url.startsWith('data:image')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    // Remote URL Fetch
    fetch(url, { mode: 'cors' })
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        })
        .catch(() => {
            // Fallback for CORS restricted images
            window.open(url, '_blank');
        });
}

function downloadCurrentPhoto() {
    const photo = photos.find(p => p.id === activeLightboxId);
    if (photo) {
        triggerDownload(photo.url, photo.title);
    }
}

// Filtering & Search Controls
function filterCategory(cat) {
    activeCategory = cat;
    const buttons = document.querySelectorAll('#categoryFilters .category-btn');
    buttons.forEach(btn => {
        if (btn.innerText.toLowerCase().includes(cat.toLowerCase()) || (cat === 'todos' && btn.innerText.includes('Todas'))) {
            btn.className = "category-btn active bg-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm whitespace-nowrap transition duration-200";
        } else {
            btn.className = "category-btn bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2 rounded-xl text-sm whitespace-nowrap transition duration-200 border border-slate-700";
        }
    });
    renderGallery();
}

function handleSearch() {
    activeSearchQuery = document.getElementById('searchInput').value;
    renderGallery();
}

function resetFilters() {
    activeCategory = 'todos';
    activeSearchQuery = '';
    document.getElementById('searchInput').value = '';
    filterCategory('todos');
}

// Utility UI Functions
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    const iconEl = document.getElementById('toastIcon');

    msgEl.innerText = message;

    if (type === 'success') {
        iconEl.className = 'fa-solid fa-circle-check text-emerald-400 text-lg';
    } else if (type === 'error') {
        iconEl.className = 'fa-solid fa-circle-xmark text-rose-400 text-lg';
    } else {
        iconEl.className = 'fa-solid fa-circle-info text-amber-400 text-lg';
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}