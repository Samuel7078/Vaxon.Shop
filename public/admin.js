// --- ESTADO GLOBAL DEL ADMIN ---
const adminState = {
    view: 'products',
    products: [],
    categories: [],
    contacts: [],
    stories: [],
    logs: [],
    tempImages: [],
    isEditing: null,
    isNavOpen: true
};

// --- PERSISTENCIA Y LOGIN ---
window.onload = () => {
    const savedSession = localStorage.getItem('vaxon_admin_session');
    if (savedSession) {
        document.getElementById('admin-login').classList.add('hidden');
        document.getElementById('admin-content').classList.remove('hidden');
        loadAdminData();
    }
};

async function checkAdminLogin() {
    const password = document.getElementById('admin-pass').value.trim();
    const rememberMe = document.getElementById('remember-me').checked;
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (rememberMe) localStorage.setItem('vaxon_admin_session', 'active_session_token');
            document.getElementById('admin-login').classList.add('hidden');
            document.getElementById('admin-content').classList.remove('hidden');
            loadAdminData();
        } else {
            alert("Contraseña incorrecta");
        }
    } catch (err) { alert("Error de conexión"); }
}

// --- CARGA DE DATOS ---
async function loadAdminData() {
    try {
        const [p, c, cat, s, l] = await Promise.all([
            fetch('/api/products').then(r => r.json()),
            fetch('/api/contacts').then(r => r.json()),
            fetch('/api/categories').then(r => r.json()),
            fetch('/api/stories').then(r => r.json()),
            fetch('/api/logs').then(r => r.json())
        ]);
        adminState.products = p;
        adminState.contacts = c;
        adminState.categories = cat;
        adminState.stories = s;
        adminState.logs = l;
        renderAdmin();
    } catch (err) { console.error("Error cargando datos:", err); }
}

// --- NAVEGACIÓN ---
function toggleNav() {
    adminState.isNavOpen = !adminState.isNavOpen;
    const sidebar = document.getElementById('admin-sidebar');
    const mainContent = document.getElementById('admin-main-container');
    const toggleBtn = document.getElementById('nav-toggle-btn');

    if (adminState.isNavOpen) {
        sidebar.classList.remove('-translate-x-full');
        mainContent.classList.add('lg:ml-64');
        toggleBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    } else {
        sidebar.classList.add('-translate-x-full');
        mainContent.classList.remove('lg:ml-64');
        toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }
}

function setAdminView(v) {
    adminState.view = v;
    adminState.isEditing = null;
    adminState.tempImages = [];
    if (window.innerWidth < 1024) toggleNav();
    renderAdmin();
}

function renderAdmin() {
    const main = document.getElementById('admin-main');
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(adminState.view));
    });

    if (adminState.view === 'products') renderProductsView(main);
    else if (adminState.view === 'categories') renderCategoriesView(main);
    else if (adminState.view === 'stories') renderStoriesView(main);
    else if (adminState.view === 'team') renderTeamView(main);
    else if (adminState.view === 'logs') renderLogsView(main);
    else if (adminState.view === 'settings') renderSettingsView(main);
}

// --- GESTIÓN DE IMÁGENES ---
async function handleImageUpload(input, single = false) {
    const files = Array.from(input.files);
    const previewContainer = document.getElementById('preview-container');
    const label = input.nextElementSibling; 
    
    if (single) {
        adminState.tempImages = [];
        if(previewContainer) previewContainer.innerHTML = '';
    }

    if(label) label.innerText = "Procesando archivos...";

    const uploadPromises = files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                if (single) adminState.tempImages = [base64];
                else adminState.tempImages.push(base64);

                if (previewContainer) {
                    const div = document.createElement('div');
                    div.className = "relative group animate-fade";
                    div.innerHTML = `
                        <img src="${base64}" class="w-24 h-24 object-cover rounded-2xl shadow-md border-2 border-white/10">
                        <button type="button" onclick="removeTempImage(this, '${base64}')" class="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs shadow-lg flex items-center justify-center">×</button>
                    `;
                    previewContainer.appendChild(div);
                }
                resolve();
            };
            reader.readAsDataURL(file);
        });
    });

    await Promise.all(uploadPromises);
    if(label) label.innerText = "¡Fotos Listas!";
}

function removeTempImage(btn, base64) {
    adminState.tempImages = adminState.tempImages.filter(img => img !== base64);
    btn.parentElement.remove();
}

// --- ENVÍO CON BARRA DE PROGRESO ---
function sendWithProgress(url, method, data, callback) {
    const xhr = new XMLHttpRequest();
    const overlay = document.getElementById('upload-progress-overlay');
    const bar = document.getElementById('upload-progress-bar');
    const text = document.getElementById('upload-progress-text');

    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    }

    xhr.open(method, url);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            if (bar) bar.style.width = percent + '%';
            if (text) text.innerText = `Subiendo a la Nube: ${percent}%`;
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            if (text) text.innerText = "¡Subida Completada!";
            setTimeout(() => {
                if (overlay) overlay.classList.add('hidden');
                callback();
            }, 1000);
        } else {
            alert("Error en el servidor.");
            if (overlay) overlay.classList.add('hidden');
        }
    };
    xhr.send(JSON.stringify(data));
}

// --- LÓGICA AUTO-MENSAJE WHATSAPP ---
window.generateAutoMsg = () => {
    const name = document.getElementById('prod-name')?.value.trim() || "[NOMBRE]";
    const price = document.getElementById('prod-price')?.value.trim() || "[PRECIO]";
    const msgInput = document.getElementById('whatsapp-msg-input');
    
    if(msgInput) {
        msgInput.value = `Hola Vaxon! Estoy Interesad@ en: ${name} Precio: BS ${price}`;
    }
};

// --- VISTAS: PRODUCTOS ---
function renderProductsView(container) {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-12 animate-fade px-4">
            <h2 class="text-4xl font-black uppercase tracking-tighter text-white">Artículos</h2>
            <button onclick="showProductForm()" class="btn-gold px-8 py-4 rounded-full text-[10px]">+ Nuevo</button>
        </div>
        <div class="grid grid-cols-1 gap-4 px-4">
            ${adminState.products.map(p => `
                <div class="bg-dark-300 p-6 rounded-[2rem] flex items-center gap-8 border border-white/5 hover:border-gold-dim/20 transition-colors">
                    <img src="${p.images[0]}" class="w-16 h-16 object-cover rounded-2xl border border-white/10">
                    <div class="flex-1">
                        <p class="text-[11px] font-black uppercase text-gray-200">${p.name}</p>
                        <p class="text-[9px] text-gold-dim font-bold">BS ${p.price}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="showProductForm(${p.id})" class="w-10 h-10 rounded-full bg-dark-100 flex items-center justify-center hover:bg-gold hover:text-black transition-all border border-white/5"><i class="fa-solid fa-edit text-xs"></i></button>
                        <button onclick="deleteAction('products', ${p.id}, '${p.name}')" class="w-10 h-10 rounded-full bg-dark-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-white/5"><i class="fa-solid fa-trash text-xs"></i></button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showProductForm(prodId = null) {
    const p = prodId ? adminState.products.find(x => x.id == prodId) : { name: '', price: '', description: '', categoryId: '', contactId: '', whatsappCustomMsg: '' };
    adminState.isEditing = prodId;
    adminState.tempImages = prodId ? p.images : [];

    document.getElementById('admin-main').innerHTML = `
        <div class="max-w-2xl mx-auto bg-dark-300 p-6 lg:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/5">
            <div id="upload-progress-overlay" class="hidden absolute inset-0 bg-dark-300/95 z-50 flex flex-col items-center justify-center">
                <div class="w-64 h-2 bg-dark-100 rounded-full overflow-hidden mb-4"><div id="upload-progress-bar" class="h-full bg-gold w-0 transition-all"></div></div>
                <p id="upload-progress-text" class="text-[10px] font-black uppercase text-gold">Iniciando...</p>
            </div>
            <h2 class="text-2xl font-black mb-10 uppercase tracking-tighter text-white">${prodId ? 'Editar' : 'Nuevo'} Artículo</h2>
            <form onsubmit="handleProductSubmit(event)" class="space-y-4">
                <input id="prod-name" name="name" value="${p.name}" oninput="generateAutoMsg()" placeholder="Nombre" required class="w-full p-5 bg-dark-100 rounded-2xl outline-none text-[10px] font-bold uppercase text-gray-200 placeholder-gray-600 border border-white/5 focus:border-gold-dim">
                <input id="prod-price" name="price" type="number" step="0.01" value="${p.price}" oninput="generateAutoMsg()" placeholder="Precio BS" required class="w-full p-5 bg-dark-100 rounded-2xl outline-none text-[10px] font-bold uppercase text-gray-200 placeholder-gray-600 border border-white/5 focus:border-gold-dim">
                <select name="categoryId" required class="w-full p-5 bg-dark-100 rounded-2xl outline-none text-[10px] font-bold uppercase text-gray-200 border border-white/5 focus:border-gold-dim">
                    <option value="">Categoría...</option>
                    ${adminState.categories.map(c => `<option value="${c.id}" ${p.categoryId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
                <select name="contactId" required class="w-full p-5 bg-dark-100 rounded-2xl outline-none text-[10px] font-bold uppercase text-gray-200 border border-white/5 focus:border-gold-dim">
                    <option value="">Vendedor...</option>
                    ${adminState.contacts.map(v => `<option value="${v.id}" ${p.contactId == v.id ? 'selected' : ''}>${v.name}</option>`).join('')}
                </select>
                <textarea name="description" placeholder="Descripción" class="w-full p-5 bg-dark-100 rounded-2xl h-32 outline-none text-[10px] font-bold uppercase text-gray-200 placeholder-gray-600 border border-white/5 focus:border-gold-dim">${p.description}</textarea>
                
                <div class="bg-dark-100 p-6 rounded-2xl border-2 border-dashed border-green-900/30">
                    <p class="text-[9px] font-black uppercase mb-3 text-green-500 italic">Vista previa mensaje WhatsApp:</p>
                    <textarea id="whatsapp-msg-input" name="whatsappCustomMsg" class="w-full p-4 bg-dark-300 rounded-xl h-24 outline-none text-[10px] font-bold uppercase text-gray-300 border border-white/5">${p.whatsappCustomMsg || ''}</textarea>
                </div>

                <div id="preview-container" class="flex flex-wrap gap-4 mb-4">${adminState.tempImages.map(img => `
                    <div class="relative group">
                        <img src="${img}" class="w-24 h-24 object-cover rounded-2xl shadow-md border-2 border-white/10">
                        <button type="button" onclick="removeTempImage(this, '${img}')" class="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-6 rounded-full text-xs flex items-center justify-center">×</button>
                    </div>`).join('')}
                </div>
                <input type="file" multiple onchange="handleImageUpload(this)" id="file-p" class="hidden">
                <label for="file-p" class="block p-10 border-4 border-dashed border-white/10 rounded-[2rem] text-center cursor-pointer text-[10px] font-black uppercase text-gray-600 hover:text-gold hover:border-gold-dim/30 transition-all">Subir Imágenes</label>
                <div class="flex gap-4 pt-6">
                    <button type="button" onclick="setAdminView('products')" class="flex-1 py-5 btn-outline-gold rounded-2xl text-[10px]">Cancelar</button>
                    <button type="submit" class="flex-1 py-5 btn-gold rounded-2xl text-[10px]">Guardar</button>
                </div>
            </form>
        </div>
    `;
    if(!prodId) generateAutoMsg();
}

async function handleProductSubmit(e) {
    e.preventDefault();
    if (adminState.tempImages.length === 0) return alert("Selecciona al menos una imagen.");
    const data = Object.fromEntries(new FormData(e.target));
    data.images = adminState.tempImages;
    const url = adminState.isEditing ? `/api/products/${adminState.isEditing}` : '/api/products';
    sendWithProgress(url, adminState.isEditing ? 'PUT' : 'POST', data, () => { loadAdminData(); setAdminView('products'); });
}

// --- VISTAS: STORIES ---
function renderStoriesView(container) {
    container.innerHTML = `
        <div class="relative max-w-4xl mx-auto overflow-hidden px-4">
            <div id="upload-progress-overlay" class="hidden absolute inset-0 bg-dark-400/95 z-50 flex flex-col items-center justify-center">
                <div class="w-48 h-2 bg-dark-100 rounded-full overflow-hidden mb-4"><div id="upload-progress-bar" class="h-full bg-gold w-0"></div></div>
                <p id="upload-progress-text" class="text-[9px] font-black uppercase text-gold">Subiendo Story...</p>
            </div>
            <h2 class="text-4xl font-black uppercase tracking-tighter mb-12 text-white">Stories (24h)</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div class="bg-dark-300 p-10 rounded-[3rem] border border-white/5">
                    <form onsubmit="handleStorySubmit(event)" class="space-y-4">
                        <select name="contactId" required class="w-full p-5 bg-dark-100 rounded-2xl outline-none text-[10px] font-bold uppercase text-gray-200 border border-white/5 focus:border-gold-dim">
                            <option value="">Vendedor...</option>
                            ${adminState.contacts.map(v => `<option value="${v.id}">${v.name}</option>`).join('')}
                        </select>
                        <div id="preview-container" class="flex justify-center mb-4"></div>
                        <input type="file" multiple onchange="handleImageUpload(this, true)" id="file-s" class="hidden">
                        <label for="file-s" class="block p-10 border-2 border-dashed border-white/10 rounded-2xl text-center cursor-pointer text-[10px] font-black uppercase text-gray-600 hover:text-gold hover:border-gold-dim/30 transition-all">Añadir Foto</label>
                        <button type="submit" class="w-full btn-gold py-5 rounded-2xl text-[10px]">Publicar</button>
                    </form>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    ${adminState.stories.map(s => `<div class="relative aspect-[9/16] rounded-3xl overflow-hidden group shadow-md border border-white/5">
                        <img src="${s.imageUrl}" class="w-full h-full object-cover">
                        <button onclick="deleteAction('stories', ${s.id})" class="absolute top-4 right-4 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"><i class="fa-solid fa-times"></i></button>
                    </div>`).join('')}
                </div>
            </div>
        </div>
    `;
}

async function handleStorySubmit(e) {
    e.preventDefault();
    if (adminState.tempImages.length === 0) return alert("Selecciona una imagen.");
    const data = {
        contactId: new FormData(e.target).get('contactId'),
        images: adminState.tempImages
    };
    sendWithProgress('/api/stories', 'POST', data, () => { loadAdminData(); setAdminView('stories'); });
}

// --- RENDERS RESTANTES ---
function renderCategoriesView(container) {
    container.innerHTML = `
        <h2 class="text-4xl font-black uppercase tracking-tighter mb-12 px-4 text-white">Categorías</h2>
        <form onsubmit="handleCategorySubmit(event)" class="bg-dark-300 p-8 rounded-[2rem] mb-8 flex gap-4 border border-white/5 mx-4">
            <input name="name" placeholder="Nueva Categoría" required class="flex-1 p-5 bg-dark-100 rounded-2xl outline-none text-[10px] font-bold uppercase text-gray-200 placeholder-gray-600 border border-white/5 focus:border-gold-dim">
            <button type="submit" class="btn-gold px-10 rounded-2xl text-[10px]">Agregar</button>
        </form>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
            ${adminState.categories.map(c => `
                <div class="bg-dark-300 p-8 rounded-[2rem] flex justify-between items-center border border-white/5 hover:border-gold-dim/20 transition-colors">
                    <p class="text-[11px] font-black uppercase text-gray-200">${c.name}</p>
                    <button onclick="deleteAction('categories', ${c.id}, '${c.name}')" class="text-gray-600 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash"></i></button>
                </div>
            `).join('')}
        </div>
    `;
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    loadAdminData();
}

function renderTeamView(container) {
    container.innerHTML = `
        <h2 class="text-4xl font-black uppercase tracking-tighter mb-12 px-4 text-white">Equipo</h2>
        <form onsubmit="handleTeamSubmit(event)" class="bg-dark-300 p-8 rounded-[2rem] mb-8 flex gap-4 border border-white/5 mx-4">
            <input name="name" placeholder="Nombre" required class="flex-1 p-5 bg-dark-100 rounded-2xl outline-none text-[10px] font-bold uppercase text-gray-200 placeholder-gray-600 border border-white/5 focus:border-gold-dim">
            <input name="number" placeholder="591..." required class="flex-1 p-5 bg-dark-100 rounded-2xl outline-none text-[10px] font-bold uppercase text-gray-200 placeholder-gray-600 border border-white/5 focus:border-gold-dim">
            <button type="submit" class="btn-gold px-10 rounded-2xl text-[10px]">Agregar</button>
        </form>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
            ${adminState.contacts.map(v => `<div class="bg-dark-300 p-8 rounded-[2rem] flex justify-between items-center border border-white/5 hover:border-gold-dim/20 transition-colors">
                <p class="text-[11px] font-black uppercase text-gray-200">${v.name}</p>
                <button onclick="deleteAction('contacts', ${v.id}, '${v.name}')" class="text-gray-600 hover:text-red-500 transition-colors"><i class="fa-solid fa-user-xmark"></i></button>
            </div>`).join('')}
        </div>
    `;
}

async function handleTeamSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    loadAdminData();
}

function renderLogsView(container) {
    container.innerHTML = `
        <h2 class="text-4xl font-black uppercase tracking-tighter mb-12 px-4 text-white">Historial</h2>
        <div class="bg-dark-300 rounded-[2rem] shadow-sm overflow-hidden mx-4 border border-white/5">
            <table class="w-full text-left">
                <thead class="bg-dark-100 border-b border-white/5">
                    <tr>
                        <th class="p-6 text-[10px] font-black uppercase text-gold-dim">Acción</th>
                        <th class="p-6 text-[10px] font-black uppercase text-gold-dim">Detalle</th>
                        <th class="p-6 text-[10px] font-black uppercase text-gold-dim">Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    ${adminState.logs.map(l => `<tr class="border-b border-white/5 hover:bg-dark-100/50">
                        <td class="p-6"><span class="px-3 py-1 bg-gold text-black text-[8px] font-black rounded-full uppercase">${l.action}</span></td>
                        <td class="p-6 text-[11px] font-medium text-gray-300">${l.detail}</td>
                        <td class="p-6 text-[10px] text-gray-500 font-bold">${l.timestamp}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderSettingsView(container) {
    container.innerHTML = `
        <div class="max-w-md mx-auto bg-dark-300 p-12 rounded-[3rem] shadow-2xl animate-fade border border-white/5">
            <h2 class="text-2xl font-black mb-8 uppercase tracking-tighter text-white">Seguridad</h2>
            <div class="space-y-4">
                <input type="password" id="new-pass-1" placeholder="Nueva Contraseña" class="w-full p-5 bg-dark-100 rounded-2xl outline-none text-[10px] font-bold uppercase text-gray-200 placeholder-gray-600 border border-white/5 focus:border-gold-dim">
                <input type="password" id="new-pass-2" placeholder="Confirmar" class="w-full p-5 bg-dark-100 rounded-2xl outline-none text-[10px] font-bold uppercase text-gray-200 placeholder-gray-600 border border-white/5 focus:border-gold-dim">
                <button onclick="updatePassword()" class="w-full btn-gold py-5 rounded-2xl text-[10px] tracking-widest">Actualizar</button>
            </div>
        </div>
    `;
}

async function updatePassword() {
    const p1 = document.getElementById('new-pass-1').value;
    const p2 = document.getElementById('new-pass-2').value;
    if (p1 !== p2 || p1.length < 4) return alert("Error en contraseñas.");
    await fetch('/api/admin/update-password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: p1 }) });
    logoutAdmin();
}

async function deleteAction(table, id, name = 'el registro') {
    if (confirm(`¿Eliminar ${name}?`)) {
        await fetch(`/api/${table}/${id}`, { method: 'DELETE' });
        loadAdminData();
    }
}

function logoutAdmin() {
    localStorage.removeItem('vaxon_admin_session');
    location.reload();
}