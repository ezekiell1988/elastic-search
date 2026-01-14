// API Base URL
const API_BASE = '/api';

// Global state
let selectedIndex = null;
let currentIndexData = {
    data: [],
    total: 0,
    currentPage: 1,
    pageSize: 100,
    fields: [],
    searchParams: {}
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadIndices();
});

// Loading functions
function showLoading(show = true, text = 'Procesando...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    loadingText.textContent = text;
    overlay.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    alert(`❌ Error: ${message}`);
}

function showSuccess(message) {
    alert(`✅ Éxito: ${message}`);
}

// Load indices from Elasticsearch
async function loadIndices() {
    try {
        showLoading(true, 'Cargando índices...');
        
        const response = await fetch(`${API_BASE}/indices`);
        if (!response.ok) {
            throw new Error('Error cargando índices');
        }
        
        const indices = await response.json();
        displayIndices(indices);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
        displayIndicesError();
    } finally {
        showLoading(false);
    }
}

// Display indices in grid
function displayIndices(indices) {
    const container = document.getElementById('indicesContainer');
    
    if (!indices || indices.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 40px;">
                <h3>📋 No hay índices disponibles</h3>
                <p>Crea tu primer índice para comenzar</p>
            </div>
        `;
        return;
    }

    const html = `
        <div class="indices-grid">
            ${indices.map(index => `
                <div class="index-card ${selectedIndex === index.name ? 'selected' : ''}" 
                     data-index="${index.name}">
                    <div class="index-header">
                        <h3 class="index-name">${index.name}</h3>
                        <div class="index-actions">
                            <button onclick="viewIndexData('${index.name}')" 
                                    class="action-btn-view" title="Ver datos">
                                👁️
                            </button>
                            <button onclick="showDeleteModal('${index.name}')" 
                                    class="action-btn-delete" title="Eliminar">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="index-info">
                        <div class="index-stat">
                            <span class="index-stat-value">${index.docsCount.toLocaleString()}</span>
                            <span class="index-stat-label">Docs</span>
                        </div>
                        <div class="index-stat">
                            <span class="index-stat-value">${index.storeSize}</span>
                            <span class="index-stat-label">Tamaño</span>
                        </div>
                        <div class="index-stat">
                            <span class="index-stat-value ${index.health === 'green' ? 'status-healthy' : 
                                index.health === 'yellow' ? 'status-warning' : 'status-error'}">${index.health}</span>
                            <span class="index-stat-label">Estado</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Display error when loading indices fails
function displayIndicesError() {
    const container = document.getElementById('indicesContainer');
    container.innerHTML = `
        <div class="text-center" style="padding: 40px;">
            <h3>⚠️ Error cargando índices</h3>
            <p>No se pudieron cargar los índices de Elasticsearch</p>
            <button onclick="loadIndices()" class="btn btn-primary">Reintentar</button>
        </div>
    `;
}

// Refresh indices
async function refreshIndices() {
    await loadIndices();
    
    // If there was an index selected, refresh its data too
    if (selectedIndex) {
        await loadIndexData(selectedIndex, false);
    }
}

// View index data
async function viewIndexData(indexName) {
    selectedIndex = indexName;
    
    // Update UI to show selection
    document.querySelectorAll('.index-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-index="${indexName}"]`).classList.add('selected');
    
    // Load index data
    await loadIndexData(indexName, true);
}

// Load data from specific index
async function loadIndexData(indexName, resetPage = true) {
    try {
        showLoading(true, `Cargando datos de ${indexName}...`);
        
        if (resetPage) {
            currentIndexData.currentPage = 1;
            currentIndexData.searchParams = {};
        }

        // Build search parameters
        const params = {
            from: (currentIndexData.currentPage - 1) * currentIndexData.pageSize,
            size: currentIndexData.pageSize,
            ...currentIndexData.searchParams
        };

        const response = await fetch(`${API_BASE}/indices/${indexName}/data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error('Error cargando datos del índice');
        }

        const data = await response.json();
        
        currentIndexData.data = data.hits || [];
        currentIndexData.total = data.total || 0;
        currentIndexData.fields = data.fields || [];

        displayIndexData(indexName, data);
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Display index data in table
function displayIndexData(indexName, data) {
    const section = document.getElementById('indexDataSection');
    const title = document.getElementById('selectedIndexTitle');
    const tableHead = document.getElementById('dataTableHead');
    const tableBody = document.getElementById('dataTableBody');
    const resultsCount = document.getElementById('dataResultsCount');
    const resultsTime = document.getElementById('dataResultsTime');

    // Update title
    title.textContent = `📋 Datos de: ${indexName}`;

    // Setup filters
    setupFilters(currentIndexData.fields);

    // Update results info
    const startResult = (currentIndexData.currentPage - 1) * currentIndexData.pageSize + 1;
    const endResult = Math.min(currentIndexData.currentPage * currentIndexData.pageSize, currentIndexData.total);
    resultsCount.textContent = `${startResult}-${endResult} de ${currentIndexData.total.toLocaleString()} registros`;
    resultsTime.textContent = data.took ? `(${data.took}ms)` : '';

    // Setup table headers
    if (currentIndexData.fields.length > 0) {
        tableHead.innerHTML = `
            <tr>
                ${currentIndexData.fields.map(field => `<th>${field}</th>`).join('')}
            </tr>
        `;
    }

    // Setup table body
    if (currentIndexData.data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${currentIndexData.fields.length}" class="text-center">
                    No se encontraron datos
                </td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = currentIndexData.data.map(item => `
            <tr>
                ${currentIndexData.fields.map(field => {
                    let value = getNestedValue(item._source, field);
                    if (value === null || value === undefined) value = '-';
                    if (typeof value === 'object') value = JSON.stringify(value);
                    if (typeof value === 'string' && value.length > 50) {
                        value = value.substring(0, 50) + '...';
                    }
                    return `<td title="${String(getNestedValue(item._source, field) || '-')}">${value}</td>`;
                }).join('')}
            </tr>
        `).join('');
    }

    // Update pagination
    updatePagination();

    // Show section
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });
}

// Setup filter dropdowns
function setupFilters(fields) {
    const searchField = document.getElementById('searchField');
    const sortField = document.getElementById('sortField');

    // Setup search field options
    searchField.innerHTML = '<option value="">Seleccionar campo...</option>' +
        fields.map(field => `<option value="${field}">${field}</option>`).join('');

    // Setup sort field options
    sortField.innerHTML = '<option value="">Sin ordenar</option>' +
        fields.map(field => `<option value="${field}">${field}</option>`).join('');
}

// Get nested value from object using dot notation
function getNestedValue(obj, path) {
    return path.split('.').reduce((curr, prop) => curr && curr[prop], obj);
}

// Apply filters
function applyFilters() {
    const searchField = document.getElementById('searchField').value;
    const searchValue = document.getElementById('searchValue').value;
    const sortField = document.getElementById('sortField').value;
    const sortOrder = document.getElementById('sortOrder').value;

    currentIndexData.searchParams = {};

    if (searchField && searchValue) {
        currentIndexData.searchParams.searchField = searchField;
        currentIndexData.searchParams.searchValue = searchValue;
    }

    if (sortField) {
        currentIndexData.searchParams.sortField = sortField;
        currentIndexData.searchParams.sortOrder = sortOrder;
    }

    loadIndexData(selectedIndex, true);
}

// Clear filters
function clearFilters() {
    document.getElementById('searchField').value = '';
    document.getElementById('searchValue').value = '';
    document.getElementById('sortField').value = '';
    document.getElementById('sortOrder').value = 'asc';
    
    currentIndexData.searchParams = {};
    loadIndexData(selectedIndex, true);
}

// Pagination functions
function updatePagination() {
    const totalPages = Math.ceil(currentIndexData.total / currentIndexData.pageSize);
    const pageText = `Página ${currentIndexData.currentPage} de ${totalPages}`;
    
    // Update page info
    document.getElementById('pageInfoTop').textContent = pageText;
    document.getElementById('pageInfoBottom').textContent = pageText;
    
    // Update buttons
    const isFirstPage = currentIndexData.currentPage === 1;
    const isLastPage = currentIndexData.currentPage >= totalPages;
    
    document.getElementById('prevBtnTop').disabled = isFirstPage;
    document.getElementById('prevBtnBottom').disabled = isFirstPage;
    document.getElementById('nextBtnTop').disabled = isLastPage;
    document.getElementById('nextBtnBottom').disabled = isLastPage;
    
    // Update page size selectors
    document.getElementById('pageSizeTop').value = currentIndexData.pageSize;
    document.getElementById('pageSizeBottom').value = currentIndexData.pageSize;
}

function previousPage() {
    if (currentIndexData.currentPage > 1) {
        currentIndexData.currentPage--;
        loadIndexData(selectedIndex, false);
    }
}

function nextPage() {
    const totalPages = Math.ceil(currentIndexData.total / currentIndexData.pageSize);
    if (currentIndexData.currentPage < totalPages) {
        currentIndexData.currentPage++;
        loadIndexData(selectedIndex, false);
    }
}

function changePageSize(newSize) {
    currentIndexData.pageSize = parseInt(newSize);
    currentIndexData.currentPage = 1;
    
    // Update both selectors
    document.getElementById('pageSizeTop').value = newSize;
    document.getElementById('pageSizeBottom').value = newSize;
    
    loadIndexData(selectedIndex, false);
}

// Close index data view
function closeIndexData() {
    document.getElementById('indexDataSection').style.display = 'none';
    selectedIndex = null;
    
    // Remove selection from cards
    document.querySelectorAll('.index-card').forEach(card => {
        card.classList.remove('selected');
    });
}

// Export index data
async function exportIndexData() {
    if (!selectedIndex) return;
    
    try {
        showLoading(true, 'Exportando datos...');
        
        const response = await fetch(`${API_BASE}/indices/${selectedIndex}/export`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentIndexData.searchParams)
        });
        
        if (!response.ok) {
            throw new Error('Error exportando datos');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedIndex}-export.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Datos exportados correctamente');
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Modal functions for creating index
function showCreateIndexModal() {
    document.getElementById('createIndexModal').style.display = 'flex';
}

function closeCreateIndexModal() {
    document.getElementById('createIndexModal').style.display = 'none';
    document.getElementById('createIndexForm').reset();
}

// Create new index
async function createIndex() {
    const indexName = document.getElementById('indexName').value.trim();
    const indexSettings = document.getElementById('indexSettings').value.trim();
    
    if (!indexName) {
        showError('El nombre del índice es obligatorio');
        return;
    }
    
    // Validate index name
    if (!/^[a-z0-9_-]+$/.test(indexName)) {
        showError('El nombre del índice solo puede contener minúsculas, números, guiones y guiones bajos');
        return;
    }
    
    try {
        showLoading(true, 'Creando índice...');
        
        let settings = {};
        if (indexSettings) {
            try {
                settings = JSON.parse(indexSettings);
            } catch (e) {
                throw new Error('La configuración JSON no es válida');
            }
        }
        
        const response = await fetch(`${API_BASE}/indices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: indexName,
                settings: settings
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error creando índice');
        }
        
        showSuccess(`Índice "${indexName}" creado correctamente`);
        closeCreateIndexModal();
        await loadIndices();
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Modal functions for deleting index
let indexToDelete = null;

function showDeleteModal(indexName) {
    indexToDelete = indexName;
    document.getElementById('deleteIndexName').textContent = indexName;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    indexToDelete = null;
}

// Confirm delete index
async function confirmDeleteIndex() {
    if (!indexToDelete) return;
    
    try {
        showLoading(true, 'Eliminando índice...');
        
        const response = await fetch(`${API_BASE}/indices/${indexToDelete}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error eliminando índice');
        }
        
        showSuccess(`Índice "${indexToDelete}" eliminado correctamente`);
        closeDeleteModal();
        
        // If the deleted index was selected, close its data view
        if (selectedIndex === indexToDelete) {
            closeIndexData();
        }
        
        await loadIndices();
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const createModal = document.getElementById('createIndexModal');
    const deleteModal = document.getElementById('deleteModal');
    
    if (event.target === createModal) {
        closeCreateIndexModal();
    }
    if (event.target === deleteModal) {
        closeDeleteModal();
    }
}