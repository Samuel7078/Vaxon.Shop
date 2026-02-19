// --- ESTADO GLOBAL ---
const state = {
    view: 'home',
    products: [],
    categories: [],
    contacts: [],
    stories: [],
    cart: [],
    selectedCategory: 'todas',
    selectedProduct: null,
    detailActiveImg: 0,
    detailSlideInterval: null
};

// --- MOTOR DE DATOS ---
async function loadData() {
    try {
        const [p, cat, con, s] = await Promise.all([
            fetch('/api/products').then(r => r.json()),
            fetch('/api/categories').then(r => r.json()),
            fetch('/api/contacts').then(r => r.json()),
            fetch('/api/stories').then(r => r.json())
        ]);
        state.products = p;
        state.categories = cat;
        state.contacts = con;
        state.stories = s;
        render();
        document.getElementById('loading-overlay')?.classList.add('hidden');
    } catch (e) { console.error("Error cargando datos:", e); }
}

// --- FUNCIONES DEL CARRITO ---
window.toggleCart = (isOpen) => {
    const sidebar = document.getElementById('cart-sidebar');
    const content = document.getElementById('cart-content');
    if (!sidebar || !content) return;
    if (isOpen) {
        sidebar.classList.remove('invisible', 'opacity-0');
        content.classList.remove('translate-x-full');
        updateCartUI();
    } else {
        content.classList.add('translate-x-full');
        setTimeout(() => sidebar.classList.add('invisible', 'opacity-0'), 500);
    }
};

window.addToCart = (id, q = null) => {
    const qty = q !== null ? q : 1;
    const p = state.products.find(x => x.id == id);
    const e = state.cart.find(x => x.id == id);
    if (e) e.quantity += qty; else state.cart.push({ ...p, quantity: qty });
    updateCartUI(); 
    toggleCart(true);
};

window.changeCartQty = (id, d) => {
    const i = state.cart.find(x => x.id == id);
    if (i) { 
        i.quantity += d; 
        if (i.quantity <= 0) state.cart = state.cart.filter(x => x.id != id); 
    }
    updateCartUI();
};

function updateCartUI() {
    const total = state.cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const count = state.cart.reduce((s, i) => s + i.quantity, 0);

    document.getElementById('cart-count').innerText = count;
    document.getElementById('cart-count').classList.toggle('hidden', count === 0);
    document.getElementById('header-cart-total').innerText = `BS ${total.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `BS ${total.toFixed(2)}`;

    const list = document.getElementById('cart-items-list');
    list.innerHTML = state.cart.length ? state.cart.map(i => `
        <div class="flex gap-4 items-center bg-white p-4 rounded-2xl border mb-3 shadow-sm animate-fade">
            <img src="${i.images[0]}" class="w-14 h-14 object-cover rounded-xl border grayscale">
            <div class="flex-1">
                <h4 class="text-[10px] font-black uppercase text-black truncate">${i.name}</h4>
                <div class="flex justify-between items-center mt-3">
                    <div class="flex items-center gap-3 bg-gray-50 px-2 py-1 rounded-full border">
                        <button onclick="changeCartQty(${i.id}, -1)" class="text-gray-400 hover:text-black font-bold text-xs">－</button>
                        <span class="text-[10px] font-black">${i.quantity}</span>
                        <button onclick="changeCartQty(${i.id}, 1)" class="text-gray-400 hover:text-black font-bold text-xs">＋</button>
                    </div>
                    <p class="text-[10px] font-black">BS ${(i.price * i.quantity).toFixed(2)}</p>
                </div>
            </div>
        </div>`).join('') : '<div class="text-center py-20 opacity-20 text-[10px] font-black uppercase">Bolsa Vacía</div>';
}

// --- MOTOR WHATSAPP CON CONFIRMACIÓN (REQUERIDO) ---
window.checkout = (e) => {
    if (e) e.preventDefault();
    if (state.cart.length === 0) return alert("Bolsa vacía");

    // Lógica de mayoría de productos por vendedor
    const sc = {}; 
    state.cart.forEach(i => sc[i.contactId] = (sc[i.contactId] || 0) + i.quantity);
    const max = Math.max(...Object.values(sc));
    const wins = Object.keys(sc).filter(sid => sc[sid] === max);
    const seller = state.contacts.find(c => c.id == wins[Math.floor(Math.random() * wins.length)]) || state.contacts[0] || { number: '59170783652', name: 'Admin' };

   // --- CONSTRUCCIÓN DE FACTURA CREATIVA ---
let total = 0;
let m = "✨ *EMMA STORE* ✨\n";
m += "━━━━━━━━━━━━━━━━━━━━━\n\n";

state.cart.forEach(i => {
    const subtotal = i.price * i.quantity;
    total += subtotal;
    // Formato con emojis para cada producto
    m += `🛍️ *${i.name.toUpperCase()}*\n`;
    m += `   └─ 🔢 Cant: ${i.quantity} | 💵 Sub: BS ${subtotal.toFixed(2)}\n\n`;
}); 

m += "━━━━━━━━━━━━━━━━━━━━━\n";
m += `💰 *TOTAL A PAGAR: BS ${total.toFixed(2)}*\n`;
m += "━━━━━━━━━━━━━━━━━━━━━\n\n";

    // CONFIRMACIÓN NATIVA
    if (confirm("¿Deseas confirmar tu pedido y enviar el resumen a WhatsApp?")) {
        const phone = seller.number.toString().replace(/\D/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(m)}`;
        window.location.href = url; // Redirección directa para evitar bloqueos
    }
};

window.askInfo = (id) => {
    const p = state.products.find(x => x.id === id);
    const v = state.contacts.find(x => x.id == p.contactId) || state.contacts[0] || { number: '59170783652' };
    const customMsg = p.whatsappCustomMsg || "Hola Emma Store!";
    const msg = `${customMsg}\n\nEstoy interesada en: ${p.name}\nPrecio: BS ${p.price}`;

    if (confirm("¿Deseas consultar sobre este producto por WhatsApp?")) {
        const phone = v.number.toString().replace(/\D/g, '');
        window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    }
};

// --- IMÁGENES Y SLIDERS ---
window.startCatalogHoverSlide = (el, imagesJson) => {
    const imgs = JSON.parse(decodeURIComponent(imagesJson));
    if (!imgs || imgs.length < 2) return;
    let cur = 0; 
    const imgEl = el.querySelector('.product-image');
    el._slideInt = setInterval(() => { 
        cur = (cur + 1) % imgs.length; 
        imgEl.style.opacity = '0.3'; 
        setTimeout(() => { imgEl.src = imgs[cur]; imgEl.style.opacity = '1'; }, 200); 
    }, 1800);
};

window.stopCatalogHoverSlide = (el, first) => { 
    clearInterval(el._slideInt); 
    const img = el.querySelector('.product-image'); 
    img.src = first; 
    img.style.opacity = '1'; 
};

// --- NAVEGACIÓN Y RENDER ---
window.navigate = (view, id = null) => {
    state.view = view;
    if (id) {
        state.selectedProduct = state.products.find(p => p.id == id);
        state.detailActiveImg = 0;
        startDetailAutoSlide();
    }
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function startDetailAutoSlide() {
    clearInterval(state.detailSlideInterval);
    state.detailSlideInterval = setInterval(() => {
        const p = state.selectedProduct;
        if (p && p.images && p.images.length > 1) {
            state.detailActiveImg = (state.detailActiveImg + 1) % p.images.length;
            const img = document.getElementById('detail-main-img');
            if (img) {
                img.style.opacity = '0';
                setTimeout(() => { img.src = p.images[state.detailActiveImg]; img.style.opacity = '1'; }, 300);
            }
        }
    }, 4000);
}

function render() {
    const main = document.getElementById('main-view');
    main.innerHTML = '';
    if (state.view === 'home') {
        renderStories(main);
        renderSubmenu(main);
        renderCatalog(main);
    } else if (state.view === 'detail') {
        renderDetail(main);
    }
}

function renderStories(container) {
    const div = document.createElement('div');
    div.className = "max-w-7xl mx-auto px-6 py-6 flex gap-6 overflow-x-auto no-scrollbar animate-fade";
    div.innerHTML = state.stories.map(s => `
        <div class="flex-shrink-0 text-center">
            <div class="w-16 h-16 rounded-full p-[2px] border-2 border-black">
                <img src="${s.imageUrl}" class="w-full h-full object-cover rounded-full grayscale hover:grayscale-0 transition-all">
            </div>
            <p class="text-[7px] font-black uppercase mt-2 opacity-40">Ver</p>
        </div>
    `).join('');
    if (state.stories.length > 0) container.appendChild(div);
}

function renderSubmenu(container) {
    const div = document.createElement('div');
    div.className = "max-w-7xl mx-auto px-6 mb-12 flex gap-4 overflow-x-auto no-scrollbar py-2";
    div.innerHTML = `<button onclick="filterCategory('todas')" class="px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest ${state.selectedCategory === 'todas' ? 'bg-black text-white' : 'bg-gray-100 opacity-40'}">Todas</button>` + 
    state.categories.map(c => `
        <button onclick="filterCategory(${c.id})" class="px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest ${state.selectedCategory == c.id ? 'bg-black text-white' : 'bg-gray-100 opacity-40'}">${c.name}</button>
    `).join('');
    container.appendChild(div);
}

window.filterCategory = (id) => { state.selectedCategory = id; render(); };

function renderCatalog(container) {
    const filtered = state.selectedCategory === 'todas' ? state.products : state.products.filter(p => p.categoryId == state.selectedCategory);
    const grid = document.createElement('div');
    grid.className = "max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 animate-fade";
    grid.innerHTML = filtered.map(p => `
        <div class="product-card group">
            <div class="aspect-[3/4] overflow-hidden bg-gray-50 rounded-[2.5rem] mb-6 relative cursor-pointer" 
                 onmouseenter="startCatalogHoverSlide(this, '${encodeURIComponent(JSON.stringify(p.images))}')" 
                 onmouseleave="stopCatalogHoverSlide(this, '${p.images[0]}')"
                 onclick="navigate('detail', ${p.id})">
                <img src="${p.images[0]}" class="product-image w-full h-full object-cover transition-opacity duration-300">
            </div>
            <div class="flex justify-between items-start px-2 mb-4">
                <div><h3 class="text-[10px] font-black uppercase">${p.name}</h3><p class="text-[8px] opacity-40">BOUTIQUE PRO</p></div>
                <span class="text-xs font-black">BS ${p.price}</span>
            </div>
            <button onclick="addToCart(${p.id})" class="w-full bg-black text-white py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-xl">Añadir a la bolsa</button>
        </div>`).join('');
    container.appendChild(grid);
}

function renderDetail(container) {
    const p = state.selectedProduct;
    container.innerHTML = `
    <div class="max-w-7xl mx-auto px-6 py-12 lg:flex gap-16 animate-fade">
        <div class="lg:w-1/2 mb-10 lg:mb-0 relative group">
            <div class="aspect-square bg-gray-50 rounded-[3.5rem] overflow-hidden relative shadow-inner">
                <img id="detail-main-img" src="${p.images[0]}" class="w-full h-full object-cover transition-opacity duration-500">
            </div>
        </div>
        <div class="lg:w-1/2">
            <p class="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mb-2">Emma Store Bolivia</p>
            <h1 class="text-5xl lg:text-7xl font-black uppercase tracking-tighter mb-4 text-black leading-none">${p.name}</h1>
            <p class="text-3xl font-black mb-8 text-black">BS ${p.price}</p>
            <p class="text-xs leading-relaxed opacity-60 font-medium mb-12">${p.description || 'Consulta disponibilidad de este artículo exclusivo.'}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <button onclick="addToCart(${p.id})" class="bg-black text-white py-7 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-gray-900 transition-all">Añadir a la bolsa</button>
                <button onclick="askInfo(${p.id})" class="bg-green-500 text-white py-7 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-green-600 transition-all">
                    <i class="fa-brands fa-whatsapp text-xl"></i> Consultar Stock
                </button>
            </div>
            <button onclick="navigate('home')" class="w-full py-6 border-2 border-black rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Volver al catálogo</button>
        </div>
    </div>`;
}

// Iniciar
window.onload = loadData;