// Configuración
const API_BASE = 'http://172.185.163.36:8081/api';
let currentTab = 'animales';
let animales = [];
let duenos = [];
let veterinarios = [];
let tratamientos = [];

// Utilidades
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.className = `fixed top-4 right-4 z-50 notification max-w-md p-4 rounded-lg shadow-lg text-white ${
        isError ? 'bg-red-500' : 'bg-green-500'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    notification.classList.remove('hidden');
    setTimeout(() => notification.classList.add('hidden'), 5000);
}

// Función mejorada para manejar errores de API
async function handleApiError(response, defaultMessage = 'Error en la operación') {
    let errorMessage = defaultMessage;
    
    try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            
            // Manejar errores de validación del backend
            if (errorData.errors) {
                const validationErrors = Object.entries(errorData.errors)
                    .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                    .join('\n');
                errorMessage = `Errores de validación:\n${validationErrors}`;
            } else if (errorData.message) {
                errorMessage = errorData.message;
            } else if (errorData.title) {
                errorMessage = errorData.title;
            }
        } else {
            // Si no es JSON, intentar leer como texto
            const text = await response.text();
            if (text) errorMessage = text.substring(0, 200);
        }
    } catch (parseError) {
        // Si falla el parsing, usar el mensaje por defecto
        console.error('Error parsing error response:', parseError);
    }
    
    return errorMessage;
}

// Función para hacer peticiones con mejor manejo de errores
async function apiRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorMessage = await handleApiError(response, `Error ${response.status}: ${response.statusText}`);
            throw new Error(errorMessage);
        }
        
        // Verificar que la respuesta sea JSON antes de parsear
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('La petición tardó demasiado. Por favor, verifica tu conexión.');
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo en '+API_BASE);
        } else {
            throw error;
        }
    }
}

// Función para mostrar/ocultar indicadores de carga
function setLoading(elementId, isLoading) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (isLoading) {
        const currentContent = element.innerHTML;
        element.dataset.originalContent = currentContent;
        element.innerHTML = `
            <div class="text-center py-8">
                <div class="loading mx-auto mb-2"></div>
                <p class="text-gray-500">Cargando...</p>
            </div>
        `;
    } else {
        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
            delete element.dataset.originalContent;
        }
    }
}

// Tabs Navigation
document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
    });
});

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-button').forEach(b => {
        b.classList.remove('active');
        b.classList.add('text-gray-700', 'hover:bg-gray-100');
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    
    const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
    activeBtn.classList.add('active');
    activeBtn.classList.remove('text-gray-700', 'hover:bg-gray-100');
    
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    
    if (tab === 'animales') loadAnimales();
    else if (tab === 'duenos') loadDuenos();
    else if (tab === 'veterinarios') loadVeterinarios();
    else if (tab === 'tratamientos') loadTratamientos();
    else if (tab === 'configuracion') {
        loadEspecies();
        loadRazas();
        loadMedicamentos();
        loadEspeciesForSelect();
    }
}

// ========== ANIMALES ==========
async function loadAnimales() {
    setLoading('animalesList', true);
    try {
        animales = await apiRequest(`${API_BASE}/Animales`);
        renderAnimales();
        loadDuenosForSelect();
        loadEspeciesForSelect();
    } catch (error) {
        showNotification(error.message, true);
        document.getElementById('animalesList').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p class="font-semibold">Error al cargar animales</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

function renderAnimales() {
    const list = document.getElementById('animalesList');
    if (animales.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-gray-500">No hay animales registrados</div>';
        return;
    }
    
    list.innerHTML = animales.map(a => `
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-indigo-100 hover:shadow-md transition-all">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-bold text-lg text-gray-800">
                        <i class="fas fa-dog text-indigo-600 mr-2"></i>${a.nombre}
                    </h3>
                    <p class="text-sm text-gray-600 mt-1">
                        <span class="font-semibold">Especie:</span> ${a.especie?.nombre || 'N/A'}
                        ${a.raza ? ` | <span class="font-semibold">Raza:</span> ${a.raza.nombre}` : ''}
                        ${a.dueno ? ` | <span class="font-semibold">Dueño:</span> ${a.dueno.nombre}` : ''}
                    </p>
                    ${a.peso ? `<p class="text-xs text-gray-500 mt-1"><i class="fas fa-weight mr-1"></i>${a.peso} kg</p>` : ''}
                </div>
                <div class="flex gap-2 ml-4">
                    <button onclick='viewHistoriaClinica(${a.id})' 
                            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm" 
                            title="Ver/Editar Historia Clínica">
                        <i class="fas fa-file-medical"></i>
                    </button>
                    <button onclick='editAnimal(${JSON.stringify(a).replace(/'/g, "&#39;")})' 
                            class="btn-warning text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick='deleteAnimal(${a.id})' 
                            class="btn-danger text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

document.getElementById('animalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('animalSubmitText');
    const originalText = submitText ? submitText.textContent : 'Guardar';
    
    // Deshabilitar botón y mostrar carga
    submitBtn.disabled = true;
    if (submitText) {
        submitText.innerHTML = '<div class="loading"></div> Guardando...';
    } else {
        submitBtn.innerHTML = '<div class="loading"></div> Guardando...';
    }
    
    try {
        const id = document.getElementById('animalId').value;
        const data = {
            nombre: document.getElementById('animalNombre').value.trim(),
            especieId: parseInt(document.getElementById('animalEspecieId').value),
            razaId: document.getElementById('animalRazaId').value ? parseInt(document.getElementById('animalRazaId').value) : null,
            fechaNacimiento: document.getElementById('animalFechaNac').value || null,
            color: document.getElementById('animalColor').value.trim() || null,
            peso: document.getElementById('animalPeso').value ? parseFloat(document.getElementById('animalPeso').value) : null,
            duenoId: document.getElementById('animalDuenoId').value || null,
            observacionesHistoria: document.getElementById('animalObservaciones').value.trim() || null
        };
        
        // Validación básica del lado del cliente
        if (!data.nombre || !data.especieId) {
            throw new Error('El nombre y la especie son requeridos');
        }
        
        await apiRequest(`${API_BASE}/Animales${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(data)
        });
        
        showNotification(`Animal ${id ? 'actualizado' : 'creado'} exitosamente`);
        resetAnimalForm();
        loadAnimales();
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        if (submitText) {
            submitText.textContent = originalText;
        } else {
            submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i>${originalText}`;
        }
    }
});

async function editAnimal(animal) {
    document.getElementById('animalId').value = animal.id;
    document.getElementById('animalNombre').value = animal.nombre;
    document.getElementById('animalEspecieId').value = animal.especieId || '';
    document.getElementById('animalFechaNac').value = animal.fechaNacimiento ? animal.fechaNacimiento.split('T')[0] : '';
    document.getElementById('animalColor').value = animal.color || '';
    document.getElementById('animalPeso').value = animal.peso || '';
    document.getElementById('animalDuenoId').value = animal.duenoId || '';
    
    // Cargar razas de la especie seleccionada
    if (animal.especieId) {
        loadRazasForAnimal(animal.especieId, animal.razaId);
    } else {
        document.getElementById('animalRazaId').innerHTML = '<option value="">Seleccione primero una especie</option>';
    }
    
    // Cargar observaciones de la historia clínica si existe
    try {
        const historia = await apiRequest(`${API_BASE}/HistoriasClinicas/animal/${animal.id}`, {
            method: 'GET'
        });
        document.getElementById('animalObservaciones').value = historia.observaciones || '';
    } catch (error) {
        // Si no existe historia clínica, dejar el campo vacío
        document.getElementById('animalObservaciones').value = '';
    }
    
    const formTitle = document.getElementById('animalFormTitle');
    const submitText = document.getElementById('animalSubmitText');
    const cancelBtn = document.getElementById('animalCancelBtn');
    
    if (formTitle) formTitle.textContent = `Editar Animal: ${animal.nombre}`;
    if (submitText) submitText.textContent = 'Actualizar';
    if (cancelBtn) cancelBtn.classList.remove('hidden');
    window.scrollTo(0, 0);
}

async function deleteAnimal(id) {
    if (!confirm('¿Eliminar este animal? Esta acción también eliminará su historia clínica.')) return;
    try {
        await apiRequest(`${API_BASE}/Animales/${id}`, { method: 'DELETE' });
        showNotification('Animal eliminado exitosamente');
        loadAnimales();
    } catch (error) {
        showNotification(error.message, true);
    }
}

// ========== HISTORIAS CLÍNICAS ==========
async function viewHistoriaClinica(animalId) {
    try {
        const animal = animales.find(a => a.id === animalId);
        const modal = document.getElementById('historiaClinicaModal');
        const infoDiv = document.getElementById('historiaClinicaInfo');
        
        document.getElementById('historiaClinicaModal').classList.remove('hidden');
        
        const loadingHtml = `
            <div class="bg-gray-50 p-4 rounded-lg mb-4">
                <div class="text-center py-4">
                    <div class="loading mx-auto mb-2"></div>
                    <p class="text-gray-500">Cargando historia clínica...</p>
                </div>
            </div>
        `;
        infoDiv.innerHTML = loadingHtml;
        
        const historia = await apiRequest(`${API_BASE}/HistoriasClinicas/animal/${animalId}`, {
            method: 'GET'
        });
        
        const nombreAnimal = animal ? animal.nombre : 'N/A';
        const fechaCreacion = historia.fechaCreacion 
            ? new Date(historia.fechaCreacion).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'No disponible';
        
        infoDiv.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-lg mb-4">
                <p class="text-sm text-gray-600 mb-2">
                    <span class="font-semibold">Animal:</span> 
                    <span id="historiaAnimalNombre" class="text-gray-800">${nombreAnimal}</span>
                </p>
                <p class="text-sm text-gray-600">
                    <span class="font-semibold">Fecha de Creación:</span> 
                    <span id="historiaFechaCreacion" class="text-gray-800">${fechaCreacion}</span>
                </p>
            </div>
        `;
        
        document.getElementById('historiaAnimalId').value = animalId;
        document.getElementById('historiaObservaciones').value = historia.observaciones || '';
        
    } catch (error) {
        if (error.message.includes('404') || error.message.includes('no encontrada')) {
            const animal = animales.find(a => a.id === animalId);
            const nombreAnimal = animal ? animal.nombre : 'N/A';
            const infoDiv = document.getElementById('historiaClinicaInfo');
            
            infoDiv.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <p class="text-sm text-gray-600 mb-2">
                        <span class="font-semibold">Animal:</span> 
                        <span id="historiaAnimalNombre" class="text-gray-800">${nombreAnimal}</span>
                    </p>
                    <p class="text-sm text-gray-600">
                        <span class="font-semibold">Fecha de Creación:</span> 
                        <span id="historiaFechaCreacion" class="text-gray-800">No disponible</span>
                    </p>
                </div>
            `;
            
            document.getElementById('historiaAnimalId').value = animalId;
            document.getElementById('historiaObservaciones').value = '';
        } else {
            showNotification(error.message, true);
            document.getElementById('historiaClinicaModal').classList.add('hidden');
        }
    }
}

function closeHistoriaClinicaModal() {
    document.getElementById('historiaClinicaModal').classList.add('hidden');
    document.getElementById('historiaClinicaForm').reset();
}

document.getElementById('historiaClinicaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('historiaSubmitText');
    const originalText = submitText ? submitText.textContent : 'Guardar Cambios';
    submitBtn.disabled = true;
    
    if (submitText) {
        submitText.innerHTML = '<div class="loading"></div> Guardando...';
    } else {
        submitBtn.innerHTML = '<div class="loading"></div> Guardando...';
    }
    
    try {
        const animalId = parseInt(document.getElementById('historiaAnimalId').value);
        const observaciones = document.getElementById('historiaObservaciones').value.trim();
        
        const data = {
            animalId: animalId,
            observaciones: observaciones || null
        };
        
        const historia = await apiRequest(`${API_BASE}/HistoriasClinicas/animal/${animalId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        const fechaCreacionElement = document.getElementById('historiaFechaCreacion');
        if (fechaCreacionElement) {
            const fechaCreacion = historia.fechaCreacion 
                ? new Date(historia.fechaCreacion).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                : 'No disponible';
            fechaCreacionElement.textContent = fechaCreacion;
        }
        
        showNotification('Historia clínica actualizada exitosamente');
        
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        submitBtn.disabled = false;
        if (submitText) {
            submitText.textContent = originalText;
        } else {
            submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i>${originalText}`;
        }
    }
});

function resetAnimalForm() {
    document.getElementById('animalForm').reset();
    document.getElementById('animalId').value = '';
    document.getElementById('animalRazaId').innerHTML = '<option value="">Seleccione primero una especie</option>';
    const formTitle = document.getElementById('animalFormTitle');
    const submitText = document.getElementById('animalSubmitText');
    const cancelBtn = document.getElementById('animalCancelBtn');
    
    if (formTitle) formTitle.textContent = 'Nuevo Animal';
    if (submitText) submitText.textContent = 'Guardar';
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

document.getElementById('animalCancelBtn').addEventListener('click', resetAnimalForm);

async function loadDuenosForSelect() {
    try {
        const duenos = await apiRequest(`${API_BASE}/Duenos`);
        const select = document.getElementById('animalDuenoId');
        if (select) {
            select.innerHTML = '<option value="">Sin dueño</option>' + 
                duenos.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading duenos for select:', error);
        // No mostrar notificación para errores silenciosos en selects
    }
}

async function loadEspeciesForSelect() {
    try {
        const especies = await apiRequest(`${API_BASE}/Especies`);
        const select = document.getElementById('animalEspecieId');
        const razaSelect = document.getElementById('razaEspecieId');
        
        if (select) {
            select.innerHTML = '<option value="">Seleccionar...</option>' + 
                especies.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
        }
        
        if (razaSelect) {
            razaSelect.innerHTML = '<option value="">Seleccionar...</option>' + 
                especies.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
        }
        
        // Agregar listener para cargar razas cuando cambie la especie
        if (select) {
            select.addEventListener('change', (e) => {
                const especieId = parseInt(e.target.value);
                if (especieId) {
                    loadRazasForAnimal(especieId);
                } else {
                    document.getElementById('animalRazaId').innerHTML = '<option value="">Seleccione primero una especie</option>';
                }
            });
        }
    } catch (error) {
        console.error('Error loading especies for select:', error);
    }
}

async function loadRazasForAnimal(especieId, razaIdSeleccionada = null) {
    try {
        const razas = await apiRequest(`${API_BASE}/Razas/por-especie/${especieId}`);
        const select = document.getElementById('animalRazaId');
        if (select) {
            select.innerHTML = '<option value="">Sin raza</option>' + 
                razas.map(r => `<option value="${r.id}" ${r.id === razaIdSeleccionada ? 'selected' : ''}>${r.nombre}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading razas for animal:', error);
        document.getElementById('animalRazaId').innerHTML = '<option value="">Error al cargar razas</option>';
    }
}

// ========== DUEÑOS ==========
async function loadDuenos() {
    setLoading('duenosList', true);
    try {
        duenos = await apiRequest(`${API_BASE}/Duenos`);
        renderDuenos();
    } catch (error) {
        showNotification(error.message, true);
        document.getElementById('duenosList').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p class="font-semibold">Error al cargar dueños</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

function renderDuenos() {
    const list = document.getElementById('duenosList');
    if (duenos.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-gray-500">No hay dueños registrados</div>';
        return;
    }
    
    list.innerHTML = duenos.map(d => `
        <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100 hover:shadow-md transition-all">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-lg text-gray-800">
                        <i class="fas fa-user text-green-600 mr-2"></i>${d.nombre}
                    </h3>
                    ${d.email ? `<p class="text-sm text-gray-600 mt-1"><i class="fas fa-envelope mr-1"></i>${d.email}</p>` : ''}
                    ${d.telefono ? `<p class="text-sm text-gray-600"><i class="fas fa-phone mr-1"></i>${d.telefono}</p>` : ''}
                </div>
                <div class="flex gap-2 ml-4">
                    <button onclick='editDueno(${JSON.stringify(d).replace(/'/g, "&#39;")})' 
                            class="btn-warning text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick='deleteDueno(${d.id})' 
                            class="btn-danger text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

document.getElementById('duenoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('duenoSubmitText');
    const originalText = submitText ? submitText.textContent : 'Guardar';
    submitBtn.disabled = true;
    
    if (submitText) {
        submitText.innerHTML = '<div class="loading"></div> Guardando...';
    } else {
        submitBtn.innerHTML = '<div class="loading"></div> Guardando...';
    }
    
    try {
        const id = document.getElementById('duenoId').value;
        const data = {
            nombre: document.getElementById('duenoNombre').value.trim(),
            direccion: document.getElementById('duenoDireccion').value.trim() || null,
            telefono: document.getElementById('duenoTelefono').value.trim() || null,
            email: document.getElementById('duenoEmail').value.trim() || null
        };
        
        if (!data.nombre) {
            throw new Error('El nombre es requerido');
        }
        
        // Validar email si se proporciona
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            throw new Error('El formato del email no es válido');
        }
        
        await apiRequest(`${API_BASE}/Duenos${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(data)
        });
        
        showNotification(`Dueño ${id ? 'actualizado' : 'creado'} exitosamente`);
        resetDuenoForm();
        loadDuenos();
        if (currentTab === 'animales') loadDuenosForSelect();
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        submitBtn.disabled = false;
        if (submitText) {
            submitText.textContent = originalText;
        } else {
            submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i>${originalText}`;
        }
    }
});

function editDueno(dueno) {
    document.getElementById('duenoId').value = dueno.id;
    document.getElementById('duenoNombre').value = dueno.nombre;
    document.getElementById('duenoDireccion').value = dueno.direccion || '';
    document.getElementById('duenoTelefono').value = dueno.telefono || '';
    document.getElementById('duenoEmail').value = dueno.email || '';
    
    const formTitle = document.getElementById('duenoFormTitle');
    const submitText = document.getElementById('duenoSubmitText');
    const cancelBtn = document.getElementById('duenoCancelBtn');
    
    if (formTitle) formTitle.textContent = `Editar Dueño: ${dueno.nombre}`;
    if (submitText) submitText.textContent = 'Actualizar';
    if (cancelBtn) cancelBtn.classList.remove('hidden');
}

async function deleteDueno(id) {
    if (!confirm('¿Eliminar este dueño? Los animales asociados quedarán sin dueño.')) return;
    try {
        await apiRequest(`${API_BASE}/Duenos/${id}`, { method: 'DELETE' });
        showNotification('Dueño eliminado exitosamente');
        loadDuenos();
        if (currentTab === 'animales') loadDuenosForSelect();
    } catch (error) {
        showNotification(error.message, true);
    }
}

function resetDuenoForm() {
    document.getElementById('duenoForm').reset();
    document.getElementById('duenoId').value = '';
    
    const formTitle = document.getElementById('duenoFormTitle');
    const submitText = document.getElementById('duenoSubmitText');
    const cancelBtn = document.getElementById('duenoCancelBtn');
    
    if (formTitle) formTitle.textContent = 'Nuevo Dueño';
    if (submitText) submitText.textContent = 'Guardar';
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

document.getElementById('duenoCancelBtn').addEventListener('click', resetDuenoForm);

// ========== VETERINARIOS ==========
async function loadVeterinarios() {
    setLoading('veterinariosList', true);
    try {
        veterinarios = await apiRequest(`${API_BASE}/Veterinarios`);
        renderVeterinarios();
    } catch (error) {
        showNotification(error.message, true);
        document.getElementById('veterinariosList').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p class="font-semibold">Error al cargar veterinarios</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

function renderVeterinarios() {
    const list = document.getElementById('veterinariosList');
    if (veterinarios.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-gray-500">No hay veterinarios registrados</div>';
        return;
    }
    
    list.innerHTML = veterinarios.map(v => `
        <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100 hover:shadow-md transition-all">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-lg text-gray-800">
                        <i class="fas fa-user-md text-purple-600 mr-2"></i>${v.nombre}
                    </h3>
                    <p class="text-sm text-gray-600 mt-1">
                        <span class="font-semibold">Licencia:</span> ${v.numeroLicencia}
                        ${v.especialidad ? ` | <span class="font-semibold">Especialidad:</span> ${v.especialidad}` : ''}
                    </p>
                    ${v.telefono ? `<p class="text-sm text-gray-600"><i class="fas fa-phone mr-1"></i>${v.telefono}</p>` : ''}
                </div>
                <div class="flex gap-2 ml-4">
                    <button onclick='editVeterinario(${JSON.stringify(v).replace(/'/g, "&#39;")})' 
                            class="btn-warning text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick='deleteVeterinario(${v.id})' 
                            class="btn-danger text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

document.getElementById('veterinarioForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('veterinarioSubmitText');
    const originalText = submitText ? submitText.textContent : 'Guardar';
    submitBtn.disabled = true;
    
    if (submitText) {
        submitText.innerHTML = '<div class="loading"></div> Guardando...';
    } else {
        submitBtn.innerHTML = '<div class="loading"></div> Guardando...';
    }
    
    try {
        const id = document.getElementById('veterinarioId').value;
        const data = {
            nombre: document.getElementById('veterinarioNombre').value.trim(),
            direccion: document.getElementById('veterinarioDireccion').value.trim() || null,
            telefono: document.getElementById('veterinarioTelefono').value.trim() || null,
            numeroLicencia: document.getElementById('veterinarioLicencia').value.trim(),
            especialidad: document.getElementById('veterinarioEspecialidad').value.trim() || null
        };
        
        if (!data.nombre || !data.numeroLicencia) {
            throw new Error('El nombre y el número de licencia son requeridos');
        }
        
        await apiRequest(`${API_BASE}/Veterinarios${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(data)
        });
        
        showNotification(`Veterinario ${id ? 'actualizado' : 'creado'} exitosamente`);
        resetVeterinarioForm();
        loadVeterinarios();
        if (currentTab === 'tratamientos') loadDataForTratamientos();
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        submitBtn.disabled = false;
        if (submitText) {
            submitText.textContent = originalText;
        } else {
            submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i>${originalText}`;
        }
    }
});

function editVeterinario(veterinario) {
    document.getElementById('veterinarioId').value = veterinario.id;
    document.getElementById('veterinarioNombre').value = veterinario.nombre;
    document.getElementById('veterinarioDireccion').value = veterinario.direccion || '';
    document.getElementById('veterinarioTelefono').value = veterinario.telefono || '';
    document.getElementById('veterinarioLicencia').value = veterinario.numeroLicencia;
    document.getElementById('veterinarioEspecialidad').value = veterinario.especialidad || '';
    
    const formTitle = document.getElementById('veterinarioFormTitle');
    const submitText = document.getElementById('veterinarioSubmitText');
    const cancelBtn = document.getElementById('veterinarioCancelBtn');
    
    if (formTitle) formTitle.textContent = `Editar Veterinario: ${veterinario.nombre}`;
    if (submitText) submitText.textContent = 'Actualizar';
    if (cancelBtn) cancelBtn.classList.remove('hidden');
}

async function deleteVeterinario(id) {
    if (!confirm('¿Eliminar este veterinario? Esto también eliminará todos sus tratamientos asociados.')) return;
    try {
        await apiRequest(`${API_BASE}/Veterinarios/${id}`, { method: 'DELETE' });
        showNotification('Veterinario eliminado exitosamente');
        loadVeterinarios();
        if (currentTab === 'tratamientos') loadDataForTratamientos();
    } catch (error) {
        showNotification(error.message, true);
    }
}

function resetVeterinarioForm() {
    document.getElementById('veterinarioForm').reset();
    document.getElementById('veterinarioId').value = '';
    
    const formTitle = document.getElementById('veterinarioFormTitle');
    const submitText = document.getElementById('veterinarioSubmitText');
    const cancelBtn = document.getElementById('veterinarioCancelBtn');
    
    if (formTitle) formTitle.textContent = 'Nuevo Veterinario';
    if (submitText) submitText.textContent = 'Guardar';
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

document.getElementById('veterinarioCancelBtn').addEventListener('click', resetVeterinarioForm);

// ========== TRATAMIENTOS ==========
async function loadTratamientos() {
    setLoading('tratamientosList', true);
    try {
        tratamientos = await apiRequest(`${API_BASE}/Tratamientos`);
        renderTratamientos();
        loadDataForTratamientos();
    } catch (error) {
        showNotification(error.message, true);
        document.getElementById('tratamientosList').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p class="font-semibold">Error al cargar tratamientos</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

async function loadDataForTratamientos() {
    try {
        const [animales, veterinarios, medicamentos] = await Promise.all([
            apiRequest(`${API_BASE}/Animales`).catch(() => []),
            apiRequest(`${API_BASE}/Veterinarios`).catch(() => []),
            apiRequest(`${API_BASE}/Medicamentos`).catch(() => [])
        ]);
        
        const animalSelect = document.getElementById('tratamientoAnimalId');
        if (animalSelect) {
            animalSelect.innerHTML = '<option value="">Seleccionar...</option>' + 
                animales.map(a => `<option value="${a.id}">${a.nombre} (${a.especie?.nombre || 'N/A'})</option>`).join('');
        }
        
        const veterinarioSelect = document.getElementById('tratamientoVeterinarioId');
        if (veterinarioSelect) {
            veterinarioSelect.innerHTML = '<option value="">Seleccionar...</option>' + 
                veterinarios.map(v => `<option value="${v.id}">${v.nombre} - ${v.numeroLicencia}</option>`).join('');
        }
        
        const medicamentoSelect = document.getElementById('tratamientoMedicamentoId');
        if (medicamentoSelect) {
            medicamentoSelect.innerHTML = '<option value="">Sin medicamento</option>' + 
                medicamentos.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading data for tratamientos:', error);
        // No mostrar notificación para errores silenciosos en selects
    }
}

function renderTratamientos() {
    const list = document.getElementById('tratamientosList');
    if (tratamientos.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-gray-500">No hay tratamientos registrados</div>';
        return;
    }
    
    list.innerHTML = tratamientos.map(t => `
        <div class="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-100 hover:shadow-md transition-all">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-bold text-lg text-gray-800">
                        <i class="fas fa-pills text-orange-600 mr-2"></i>Tratamiento #${t.id}
                    </h3>
                    <p class="text-sm text-gray-600 mt-1">
                        <span class="font-semibold">Animal:</span> ${t.animal?.nombre || 'N/A'} 
                        | <span class="font-semibold">Veterinario:</span> ${t.veterinario?.nombre || 'N/A'}
                    </p>
                    <p class="text-sm text-gray-700 mt-2">${t.descripcion}</p>
                    ${t.medicamento ? `<p class="text-xs text-gray-600 mt-1"><i class="fas fa-capsules mr-1"></i>${t.medicamento.nombre}</p>` : ''}
                    <p class="text-xs text-gray-500 mt-1">
                        <i class="fas fa-calendar mr-1"></i>${new Date(t.fechaTratamiento).toLocaleDateString('es-ES')}
                    </p>
                </div>
                <div class="flex gap-2 ml-4">
                    <button onclick='editTratamiento(${JSON.stringify(t).replace(/'/g, "&#39;")})' 
                            class="btn-warning text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick='deleteTratamiento(${t.id})' 
                            class="btn-danger text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

document.getElementById('tratamientoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('tratamientoSubmitText');
    const originalText = submitText ? submitText.textContent : 'Guardar';
    submitBtn.disabled = true;
    
    if (submitText) {
        submitText.innerHTML = '<div class="loading"></div> Guardando...';
    } else {
        submitBtn.innerHTML = '<div class="loading"></div> Guardando...';
    }
    
    try {
        const id = document.getElementById('tratamientoId').value;
        const animalId = parseInt(document.getElementById('tratamientoAnimalId').value);
        const veterinarioId = parseInt(document.getElementById('tratamientoVeterinarioId').value);
        const descripcion = document.getElementById('tratamientoDescripcion').value.trim();
        
        // Validación del lado del cliente
        if (!animalId || !veterinarioId) {
            throw new Error('Debe seleccionar un animal y un veterinario');
        }
        if (!descripcion) {
            throw new Error('La descripción es requerida');
        }
        
        const data = {
            animalId: animalId,
            veterinarioId: veterinarioId,
            descripcion: descripcion,
            medicamentoId: document.getElementById('tratamientoMedicamentoId').value ? parseInt(document.getElementById('tratamientoMedicamentoId').value) : null,
            dosis: document.getElementById('tratamientoDosis').value.trim() || null,
            diagnostico: document.getElementById('tratamientoDiagnostico').value.trim() || null,
            proximaCita: document.getElementById('tratamientoProximaCita').value || null
        };
        
        await apiRequest(`${API_BASE}/Tratamientos${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(data)
        });
        
        showNotification(`Tratamiento ${id ? 'actualizado' : 'creado'} exitosamente`);
        resetTratamientoForm();
        loadTratamientos();
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        submitBtn.disabled = false;
        if (submitText) {
            submitText.textContent = originalText;
        } else {
            submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i>${originalText}`;
        }
    }
});

function editTratamiento(tratamiento) {
    document.getElementById('tratamientoId').value = tratamiento.id;
    document.getElementById('tratamientoAnimalId').value = tratamiento.animalId;
    document.getElementById('tratamientoVeterinarioId').value = tratamiento.veterinarioId;
    document.getElementById('tratamientoDescripcion').value = tratamiento.descripcion;
    document.getElementById('tratamientoMedicamentoId').value = tratamiento.medicamentoId || '';
    document.getElementById('tratamientoDosis').value = tratamiento.dosis || '';
    document.getElementById('tratamientoDiagnostico').value = tratamiento.diagnostico || '';
    if (tratamiento.proximaCita) {
        const date = new Date(tratamiento.proximaCita);
        document.getElementById('tratamientoProximaCita').value = date.toISOString().slice(0, 16);
    }
    
    const formTitle = document.getElementById('tratamientoFormTitle');
    const submitText = document.getElementById('tratamientoSubmitText');
    const cancelBtn = document.getElementById('tratamientoCancelBtn');
    
    if (formTitle) formTitle.textContent = `Editar Tratamiento #${tratamiento.id}`;
    if (submitText) submitText.textContent = 'Actualizar';
    if (cancelBtn) cancelBtn.classList.remove('hidden');
}

async function deleteTratamiento(id) {
    if (!confirm('¿Eliminar este tratamiento? Esta acción no se puede deshacer.')) return;
    try {
        await apiRequest(`${API_BASE}/Tratamientos/${id}`, { method: 'DELETE' });
        showNotification('Tratamiento eliminado exitosamente');
        loadTratamientos();
    } catch (error) {
        showNotification(error.message, true);
    }
}

function resetTratamientoForm() {
    document.getElementById('tratamientoForm').reset();
    document.getElementById('tratamientoId').value = '';
    
    const formTitle = document.getElementById('tratamientoFormTitle');
    const submitText = document.getElementById('tratamientoSubmitText');
    const cancelBtn = document.getElementById('tratamientoCancelBtn');
    
    if (formTitle) formTitle.textContent = 'Nuevo Tratamiento';
    if (submitText) submitText.textContent = 'Guardar';
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

document.getElementById('tratamientoCancelBtn').addEventListener('click', resetTratamientoForm);

// ========== CONFIGURACIÓN: ESPECIES ==========
let especies = [];

async function loadEspecies() {
    try {
        especies = await apiRequest(`${API_BASE}/Especies`);
        renderEspecies();
    } catch (error) {
        showNotification(error.message, true);
        document.getElementById('especiesList').innerHTML = '<div class="text-center py-4 text-red-500 text-sm">Error al cargar</div>';
    }
}

function renderEspecies() {
    const list = document.getElementById('especiesList');
    if (especies.length === 0) {
        list.innerHTML = '<div class="text-center py-4 text-gray-500 text-sm">No hay especies</div>';
        return;
    }
    list.innerHTML = especies.map(e => `
        <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
            <div>
                <p class="font-semibold text-sm">${e.nombre}</p>
                ${e.descripcion ? `<p class="text-xs text-gray-600 mt-1">${e.descripcion}</p>` : ''}
            </div>
            <div class="flex gap-2">
                <button onclick='editEspecie(${JSON.stringify(e).replace(/'/g, "&#39;")})' class="btn-warning text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick='deleteEspecie(${e.id})' class="btn-danger text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

document.getElementById('especieForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('especieSubmitText');
    const originalText = submitText ? submitText.textContent : 'Guardar';
    submitBtn.disabled = true;
    if (submitText) submitText.innerHTML = '<div class="loading"></div> Guardando...';
    
    try {
        const id = document.getElementById('especieId').value;
        const data = {
            nombre: document.getElementById('especieNombre').value.trim(),
            descripcion: document.getElementById('especieDescripcion').value.trim() || null
        };
        if (!data.nombre) throw new Error('El nombre es requerido');
        
        await apiRequest(`${API_BASE}/Especies${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(data)
        });
        
        showNotification(`Especie ${id ? 'actualizada' : 'creada'} exitosamente`);
        resetEspecieForm();
        loadEspecies();
        loadEspeciesForSelect();
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        submitBtn.disabled = false;
        if (submitText) submitText.textContent = originalText;
    }
});

function editEspecie(especie) {
    document.getElementById('especieId').value = especie.id;
    document.getElementById('especieNombre').value = especie.nombre;
    document.getElementById('especieDescripcion').value = especie.descripcion || '';
    document.getElementById('especieSubmitText').textContent = 'Actualizar';
    document.getElementById('especieCancelBtn').classList.remove('hidden');
}

async function deleteEspecie(id) {
    if (!confirm('¿Eliminar esta especie? No se puede eliminar si tiene animales asociados.')) return;
    try {
        await apiRequest(`${API_BASE}/Especies/${id}`, { method: 'DELETE' });
        showNotification('Especie eliminada exitosamente');
        loadEspecies();
        loadEspeciesForSelect();
    } catch (error) {
        showNotification(error.message, true);
    }
}

function resetEspecieForm() {
    document.getElementById('especieForm').reset();
    document.getElementById('especieId').value = '';
    document.getElementById('especieSubmitText').textContent = 'Guardar';
    document.getElementById('especieCancelBtn').classList.add('hidden');
}

document.getElementById('especieCancelBtn').addEventListener('click', resetEspecieForm);

// ========== CONFIGURACIÓN: RAZAS ==========
let razas = [];

async function loadRazas() {
    try {
        razas = await apiRequest(`${API_BASE}/Razas`);
        renderRazas();
    } catch (error) {
        showNotification(error.message, true);
        document.getElementById('razasList').innerHTML = '<div class="text-center py-4 text-red-500 text-sm">Error al cargar</div>';
    }
}

function renderRazas() {
    const list = document.getElementById('razasList');
    if (razas.length === 0) {
        list.innerHTML = '<div class="text-center py-4 text-gray-500 text-sm">No hay razas</div>';
        return;
    }
    list.innerHTML = razas.map(r => `
        <div class="bg-green-50 p-3 rounded-lg border border-green-100 flex justify-between items-center">
            <div>
                <p class="font-semibold text-sm">${r.nombre}</p>
                <p class="text-xs text-gray-600 mt-1">Especie: ${r.especie?.nombre || 'N/A'}</p>
                ${r.descripcion ? `<p class="text-xs text-gray-600 mt-1">${r.descripcion}</p>` : ''}
            </div>
            <div class="flex gap-2">
                <button onclick='editRaza(${JSON.stringify(r).replace(/'/g, "&#39;")})' class="btn-warning text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick='deleteRaza(${r.id})' class="btn-danger text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

document.getElementById('razaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('razaSubmitText');
    const originalText = submitText ? submitText.textContent : 'Guardar';
    submitBtn.disabled = true;
    if (submitText) submitText.innerHTML = '<div class="loading"></div> Guardando...';
    
    try {
        const id = document.getElementById('razaId').value;
        const data = {
            especieId: parseInt(document.getElementById('razaEspecieId').value),
            nombre: document.getElementById('razaNombre').value.trim(),
            descripcion: document.getElementById('razaDescripcion').value.trim() || null
        };
        if (!data.nombre || !data.especieId) throw new Error('El nombre y la especie son requeridos');
        
        await apiRequest(`${API_BASE}/Razas${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(data)
        });
        
        showNotification(`Raza ${id ? 'actualizada' : 'creada'} exitosamente`);
        resetRazaForm();
        loadRazas();
        if (currentTab === 'animales') {
            const especieId = document.getElementById('animalEspecieId').value;
            if (especieId) loadRazasForAnimal(parseInt(especieId));
        }
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        submitBtn.disabled = false;
        if (submitText) submitText.textContent = originalText;
    }
});

function editRaza(raza) {
    document.getElementById('razaId').value = raza.id;
    document.getElementById('razaEspecieId').value = raza.especieId;
    document.getElementById('razaNombre').value = raza.nombre;
    document.getElementById('razaDescripcion').value = raza.descripcion || '';
    document.getElementById('razaSubmitText').textContent = 'Actualizar';
    document.getElementById('razaCancelBtn').classList.remove('hidden');
}

async function deleteRaza(id) {
    if (!confirm('¿Eliminar esta raza?')) return;
    try {
        await apiRequest(`${API_BASE}/Razas/${id}`, { method: 'DELETE' });
        showNotification('Raza eliminada exitosamente');
        loadRazas();
        if (currentTab === 'animales') {
            const especieId = document.getElementById('animalEspecieId').value;
            if (especieId) loadRazasForAnimal(parseInt(especieId));
        }
    } catch (error) {
        showNotification(error.message, true);
    }
}

function resetRazaForm() {
    document.getElementById('razaForm').reset();
    document.getElementById('razaId').value = '';
    document.getElementById('razaSubmitText').textContent = 'Guardar';
    document.getElementById('razaCancelBtn').classList.add('hidden');
}

document.getElementById('razaCancelBtn').addEventListener('click', resetRazaForm);

// ========== CONFIGURACIÓN: MEDICAMENTOS ==========
let medicamentos = [];

async function loadMedicamentos() {
    try {
        medicamentos = await apiRequest(`${API_BASE}/Medicamentos`);
        renderMedicamentos();
    } catch (error) {
        showNotification(error.message, true);
        document.getElementById('medicamentosList').innerHTML = '<div class="text-center py-4 text-red-500 text-sm">Error al cargar</div>';
    }
}

function renderMedicamentos() {
    const list = document.getElementById('medicamentosList');
    if (medicamentos.length === 0) {
        list.innerHTML = '<div class="text-center py-4 text-gray-500 text-sm">No hay medicamentos</div>';
        return;
    }
    list.innerHTML = medicamentos.map(m => `
        <div class="bg-purple-50 p-3 rounded-lg border border-purple-100 flex justify-between items-center">
            <div>
                <p class="font-semibold text-sm">${m.nombre}</p>
                ${m.principioActivo ? `<p class="text-xs text-gray-600 mt-1">Principio: ${m.principioActivo}</p>` : ''}
                ${m.presentacion ? `<p class="text-xs text-gray-600">Presentación: ${m.presentacion}</p>` : ''}
            </div>
            <div class="flex gap-2">
                <button onclick='editMedicamento(${JSON.stringify(m).replace(/'/g, "&#39;")})' class="btn-warning text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick='deleteMedicamento(${m.id})' class="btn-danger text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

document.getElementById('medicamentoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('medicamentoSubmitText');
    const originalText = submitText ? submitText.textContent : 'Guardar';
    submitBtn.disabled = true;
    if (submitText) submitText.innerHTML = '<div class="loading"></div> Guardando...';
    
    try {
        const id = document.getElementById('medicamentoId').value;
        const data = {
            nombre: document.getElementById('medicamentoNombre').value.trim(),
            principioActivo: document.getElementById('medicamentoPrincipioActivo').value.trim() || null,
            presentacion: document.getElementById('medicamentoPresentacion').value.trim() || null,
            descripcion: document.getElementById('medicamentoDescripcion').value.trim() || null
        };
        if (!data.nombre) throw new Error('El nombre es requerido');
        
        await apiRequest(`${API_BASE}/Medicamentos${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(data)
        });
        
        showNotification(`Medicamento ${id ? 'actualizado' : 'creado'} exitosamente`);
        resetMedicamentoForm();
        loadMedicamentos();
        if (currentTab === 'tratamientos') loadDataForTratamientos();
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        submitBtn.disabled = false;
        if (submitText) submitText.textContent = originalText;
    }
});

function editMedicamento(medicamento) {
    document.getElementById('medicamentoId').value = medicamento.id;
    document.getElementById('medicamentoNombre').value = medicamento.nombre;
    document.getElementById('medicamentoPrincipioActivo').value = medicamento.principioActivo || '';
    document.getElementById('medicamentoPresentacion').value = medicamento.presentacion || '';
    document.getElementById('medicamentoDescripcion').value = medicamento.descripcion || '';
    document.getElementById('medicamentoSubmitText').textContent = 'Actualizar';
    document.getElementById('medicamentoCancelBtn').classList.remove('hidden');
}

async function deleteMedicamento(id) {
    if (!confirm('¿Eliminar este medicamento?')) return;
    try {
        await apiRequest(`${API_BASE}/Medicamentos/${id}`, { method: 'DELETE' });
        showNotification('Medicamento eliminado exitosamente');
        loadMedicamentos();
        if (currentTab === 'tratamientos') loadDataForTratamientos();
    } catch (error) {
        showNotification(error.message, true);
    }
}

function resetMedicamentoForm() {
    document.getElementById('medicamentoForm').reset();
    document.getElementById('medicamentoId').value = '';
    document.getElementById('medicamentoSubmitText').textContent = 'Guardar';
    document.getElementById('medicamentoCancelBtn').classList.add('hidden');
}

document.getElementById('medicamentoCancelBtn').addEventListener('click', resetMedicamentoForm);

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadAnimales();
});

